import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://api.rawjournal.pro")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# Encryption
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")  # 32-byte hex

# MT5 terminal paths (inside container)
MT5_TERMINAL_PATH = "/opt/mt5/worker_{worker_id}/drive_c/Program Files/MetaTrader 5/terminal64.exe"

# Demo account for market data worker (#4)
DEMO_MT5_LOGIN = os.getenv("DEMO_MT5_LOGIN", "")
DEMO_MT5_PASSWORD = os.getenv("DEMO_MT5_PASSWORD", "")
DEMO_MT5_SERVER = os.getenv("DEMO_MT5_SERVER", "")

# Sync intervals (seconds)
SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL", "15"))
FULL_CHECK_INTERVAL = int(os.getenv("FULL_CHECK_INTERVAL", "60"))
CANDLE_UPDATE_INTERVAL = int(os.getenv("CANDLE_UPDATE_INTERVAL", "30"))
GRACE_PERIOD = int(os.getenv("GRACE_PERIOD", "300"))
TERMINAL_RESTART_HOURS = int(os.getenv("TERMINAL_RESTART_HOURS", "5"))

# Candle timeframes
CANDLE_TIMEFRAMES = ["M30", "H1", "H4", "D1", "W1"]
CANDLE_HISTORY_MONTHS = 6
