import httpx
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

_client = httpx.AsyncClient(base_url=f"{SUPABASE_URL}/rest/v1", headers=_headers, timeout=30.0)


async def fetch(table: str, params: dict | None = None) -> list[dict]:
    """GET rows from a table."""
    resp = await _client.get(f"/{table}", params=params or {})
    resp.raise_for_status()
    return resp.json()


async def insert(table: str, data: dict | list[dict]) -> list[dict]:
    """INSERT row(s)."""
    resp = await _client.post(f"/{table}", json=data)
    resp.raise_for_status()
    return resp.json()


async def upsert(table: str, data: dict | list[dict], on_conflict: str = "") -> list[dict]:
    """UPSERT row(s) with ON CONFLICT merge."""
    headers = {**_headers, "Prefer": "return=representation,resolution=merge-duplicates"}
    params = {}
    if on_conflict:
        params["on_conflict"] = on_conflict
    resp = await _client.post(f"/{table}", json=data, headers=headers, params=params)
    resp.raise_for_status()
    return resp.json()


async def update(table: str, match: dict, data: dict) -> list[dict]:
    """UPDATE rows matching filters."""
    params = {f"{k}": f"eq.{v}" for k, v in match.items()}
    resp = await _client.patch(f"/{table}", params=params, json=data)
    resp.raise_for_status()
    return resp.json()


async def delete(table: str, match: dict) -> None:
    """DELETE rows matching filters."""
    params = {f"{k}": f"eq.{v}" for k, v in match.items()}
    resp = await _client.delete(f"/{table}", params=params)
    resp.raise_for_status()


async def rpc(function_name: str, params: dict | None = None) -> dict:
    """Call a Postgres function via PostgREST RPC."""
    resp = await _client.post(f"/rpc/{function_name}", json=params or {})
    resp.raise_for_status()
    return resp.json()
