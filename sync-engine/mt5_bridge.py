"""
MT5 Bridge — Cross-platform MetaTrader5 connection adapter.

On Windows: uses MetaTrader5 package directly.
On Linux (Docker): uses mt5linux to connect to rpyc server running under Wine.
"""
import os
import logging

logger = logging.getLogger(__name__)

# MT5 Timeframe constants (hardcoded to avoid remote lookup before connection)
TIMEFRAME_M1 = 1
TIMEFRAME_M5 = 5
TIMEFRAME_M15 = 15
TIMEFRAME_M30 = 30
TIMEFRAME_H1 = 16385
TIMEFRAME_H2 = 16386
TIMEFRAME_H4 = 16388
TIMEFRAME_D1 = 16408
TIMEFRAME_W1 = 32769
TIMEFRAME_MN1 = 49153

# Deal entry constants
DEAL_ENTRY_IN = 0
DEAL_ENTRY_OUT = 1

# Order type constants
ORDER_TYPE_BUY = 0
ORDER_TYPE_SELL = 1

if os.name == "nt":
    # Windows — direct MetaTrader5 package
    import MetaTrader5 as mt5
    logger.info("Using direct MetaTrader5 connection (Windows)")
else:
    # Linux — mt5linux bridge via rpyc to Wine Python
    from mt5linux import MetaTrader5
    _host = os.getenv("MT5_RPYC_HOST", "localhost")
    _port = int(os.getenv("MT5_RPYC_PORT", "18812"))
    mt5 = MetaTrader5(host=_host, port=_port)
    logger.info(f"Using mt5linux bridge to rpyc server at {_host}:{_port}")
