from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal


class AccountInfo(BaseModel):
    id: str
    user_id: str
    broker: str
    mt5_server: str
    mt5_login: str
    mt5_investor_password_encrypted: str
    sync_enabled: bool = True
    last_sync_at: datetime | None = None
    sync_fail_count: int = 0


class SyncJob(BaseModel):
    user_id: str
    account_id: str
    mt5_server: str
    mt5_login: str
    password_encrypted: str
    job_type: str = "lightweight"  # lightweight | full | catchup


class TradeRecord(BaseModel):
    ticket_number: str
    symbol: str
    direction: str
    entry_timestamp: datetime
    exit_timestamp: datetime | None = None
    entry_price: Decimal
    exit_price: Decimal | None = None
    position_size: Decimal
    pnl: Decimal | None = None
    pnl_pips: Decimal | None = None
    commission: Decimal = Decimal("0")
    swap: Decimal = Decimal("0")
    stop_loss: Decimal | None = None
    take_profit: Decimal | None = None
    status: str = "open"
    import_source: str = "mt5"
    session_tag: str | None = None


class OpenPosition(BaseModel):
    ticket_number: str
    symbol: str
    direction: str
    entry_timestamp: datetime
    entry_price: Decimal
    current_price: Decimal | None = None
    position_size: Decimal
    floating_pnl: Decimal | None = None
    stop_loss: Decimal | None = None
    take_profit: Decimal | None = None
    swap: Decimal = Decimal("0")


class CandleData(BaseModel):
    symbol: str
    timeframe: str
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal = Decimal("0")
