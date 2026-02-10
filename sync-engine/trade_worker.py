"""
RawJournal Trade Worker — Syncs MT5 trades for active users.

Each worker owns one MT5 terminal (via Wine). It pulls jobs from the
Redis sync queue, logs into the user's account, fetches trades/positions,
and writes results to Supabase.
"""
import argparse
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta

import redis.asyncio as aioredis
import MetaTrader5 as mt5

import config
import database as db
from encryption import decrypt
from models import TradeRecord, OpenPosition
from utils import get_session_tag, is_market_open

logging.basicConfig(level=logging.INFO, format="%(asctime)s [worker-%(worker_id)s] %(message)s")

parser = argparse.ArgumentParser()
parser.add_argument("--worker-id", type=int, required=True)
args = parser.parse_args()

worker_id = args.worker_id
logger = logging.getLogger(f"worker-{worker_id}")


async def main():
    redis_pool = aioredis.from_url(config.REDIS_URL, decode_responses=True)
    terminal_path = config.MT5_TERMINAL_PATH.format(worker_id=worker_id)

    logger.info(f"Initializing MT5 terminal at {terminal_path}")
    if not mt5.initialize(path=terminal_path):
        logger.error(f"MT5 init failed: {mt5.last_error()}")
        return

    cycles = 0
    start_time = time.time()
    current_server = None

    while True:
        # Report health
        uptime = (time.time() - start_time) / 3600
        await redis_pool.hset(f"worker:{worker_id}:health", mapping={
            "status": "running",
            "terminal_alive": str(mt5.terminal_info() is not None),
            "current_server": current_server or "idle",
            "cycles": str(cycles),
            "uptime_hours": f"{uptime:.1f}",
        })

        # Terminal restart every N hours
        if uptime > config.TERMINAL_RESTART_HOURS:
            logger.info("Restarting terminal (memory leak prevention)")
            mt5.shutdown()
            await asyncio.sleep(2)
            mt5.initialize(path=terminal_path)
            start_time = time.time()
            current_server = None

        # Weekend mode: sleep longer
        if not is_market_open():
            await asyncio.sleep(60)
            continue

        # Pop next job from queue
        jobs = await redis_pool.zrangebyscore("sync_queue", "-inf", str(time.time()), start=0, num=1)
        if not jobs:
            await asyncio.sleep(1)
            continue

        member = jobs[0]
        await redis_pool.zrem("sync_queue", member)
        job_json = await redis_pool.hget("sync_jobs", member)
        if not job_json:
            continue

        job = json.loads(job_json)
        user_id = job["user_id"]
        account_id = job["account_id"]

        try:
            # Decrypt password
            password = decrypt(job["password_encrypted"])
            login = int(job["mt5_login"])
            server = job["mt5_server"]

            # Login to MT5 account
            ok = mt5.login(login, password=password, server=server, timeout=10000)
            if not ok:
                err = mt5.last_error()
                logger.warning(f"Login failed for {login}@{server}: {err}")
                await _handle_login_failure(account_id, str(err))
                continue

            current_server = server

            # Determine sync type
            job_type = job.get("job_type", "lightweight")
            full_check = job_type in ("full", "catchup") or (cycles % 4 == 0)

            # Always: sync open positions + account balance
            await _sync_positions(user_id, account_id)
            await _sync_balance(account_id)

            # Full check: fetch closed trades
            if full_check:
                last_sync = job.get("last_sync_at")
                await _sync_closed_trades(user_id, account_id, last_sync, is_catchup=job_type == "catchup")

            # Update last sync
            await db.update("accounts", {"id": account_id}, {
                "last_sync_at": datetime.utcnow().isoformat(),
                "last_sync_status": "success",
                "sync_fail_count": 0,
            })

            # Re-queue for next cycle
            score = time.time() + config.SYNC_INTERVAL
            await redis_pool.zadd("sync_queue", {member: score})

            cycles += 1

        except Exception as e:
            logger.error(f"Sync error for account {account_id}: {e}")
            await db.update("accounts", {"id": account_id}, {
                "last_sync_status": "error",
                "last_sync_error": str(e)[:500],
            })
            # Re-queue with delay
            score = time.time() + config.SYNC_INTERVAL * 2
            await redis_pool.zadd("sync_queue", {member: score})


async def _sync_positions(user_id: str, account_id: str):
    """Fetch and upsert open positions."""
    positions = mt5.positions_get()
    if positions is None:
        positions = []

    # Delete old positions for this account, then insert current
    await db.delete("open_positions", {"account_id": account_id})

    if not positions:
        return

    rows = []
    for p in positions:
        rows.append({
            "user_id": user_id,
            "account_id": account_id,
            "ticket_number": str(p.ticket),
            "symbol": p.symbol,
            "direction": "buy" if p.type == 0 else "sell",
            "entry_timestamp": datetime.utcfromtimestamp(p.time).isoformat(),
            "entry_price": float(p.price_open),
            "current_price": float(p.price_current),
            "position_size": float(p.volume),
            "floating_pnl": float(p.profit),
            "stop_loss": float(p.sl) if p.sl else None,
            "take_profit": float(p.tp) if p.tp else None,
            "swap": float(p.swap),
            "synced_at": datetime.utcnow().isoformat(),
        })

    if rows:
        await db.insert("open_positions", rows)

    # Update hot symbols
    symbols = list({p.symbol for p in positions})
    for sym in symbols:
        await db.upsert("hot_symbols", {"symbol": sym, "last_active": datetime.utcnow().isoformat()}, on_conflict="symbol")


async def _sync_balance(account_id: str):
    """Update account balance and equity."""
    info = mt5.account_info()
    if info:
        await db.update("accounts", {"id": account_id}, {
            "current_balance": float(info.balance),
            "current_equity": float(info.equity),
        })


async def _sync_closed_trades(user_id: str, account_id: str, last_sync: str | None, is_catchup: bool):
    """Fetch closed trades since last sync."""
    if last_sync and not is_catchup:
        from_date = datetime.fromisoformat(last_sync)
    else:
        # First sync or catch-up: get all history
        from_date = datetime(2020, 1, 1)

    to_date = datetime.utcnow()
    deals = mt5.history_deals_get(from_date, to_date)
    if not deals:
        return

    # Filter to trade entries/exits (types 0=buy, 1=sell)
    trade_deals = [d for d in deals if d.entry in (0, 1) and d.type in (0, 1)]

    rows = []
    for d in trade_deals:
        entry_time = datetime.utcfromtimestamp(d.time)
        rows.append({
            "user_id": user_id,
            "account_id": account_id,
            "ticket_number": str(d.position_id),
            "symbol": d.symbol,
            "direction": "buy" if d.type == 0 else "sell",
            "entry_timestamp": entry_time.isoformat(),
            "exit_timestamp": datetime.utcfromtimestamp(d.time).isoformat() if d.entry == 1 else None,
            "entry_price": float(d.price),
            "exit_price": float(d.price) if d.entry == 1 else None,
            "position_size": float(d.volume),
            "pnl": float(d.profit) if d.entry == 1 else None,
            "commission": float(d.commission),
            "swap": float(d.swap),
            "status": "closed" if d.entry == 1 else "open",
            "import_source": "mt5",
            "session_tag": get_session_tag(entry_time),
        })

    if rows:
        await db.upsert("trades", rows, on_conflict="account_id,ticket_number")


async def _handle_login_failure(account_id: str, error: str):
    """Track login failures, disable sync after 3 consecutive failures."""
    accounts = await db.fetch("accounts", {"id": f"eq.{account_id}"})
    if accounts:
        fail_count = accounts[0].get("sync_fail_count", 0) + 1
        update_data = {
            "last_sync_status": "error",
            "last_sync_error": error,
            "sync_fail_count": fail_count,
        }
        if fail_count >= 3:
            update_data["sync_enabled"] = False
        await db.update("accounts", {"id": account_id}, update_data)


if __name__ == "__main__":
    asyncio.run(main())
