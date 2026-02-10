"""
RawJournal Sync Scheduler — FastAPI + WebSocket coordinator.

Manages active user sessions, sync queue in Redis, and dispatches
jobs to MT5 trade workers.
"""
import asyncio
import json
import time
import logging
from datetime import datetime

import jwt
import redis.asyncio as aioredis
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

import config
import database as db
from utils import is_market_open

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("scheduler")

app = FastAPI(title="RawJournal Sync Scheduler")

# --- State ---
active_sessions: dict[str, dict] = {}   # user_id -> {connected_at, ws, accounts}
grace_timers: dict[str, float] = {}      # user_id -> disconnect timestamp
redis_pool: aioredis.Redis | None = None


# --- Lifecycle ---
@app.on_event("startup")
async def startup():
    global redis_pool
    redis_pool = aioredis.from_url(config.REDIS_URL, decode_responses=True)
    logger.info("Scheduler started, connected to Redis")
    asyncio.create_task(grace_check_loop())
    asyncio.create_task(queue_builder_loop())


@app.on_event("shutdown")
async def shutdown():
    if redis_pool:
        await redis_pool.close()


# --- Health ---
@app.get("/health")
async def health():
    return {"status": "ok", "active_users": len(active_sessions), "market_open": is_market_open()}


# --- Admin ---
@app.get("/admin/status")
async def admin_status(key: str = Query(...)):
    if key != config.SUPABASE_SERVICE_KEY:
        raise HTTPException(403, "Forbidden")
    queue_size = await redis_pool.zcard("sync_queue")
    workers = {}
    for i in range(1, 5):
        w = await redis_pool.hgetall(f"worker:{i}:health")
        workers[f"worker_{i}"] = w or {"status": "unknown"}
    return {
        "active_users": len(active_sessions),
        "grace_users": len(grace_timers),
        "queue_size": queue_size,
        "market_open": is_market_open(),
        "workers": workers,
    }


# --- WebSocket ---
@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(...)):
    # Verify JWT
    user_id = _verify_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await websocket.accept()
    logger.info(f"User {user_id} connected")

    # Remove from grace if reconnecting
    grace_timers.pop(user_id, None)

    # Fetch user's accounts
    accounts = await db.fetch("accounts", {"user_id": f"eq.{user_id}", "sync_enabled": "eq.true"})

    active_sessions[user_id] = {
        "connected_at": time.time(),
        "ws": websocket,
        "accounts": accounts,
    }

    # Queue immediate catch-up sync for all accounts
    for acc in accounts:
        await _queue_sync(user_id, acc, job_type="catchup")

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "heartbeat":
                active_sessions[user_id]["last_heartbeat"] = time.time()
            elif msg.get("type") == "chart_subscribe":
                # Track which symbols user has charts open for
                symbol = msg.get("symbol")
                if symbol:
                    await redis_pool.sadd("chart_subscribers", f"{user_id}:{symbol}")
            elif msg.get("type") == "chart_unsubscribe":
                symbol = msg.get("symbol")
                if symbol:
                    await redis_pool.srem("chart_subscribers", f"{user_id}:{symbol}")
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected, starting grace period")
        active_sessions.pop(user_id, None)
        grace_timers[user_id] = time.time()


# --- Background loops ---
async def grace_check_loop():
    """Remove users whose grace period has expired."""
    while True:
        await asyncio.sleep(30)
        now = time.time()
        expired = [uid for uid, ts in grace_timers.items() if now - ts > config.GRACE_PERIOD]
        for uid in expired:
            grace_timers.pop(uid, None)
            # Remove all their jobs from queue
            accounts = await db.fetch("accounts", {"user_id": f"eq.{uid}", "sync_enabled": "eq.true"})
            for acc in accounts:
                await redis_pool.zrem("sync_queue", f"{uid}:{acc['id']}")
            logger.info(f"User {uid} grace expired, stopped syncing")


async def queue_builder_loop():
    """Re-queue active users' accounts on their sync interval."""
    while True:
        interval = config.SYNC_INTERVAL if is_market_open() else 1800  # 30min weekend
        await asyncio.sleep(interval)

        all_user_ids = list(active_sessions.keys()) + list(grace_timers.keys())
        for uid in all_user_ids:
            session = active_sessions.get(uid)
            accounts = session["accounts"] if session else []
            if not accounts:
                accounts = await db.fetch("accounts", {"user_id": f"eq.{uid}", "sync_enabled": "eq.true"})
            for acc in accounts:
                await _queue_sync(uid, acc)


# --- Helpers ---
async def _queue_sync(user_id: str, account: dict, job_type: str = "lightweight"):
    """Add a sync job to the Redis sorted set queue."""
    member = f"{user_id}:{account['id']}"
    score = time.time()
    job_data = json.dumps({
        "user_id": user_id,
        "account_id": account["id"],
        "mt5_server": account["mt5_server"],
        "mt5_login": account["mt5_login"],
        "password_encrypted": account["mt5_investor_password_encrypted"],
        "job_type": job_type,
        "last_sync_at": account.get("last_sync_at"),
    })
    await redis_pool.zadd("sync_queue", {member: score})
    await redis_pool.hset("sync_jobs", member, job_data)


def _verify_token(token: str) -> str | None:
    """Decode Supabase JWT and return user_id."""
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub")
    except Exception:
        return None


# --- Push to connected clients ---
async def push_to_user(user_id: str, message: dict):
    """Send a WebSocket message to a connected user."""
    session = active_sessions.get(user_id)
    if session and session.get("ws"):
        try:
            await session["ws"].send_json(message)
        except Exception:
            pass  # User may have just disconnected
