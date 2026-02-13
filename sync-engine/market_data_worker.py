"""
RawJournal Market Data Worker — Pulls candle data from MT5 demo account.

Worker #4: stays logged into a free demo account permanently.
Fetches candle data for "hot symbols" (symbols with active user positions)
and caches them in PostgreSQL + Redis.
"""
import asyncio
import json
import logging
import os
import time
from datetime import datetime, timedelta

import redis.asyncio as aioredis

import config
from mt5_bridge import mt5, TIMEFRAME_M30, TIMEFRAME_H1, TIMEFRAME_H4, TIMEFRAME_D1, TIMEFRAME_W1
import database as db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [market-data] %(message)s")
logger = logging.getLogger("market-data")

# MT5 timeframe mapping (constants from mt5_bridge, no remote lookup needed)
TF_MAP = {
    "M30": TIMEFRAME_M30,
    "H1": TIMEFRAME_H1,
    "H4": TIMEFRAME_H4,
    "D1": TIMEFRAME_D1,
    "W1": TIMEFRAME_W1,
}


async def main():
    redis_pool = aioredis.from_url(config.REDIS_URL, decode_responses=True)
    worker_id = int(os.getenv("WORKER_ID", "4"))
    terminal_path = config.MT5_TERMINAL_PATH.format(worker_id=worker_id)

    logger.info(f"Initializing MT5 terminal at {terminal_path}")
    if not mt5.initialize(path=terminal_path):
        logger.error(f"MT5 init failed: {mt5.last_error()}")
        return

    # Login to demo account (stays logged in)
    ok = mt5.login(
        int(config.DEMO_MT5_LOGIN),
        password=config.DEMO_MT5_PASSWORD,
        server=config.DEMO_MT5_SERVER,
        timeout=10000,
    )
    if not ok:
        logger.error(f"Demo login failed: {mt5.last_error()}")
        return

    logger.info("Logged into demo account for market data")
    start_time = time.time()

    while True:
        # Health report
        uptime = (time.time() - start_time) / 3600
        await redis_pool.hset("worker:4:health", mapping={
            "status": "running",
            "terminal_alive": str(mt5.terminal_info() is not None),
            "current_server": config.DEMO_MT5_SERVER,
            "uptime_hours": f"{uptime:.1f}",
        })

        # Terminal restart
        if uptime > config.TERMINAL_RESTART_HOURS:
            logger.info("Restarting terminal")
            mt5.shutdown()
            await asyncio.sleep(2)
            mt5.initialize(path=terminal_path)
            mt5.login(int(config.DEMO_MT5_LOGIN), password=config.DEMO_MT5_PASSWORD, server=config.DEMO_MT5_SERVER)
            start_time = time.time()

        # Get hot symbols
        hot_symbols = await db.fetch("hot_symbols", {"select": "symbol"})
        symbols = [s["symbol"] for s in hot_symbols]

        if not symbols:
            await asyncio.sleep(config.CANDLE_UPDATE_INTERVAL)
            continue

        for symbol in symbols:
            for tf_name in config.CANDLE_TIMEFRAMES:
                tf = TF_MAP.get(tf_name)
                if tf is None:
                    continue

                try:
                    # Check last cached candle
                    cached = await db.fetch("candle_cache", {
                        "symbol": f"eq.{symbol}",
                        "timeframe": f"eq.{tf_name}",
                        "select": "timestamp",
                        "order": "timestamp.desc",
                        "limit": "1",
                    })

                    if cached:
                        from_date = datetime.fromisoformat(cached[0]["timestamp"].replace("Z", ""))
                    else:
                        from_date = datetime.utcnow() - timedelta(days=config.CANDLE_HISTORY_MONTHS * 30)

                    rates = mt5.copy_rates_range(symbol, tf, from_date, datetime.utcnow())
                    if rates is None or len(rates) == 0:
                        continue

                    # Build rows
                    rows = []
                    for r in rates:
                        rows.append({
                            "symbol": symbol,
                            "timeframe": tf_name,
                            "timestamp": datetime.utcfromtimestamp(r["time"]).isoformat(),
                            "open": float(r["open"]),
                            "high": float(r["high"]),
                            "low": float(r["low"]),
                            "close": float(r["close"]),
                            "volume": float(r["tick_volume"]),
                        })

                    if rows:
                        # Batch upsert (chunks of 500)
                        for i in range(0, len(rows), 500):
                            await db.upsert("candle_cache", rows[i:i+500], on_conflict="symbol,timeframe,timestamp")

                        # Cache latest candle in Redis for instant access
                        latest = rows[-1]
                        await redis_pool.hset(f"candle:{symbol}:{tf_name}", mapping={
                            "o": str(latest["open"]),
                            "h": str(latest["high"]),
                            "l": str(latest["low"]),
                            "c": str(latest["close"]),
                            "t": latest["timestamp"],
                        })

                except Exception as e:
                    logger.error(f"Error fetching {symbol} {tf_name}: {e}")

        # Clean up cold symbols (inactive > 7 days)
        cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()
        await db.delete("hot_symbols", {"last_active": f"lt.{cutoff}"})

        await asyncio.sleep(config.CANDLE_UPDATE_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
