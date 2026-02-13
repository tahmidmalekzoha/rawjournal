# RawJournal — Project Structure

## Folders

**`/docker`** — Docker images and compose configuration for MT5 workers  
- `Dockerfile.mt5-base` — Base image (Ubuntu + Wine + Python + MT5 support)  
- `Dockerfile.worker` — Trade/market data worker image (extends base)  
- `Dockerfile.scheduler` — WebSocket sync scheduler  
- `docker-compose.yml` — Orchestrates 4 workers + scheduler + Redis  
- `scripts/start-worker.sh` — Container entrypoint for Wine + MT5 initialization

**`/sync-engine`** — Python MT5 sync workers  
- `scheduler.py` — FastAPI WebSocket server, manages active users + sync queue  
- `trade_worker.py` — Syncs trades from MT5 accounts (workers 1-3)  
- `market_data_worker.py` — Pulls candle data from demo account (worker 4)  
- `config.py`, `database.py`, `encryption.py` — Core utilities

**`/supabase`** — Database schema  
- `migrations/001_initial_schema.sql` — All tables, RLS policies, triggers, storage bucket

**`/web`** — Next.js 14 frontend  
- `src/app/` — Pages (landing, login, dashboard)  
- `src/components/` — React components (sidebar)  
- `src/lib/supabase/` — Supabase client utilities

## Deployment

**Full step-by-step guide:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

**Quick overview:**
1. **Supabase** (Coolify one-click service) → `api.rawjournal.pro`
2. **Next.js** (Coolify Git resource, `web/` path) → `rawjournal.pro`
3. **MT5 Workers** (Docker Compose or Coolify resource) → `ws.rawjournal.pro`

Environment variables: Copy `.env.example` and fill in real values.
