from datetime import datetime


def get_session_tag(entry_time: datetime) -> str:
    """Tag a trade by forex session based on UTC hour."""
    hour = entry_time.hour
    if 0 <= hour < 8:
        return "asian"
    elif 8 <= hour < 13:
        return "london"
    elif 13 <= hour < 16:
        return "overlap"
    elif 16 <= hour < 22:
        return "newyork"
    return "late-ny"


def is_market_open() -> bool:
    """Check if forex market is open (Sun 22:00 UTC → Fri 22:00 UTC)."""
    now = datetime.utcnow()
    weekday = now.weekday()  # Mon=0, Sun=6
    hour = now.hour
    if weekday == 4 and hour >= 22:
        return False
    if weekday == 5:
        return False
    if weekday == 6 and hour < 22:
        return False
    return True
