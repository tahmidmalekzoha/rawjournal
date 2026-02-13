"""
rpyc server — runs under Wine Python to bridge MetaTrader5 to native Linux Python.

This script is executed by Wine: wine64 python.exe rpyc_server.py
The mt5linux package on the native side connects to this server via rpyc.
"""
import sys
import os

# Verify MetaTrader5 is importable
try:
    import MetaTrader5
    print(f"MetaTrader5 module version: {MetaTrader5.__version__}")
except ImportError as e:
    print(f"FATAL: Cannot import MetaTrader5: {e}")
    print("Ensure MetaTrader5 is installed in Wine Python:")
    print("  wine64 python.exe -m pip install MetaTrader5")
    sys.exit(1)

from rpyc.utils.server import ThreadedServer
from rpyc.core.service import SlaveService

port = int(os.environ.get("RPYC_PORT", "18812"))

config = {
    "allow_public_attrs": True,
    "allow_all_attrs": True,
    "allow_pickle": True,
    "sync_request_timeout": 60,
}

print(f"Starting rpyc server on port {port}...")
server = ThreadedServer(
    SlaveService,
    hostname="0.0.0.0",
    port=port,
    protocol_config=config,
)
server.start()
