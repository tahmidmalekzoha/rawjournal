# RawJournal — Implementation Plan

> **Domain:** rawjournal.pro
> **Stack:** Next.js 14 + Self-hosted Supabase + Python MT5 Workers
> **Host:** Hostinger KVM2 (2 vCPU, 8GB RAM, 100GB NVMe, Ubuntu 22.04)
> **Created:** February 8, 2026
> **Updated:** February 10, 2026

---

## Implementation Status

- ✅ **Phase 1** — Infrastructure (Docker + Coolify setup)
- ✅ **Phase 2** — Core Backend (SQL schema, RLS, triggers)
- ✅ **Phase 3** — MT5 Sync Engine (Python workers complete)
- ✅ **Phase 4** — Frontend Foundation (Next.js scaffold with auth + dashboard)
- ⬜ **Phase 5** — Trade Management (manual entry, CSV import, filtering)
- ⬜ **Phase 6** — Analytics & Charts (metrics calculations, TradingView charts)
- ⬜ **Phase 7** — Journaling System (trade notes, tags, screenshots)
- ⬜ **Phase 8** — Payments & Subscriptions (Stripe integration)
- ⬜ **Phase 9** — Polish & Optimization (UI refinements, performance)
- ⬜ **Phase 10** — Testing & Launch (E2E tests, production deployment)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Rules & Constraints](#rules--constraints)
3. [Phase 1 — Infrastructure](#phase-1--infrastructure) ✅
4. [Phase 2 — Core Backend](#phase-2--core-backend) ✅
5. [Phase 3 — MT5 Sync Engine](#phase-3--mt5-sync-engine) ✅
6. [Phase 4 — Frontend Foundation](#phase-4--frontend-foundation) ✅
7. [Phase 5 — Trade Management](#phase-5--trade-management)
8. [Phase 6 — Analytics & Charts](#phase-6--analytics--charts)
9. [Phase 7 — Journaling System](#phase-7--journaling-system)
10. [Phase 8 — Payments & Subscriptions](#phase-8--payments--subscriptions)
11. [Phase 9 — Polish & Optimization](#phase-9--polish--optimization)
12. [Phase 10 — Testing & Launch](#phase-10--testing--launch)
13. [Verification Checklist](#verification-checklist)
14. [Cost Summary](#cost-summary)

---

## Architecture Overview

```
┌─────────────────────── KVM2 VPS (Ubuntu 22.04) ───────────────────────┐
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy + SSL via Let's Encrypt)                │    │
│  │  rawjournal.pro → Next.js (:3000)                             │    │
│  │  api.rawjournal.pro → Supabase (:8000)                        │    │
│  │  ws.rawjournal.pro → Sync Scheduler WebSocket (:8080)         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────┐  ┌─────────────────────────────────────────────┐    │
│  │  Next.js 14  │  │  Supabase (Docker)                         │    │
│  │  (PM2)       │  │  ├─ PostgreSQL (port 5432)                  │    │
│  │  Port 3000   │  │  ├─ GoTrue (Auth)                           │    │
│  │  ~300 MB     │  │  ├─ PostgREST (API)                         │    │
│  └──────────────┘  │  ├─ Storage (screenshots)                   │    │
│                     │  └─ ~2.5 GB RAM                             │    │
│                     └─────────────────────────────────────────────┘    │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Sync Engine (Python)                                           │  │
│  │                                                                  │  │
│  │  Scheduler Process (FastAPI + WebSocket server, port 8080)      │  │
│  │  ├─ Manages active user sessions                                │  │
│  │  ├─ Redis-backed sync queue                                     │  │
│  │  └─ Assigns jobs to workers                                     │  │
│  │                                                                  │  │
│  │  Worker 1 ←→ MT5 Terminal #1 (Wine) ── Trade sync               │  │
│  │  Worker 2 ←→ MT5 Terminal #2 (Wine) ── Trade sync               │  │
│  │  Worker 3 ←→ MT5 Terminal #3 (Wine) ── Trade sync               │  │
│  │  Worker 4 ←→ MT5 Terminal #4 (Wine) ── Market data (demo acct)  │  │
│  │                                                                  │  │
│  │  Total: ~2.2 GB RAM                                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────┐                                                         │
│  │  Redis   │  Sync queue, user sessions, candle hot cache            │
│  │  ~200 MB │                                                         │
│  └──────────┘                                                         │
│                                                                        │
│  Total RAM: ~5.5 GB used / 8 GB available (2.5 GB headroom)           │
└────────────────────────────────────────────────────────────────────────┘
```

### Sync Flow

```
User opens rawjournal.pro
  → Browser opens WebSocket to ws.rawjournal.pro
  → Scheduler marks user ACTIVE
  → If first time: Worker does FULL sync (all historical trades)
  → If returning: Worker does CATCH-UP sync (trades since last_sync)
  → Then: Worker syncs this user every 15 seconds
    ├─ Every 15s: open positions + floating P&L + balance (lightweight)
    └─ Every 60s: check for new closed trades (full check)

User closes tab
  → WebSocket disconnects
  → 5-minute grace timer starts (still syncing every 15s)
  → After 5 min with no reconnect: STOP syncing (zero resources)

User returns after days
  → WebSocket connects → immediate catch-up sync
  → All missed trades imported in 1-5 seconds
  → Resume 15s interval
```

### Market Data Flow

```
Worker #4 (Market Data) — logged into FREE demo account
  → Tracks "hot symbols" (symbols with active user positions)
  → Pulls candle data every 30 seconds (30m, 1H, 4H, Daily, Weekly)
  → Stores in PostgreSQL candle_cache table (~11 MB for 15 symbols)
  → Latest candles pushed to Redis for instant access
  → WebSocket pushes candle updates to users with charts open

User opens chart:
  → API reads from candle_cache (<50ms response)
  → Live updates via WebSocket every 30s
  → Trade entry/exit markers overlaid on chart
```

---

## Rules & Constraints

These rules must be followed throughout all phases. Do NOT deviate.

### R1 — Hosting
- [ ] Everything runs on single KVM2 VPS (2 vCPU, 8GB RAM, 100GB NVMe)
- [ ] No external hosting services (no Vercel, no cloud databases)
- [ ] Domain: rawjournal.pro pointed to KVM2 IP
- [ ] SSL via Let's Encrypt (Certbot + Nginx)

### R2 — Security
- [ ] Investor password ONLY (read-only MT5 access). Never accept master passwords
- [ ] All MT5 credentials encrypted at rest (AES-256) before storing in database
- [ ] Decrypt only in worker process memory, never log plaintext passwords
- [ ] Supabase Row Level Security (RLS) on ALL user-facing tables
- [ ] HTTPS enforced everywhere. No HTTP allowed
- [ ] API rate limiting on all endpoints

### R3 — Sync Engine
- [ ] Sync ONLY users who are ONLINE (WebSocket connected) or in 5-min grace period
- [ ] Lightweight sync every 15s (open positions + balance)
- [ ] Full closed-trade check every 60s
- [ ] STOP syncing completely when user offline >5 minutes
- [ ] Catch-up sync on return (fetch all trades since last_sync timestamp)
- [ ] First-time sync: fetch ALL historical trades from account creation
- [ ] Broker server grouping: batch users on same broker for faster mt5.login() switching
- [ ] Maximum 4 MT5 terminal instances (3 trade + 1 market data)
- [ ] Restart terminals every 4-6 hours to prevent Wine memory leaks
- [ ] Weekend mode: reduce to 1 worker, 30-min intervals (forex market closed)

### R4 — Data
- [ ] Candle data stored in global shared cache, NOT per user
- [ ] Only cache "hot symbols" (symbols with active positions/recent trades)
- [ ] 6 months of historical candles per hot symbol
- [ ] Timeframes: 30m, 1H, 4H, Daily, Weekly only
- [ ] Candle cache updated every 30s by Worker #4 (market data)
- [ ] Trade data isolation: users can ONLY access their own trades (RLS enforced)

### R5 — Pricing & Limits
- [ ] Free: 1 account, 15 trades/month (manual + CSV only, NO MT5 sync)
- [ ] Pro ($12.99/mo): 1 MT5 account, unlimited trades, full features
- [ ] Elite ($30/mo): 5 MT5 accounts, priority sync, all features
- [ ] Feature gates enforced in both frontend AND backend (never trust frontend alone)
- [ ] Stripe for payments. Webhook verification on all events

### R6 — UI/UX
- [ ] Dark mode ONLY (no light mode toggle)
- [ ] Responsive: desktop + mobile browsers
- [ ] Charts: TradingView Lightweight Charts (open source, free)
- [ ] Chart timeframes: 30m, 1H, 4H, Daily, Weekly
- [ ] Trade notifications via WebSocket (toast when new trade synced)
- [ ] Session tagging: auto-tag trades by session (Asian/London/NY)

### R7 — Tech Stack (Locked)
- [ ] Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- [ ] Backend: Self-hosted Supabase (PostgreSQL + Auth + Storage + PostgREST)
- [ ] Sync Engine: Python 3.11+, MetaTrader5 library, Celery/custom workers, Redis
- [ ] Charts: TradingView Lightweight Charts
- [ ] Payments: Stripe
- [ ] Email: Resend (free tier)
- [ ] Process Manager: PM2 (Next.js), Supervisor (Python workers)
- [ ] Reverse Proxy: Nginx

### R8 — Performance Targets
- [ ] Dashboard load: <2 seconds
- [ ] Chart render: <500ms (from cache)
- [ ] Trade sync latency: <15 seconds for active users
- [ ] Catch-up sync: <10 seconds for up to 1000 missed trades
- [ ] API responses: <200ms for cached data, <500ms for computed analytics
- [ ] Support 15-20 concurrent active users on KVM2

---

## Phase 1 — Infrastructure ✅

> **Goal:** Set up Coolify + Docker deployment system on KVM2 VPS
> **Duration:** 1-2 hours
> **Status:** ✅ COMPLETED

### Deployment Approach

Using **Coolify** (open-source deployment platform) to manage:
- ✅ Supabase (PostgreSQL + Auth + Storage + PostgREST)
- ✅ Next.js frontend (Git-based auto-deploy)
- ✅ Docker Compose (MT5 workers + scheduler + Redis)

### Files Created

**Docker Configuration** (`/docker`)
- ✅ `Dockerfile.worker` — Wine + MT5 + Python worker image
- ✅ `Dockerfile.scheduler` — FastAPI WebSocket scheduler
- ✅ `docker-compose.yml` — Orchestrates 4 workers + scheduler + Redis
- ✅ `scripts/start-worker.sh` — Container entrypoint (Xvfb + Wine init + MT5 install)

**Sync Engine** (`/sync-engine`)
- ✅ `scheduler.py` — WebSocket coordinator + Redis queue manager
- ✅ `trade_worker.py` — MT5 trade sync (workers 1-3)
- ✅ `market_data_worker.py` — Candle data fetcher (worker 4)
- ✅ `config.py`, `database.py`, `encryption.py`, `models.py`, `utils.py`
- ✅ `requirements.txt` — Python dependencies

**Database** (`/supabase/migrations`)
- ✅ `001_initial_schema.sql` — All tables, RLS policies, triggers, storage bucket

**Frontend** (`/web`)
- ✅ Next.js 14 scaffold with Tailwind + dark theme
- ✅ Pages: landing, login (sign in/up), dashboard
- ✅ Supabase auth integration (client + server + middleware)
- ✅ Basic dashboard with stats, positions, trades tables

### Deployment Steps

1. **Install Coolify on VPS**
   ```bash
   ssh root@YOUR_VPS_IP
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

2. **Access Coolify UI**
   - Open `http://YOUR_VPS_IP:8000`
   - Create admin account

3. **Deploy Supabase** (via Coolify one-click service)
   - Service Type: Supabase
   - Domain: `api.rawjournal.pro`
   - Wait for deployment
   - Access Supabase Studio to run SQL migration

4. **Deploy Next.js Frontend**
   - New Resource → Git Repository
   - Connect GitHub repo
   - Base Directory: `web/`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Domain: `rawjournal.pro`
   - Environment variables: Copy from `web/.env.example`

5. **Deploy MT5 Workers** (Docker Compose)
   - New Resource → Docker Compose
   - Point to `docker/docker-compose.yml`
   - Environment variables: Copy from root `.env.example`
   - Exposes scheduler on port 8080
   - Domain for scheduler WebSocket: `ws.rawjournal.pro`

6. **Run Database Migration**
   - Open Supabase Studio
   - SQL Editor → Paste `/supabase/migrations/001_initial_schema.sql`
   - Execute

### ✅ Phase 1 Verification
- [x] Coolify installed and accessible
- [x] All services configured in Coolify
- [x] Docker images built successfully
- [x] SSL certificates auto-issued for all domains
- [x] Database schema applied
- [x] Environment variables set

---

## Phase 2 — Core Backend ✅

> **Goal:** Database schema, authentication, RLS policies, storage buckets
> **Duration:** COMPLETED
> **Status:** ✅ All SQL created in `001_initial_schema.sql`

### Completed Items

**Database Schema:**
- ✅ `profiles` — User profiles with subscription tiers
- ✅ `accounts` — MT5 account credentials (encrypted)
- ✅ `trades` — Historical trade records
- ✅ `open_positions` — Live positions (synced every 15s)
- ✅ `journals` — Trade notes, tags, screenshots
- ✅ `tags` — User-defined trade tags
- ✅ `candle_cache` — Shared OHLCV data for charts
- ✅ `hot_symbols` — Currently tracked symbols
- ✅ `analytics_cache` — Pre-computed statistics

**Row Level Security (RLS):**
- ✅ All user tables have policies enforcing `auth.uid() = user_id`
- ✅ Candle data readable by all authenticated users
- ✅ Service role key bypasses RLS for Python workers

**Triggers & Functions:**
- ✅ Auto-create profile on user signup
- ✅ Auto-tag trades by forex session (Asian/London/NY/Overlap)
- ✅ Auto-invalidate analytics cache on trade changes
- ✅ Auto-update `updated_at` timestamps
- ✅ Monthly trade count reset function

**Storage:**
- ✅ `trade-screenshots` bucket (5MB limit, image/* only)
- ✅ RLS policies for user-folder isolation

### ✅ Phase 2 Verification
- [x] SQL migration file created and tested
- [x] All tables have proper indexes for query performance
- [x] RLS prevents cross-user data access
- [x] Triggers execute correctly on insert/update
- [x] Storage bucket enforces file size and type limits

---

## Phase 3 — MT5 Sync Engine ✅

> **Goal:** Python workers syncing trades from MT5 accounts
> **Duration:** COMPLETED
> **Status:** ✅ All worker code implemented

### Completed Components

**FastAPI Scheduler** (`scheduler.py`)
- ✅ WebSocket server on port 8080
- ✅ Active user session tracking
- ✅ Redis-based sync queue (sorted set)
- ✅ 5-minute grace period after disconnect
- ✅ Broker server grouping for efficient login switching
- ✅ Admin API endpoints for monitoring

**Trade Workers** (`trade_worker.py`)
- ✅ Workers 1-3: sync user accounts via Wine + MT5
- ✅ Lightweight sync every 15s (positions + balance)
- ✅ Full sync every 60s (closed trades check)
- ✅ Catch-up sync on user return (all missed trades)
- ✅ AES-256-GCM password decryption
- ✅ Automatic terminal restart every 5 hours
- ✅ Login failure tracking (disable after 3 fails)
- ✅ Weekend mode (reduced frequency)

**Market Data Worker** (`market_data_worker.py`)
- ✅ Worker 4: logged into demo account permanently
- ✅ Fetches candles for "hot symbols" every 30s
- ✅ Timeframes: M30, H1, H4, D1, W1
- ✅ Stores 6 months history per symbol
- ✅ Upserts to PostgreSQL + caches in Redis
- ✅ Auto-cleanup cold symbols (inactive >7 days)

**Utilities:**
- ✅ `config.py` — Environment variable loader
- ✅ `database.py` — Supabase REST client (service role)
- ✅ `encryption.py` — AES-256-GCM password encryption
- ✅ `models.py` — Pydantic data models
- ✅ `utils.py` — Session tagger, market hours checker

### Docker Orchestration
- ✅ 4 worker containers (Wine + MT5 + Python)
- ✅ 1 scheduler container (FastAPI + WebSocket)
- ✅ 1 Redis container (256MB, LRU eviction)
- ✅ Persistent volumes for MT5 data
- ✅ Health checks for all services

### ✅ Phase 3 Verification
- [x] All Python code implemented and syntax-checked
- [x] Docker images build successfully
- [x] Worker startup script handles Wine + MT5 initialization
- [x] Scheduler exposes WebSocket on :8080
- [x] Redis queue operations working
- [x] Encryption/decryption tested

---

## Phase 4 — Frontend Foundation ✅

> **Goal:** Next.js app with auth, routing, basic dashboard
> **Duration:** COMPLETED
> **Status:** ✅ Basic scaffold implemented

### Completed Pages

**Public Routes:**
- ✅ `/` — Landing page with feature highlights
- ✅ `/login` — Sign in/sign up form (Supabase auth)

**Protected Routes (require auth):**
- ✅ `/dashboard` — Overview with stats cards + open positions + recent trades
- ✅ Sidebar navigation component
- ✅ Auth middleware (redirects unauthenticated users)

### Tech Stack
- ✅ Next.js 14 (App Router)
- ✅ TypeScript
- ✅ Tailwind CSS (custom dark theme)
- ✅ Supabase client (browser + server)
- ✅ Environment variables configured

### UI Components
- ✅ Dark mode color scheme (no light mode)
- ✅ Responsive layouts (mobile + desktop)
- ✅ Form inputs with proper validation
- ✅ Data tables for positions and trades
- ✅ Stat cards for key metrics

### ✅ Phase 4 Verification
- [x] Next.js app runs locally (`npm run dev`)
- [x] Dependencies installed (`npm install`)
- [x] Authentication flow working (sign up, sign in, sign out)
- [x] Protected routes redirect to login
- [x] Dashboard fetches data from Supabase
- [x] TypeScript compiles without critical errors

---

## Phase 5 — Trade Management

> **Goal:** Manual trade entry, CSV import, filtering, search
> **Duration:** 3-4 days
> **Depends on:** Phase 2, 4
> **Status:** ⬜ NOT STARTED

### TBD — Implementation pending

---

## Phase 6 — Analytics & Charts

> **Goal:** Dashboard analytics, equity curves, calendar heatmap, session breakdown, TradingView charts.
> **Duration:** 5-6 days
> **Depends on:** Phase 5 (trades exist in DB)

### Step 6.1 — Analytics Computation API
- [ ] Configure timezone: `timedatectl set-timezone UTC`
- [ ] Create non-root user: `adduser rawjournal && usermod -aG sudo rawjournal`
- [ ] Setup SSH key authentication, disable password login
- [ ] Configure UFW firewall:
  ```
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw deny 5432/tcp   # Block external PostgreSQL
  ufw deny 6379/tcp   # Block external Redis
  ufw enable
  ```

### Step 1.2 — Docker Installation
- [ ] Install Docker Engine 24.x:
  ```bash
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker rawjournal
  ```
- [ ] Install Docker Compose v2: `apt install docker-compose-plugin`
- [ ] Verify: `docker --version && docker compose version`

### Step 1.3 — Domain & SSL
- [ ] Point DNS A record: `rawjournal.pro → KVM2_IP`
- [ ] Point DNS A record: `api.rawjournal.pro → KVM2_IP`
- [ ] Point DNS A record: `ws.rawjournal.pro → KVM2_IP`
- [ ] Install Nginx: `apt install nginx`
- [ ] Install Certbot: `apt install certbot python3-certbot-nginx`
- [ ] Obtain SSL certificates:
  ```bash
  certbot --nginx -d rawjournal.pro -d api.rawjournal.pro -d ws.rawjournal.pro
  ```
- [ ] Verify auto-renewal: `certbot renew --dry-run`

### Step 1.4 — Nginx Configuration
- [ ] Create `/etc/nginx/sites-available/rawjournal.pro`:
  ```nginx
  # Frontend
  server {
      listen 443 ssl;
      server_name rawjournal.pro;
      ssl_certificate /etc/letsencrypt/live/rawjournal.pro/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/rawjournal.pro/privkey.pem;

      location / {
          proxy_pass http://127.0.0.1:3000;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection 'upgrade';
          proxy_set_header Host $host;
          proxy_cache_bypass $http_upgrade;
      }
  }

  # Supabase API
  server {
      listen 443 ssl;
      server_name api.rawjournal.pro;
      # ... proxy to Supabase Kong gateway (port 8000)
      location / {
          proxy_pass http://127.0.0.1:8000;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }
  }

  # WebSocket (Sync Scheduler)
  server {
      listen 443 ssl;
      server_name ws.rawjournal.pro;
      location / {
          proxy_pass http://127.0.0.1:8080;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_read_timeout 86400;  # 24hr for long-lived WS
      }
  }

  # HTTP → HTTPS redirect
  server {
      listen 80;
      server_name rawjournal.pro api.rawjournal.pro ws.rawjournal.pro;
      return 301 https://$host$request_uri;
  }
  ```
- [ ] Enable site: `ln -s /etc/nginx/sites-available/rawjournal.pro /etc/nginx/sites-enabled/`
- [ ] Test and reload: `nginx -t && systemctl reload nginx`

### Step 1.5 — Redis Installation
- [ ] Install Redis: `apt install redis-server`
- [ ] Configure `/etc/redis/redis.conf`:
  - Set `maxmemory 256mb`
  - Set `maxmemory-policy allkeys-lru`
  - Set `bind 127.0.0.1` (local only)
- [ ] Enable and start: `systemctl enable redis-server && systemctl start redis-server`
- [ ] Verify: `redis-cli ping` → `PONG`

### Step 1.6 — Self-Hosted Supabase
- [ ] Clone Supabase Docker setup:
  ```bash
  cd /opt
  git clone --depth 1 https://github.com/supabase/supabase
  cd supabase/docker
  cp .env.example .env
  ```
- [ ] Edit `.env` — set these critical values:
  ```env
  POSTGRES_PASSWORD=<generate-strong-password>
  JWT_SECRET=<generate-32-char-secret>
  ANON_KEY=<generate-jwt-with-anon-role>
  SERVICE_ROLE_KEY=<generate-jwt-with-service-role>
  API_EXTERNAL_URL=https://api.rawjournal.pro
  SUPABASE_PUBLIC_URL=https://api.rawjournal.pro
  SITE_URL=https://rawjournal.pro
  SMTP_HOST=smtp.resend.com
  SMTP_PORT=465
  SMTP_USER=resend
  SMTP_PASS=<resend-api-key>
  SMTP_SENDER_NAME=RawJournal
  SMTP_ADMIN_EMAIL=noreply@rawjournal.pro
  DISABLE_SIGNUP=false
  ```
- [ ] Generate JWT keys using Supabase JWT generator tool
- [ ] Optimize for KVM2 — edit `docker-compose.yml`:
  - PostgreSQL: Set `shared_buffers=512MB`, `work_mem=16MB`, `max_connections=100`
  - Disable Supabase Studio in production (saves ~200MB RAM) or keep for admin access
  - Disable Supabase Realtime if using custom WebSocket (saves ~300MB RAM)
- [ ] Start Supabase: `docker compose up -d`
- [ ] Verify: `curl https://api.rawjournal.pro/rest/v1/` returns JSON
- [ ] Access Supabase Studio: `http://KVM2_IP:3000` (temporary, disable port after setup)

### Step 1.7 — Wine + MT5 Setup
- [ ] Install Wine and virtual display:
  ```bash
  dpkg --add-architecture i386
  apt update
  apt install wine64 wine32 winbind xvfb
  ```
- [ ] Start virtual display (headless mode for MT5):
  ```bash
  Xvfb :99 -screen 0 1024x768x16 &
  export DISPLAY=:99
  ```
- [ ] Create 4 isolated Wine prefixes:
  ```bash
  for i in 1 2 3 4; do
    export WINEPREFIX=/opt/mt5/worker_$i
    wineboot --init
  done
  ```
- [ ] Download MT5 terminal installer
- [ ] Install MT5 in each prefix (portable mode):
  ```bash
  for i in 1 2 3 4; do
    export WINEPREFIX=/opt/mt5/worker_$i
    wine /tmp/mt5setup.exe /auto
  done
  ```
- [ ] Create a free demo account on any broker (for Worker #4 market data)
- [ ] Test: launch terminal, verify it starts under Wine
- [ ] Create systemd service for Xvfb:
  ```ini
  # /etc/systemd/system/xvfb.service
  [Unit]
  Description=Virtual Display for MT5
  After=network.target

  [Service]
  ExecStart=/usr/bin/Xvfb :99 -screen 0 1024x768x16
  Restart=always

  [Install]
  WantedBy=multi-user.target
  ```
- [ ] Enable: `systemctl enable xvfb && systemctl start xvfb`

### Step 1.8 — Python Environment
- [ ] Install Python 3.11+: `apt install python3.11 python3.11-venv python3-pip`
- [ ] Create virtual environment:
  ```bash
  cd /opt/rawjournal
  python3.11 -m venv venv
  source venv/bin/activate
  ```
- [ ] Install dependencies:
  ```bash
  pip install MetaTrader5 mt5linux fastapi uvicorn websockets
  pip install redis celery psycopg2-binary python-dotenv
  pip install cryptography pydantic httpx
  ```
- [ ] Install Supervisor: `apt install supervisor`

### Step 1.9 — Node.js Environment
- [ ] Install Node.js 20 LTS:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install nodejs
  ```
- [ ] Install PM2: `npm install -g pm2`
- [ ] Verify: `node --version && pm2 --version`

### Step 1.10 — Backup System
- [ ] Create backup script `/opt/backups/backup.sh`:
  ```bash
  #!/bin/bash
  DATE=$(date +%Y%m%d_%H%M)
  BACKUP_DIR=/opt/backups

  # PostgreSQL dump
  docker exec supabase-db pg_dump -U postgres postgres | gzip > $BACKUP_DIR/db_$DATE.sql.gz

  # Keep 30 days
  find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
  ```
- [ ] Schedule daily: `crontab -e` → `0 3 * * * /opt/backups/backup.sh`
- [ ] Test backup and restore procedure

### ✅ Phase 1 Verification
- [ ] `https://rawjournal.pro` — Nginx responds (placeholder page)
- [ ] `https://api.rawjournal.pro/rest/v1/` — Supabase API responds
- [ ] `redis-cli ping` → PONG
- [ ] Wine runs MT5 terminal headless without errors
- [ ] Python venv activated, all packages importable
- [ ] Backups running daily
- [ ] SSL certificates valid for all 3 subdomains
- [ ] Firewall blocks external access to PostgreSQL and Redis

---

## Phase 2 — Core Backend

> **Goal:** Database schema, authentication, RLS policies, storage buckets — all backend foundations.
> **Duration:** 2-3 days
> **Depends on:** Phase 1 complete

### Step 2.1 — Database Schema

Run these SQL migrations via Supabase Studio SQL Editor or psql.

#### 2.1.1 — Profiles Table (extends auth.users)
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'elite')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    trade_count_this_month INTEGER NOT NULL DEFAULT 0,
    month_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2.1.2 — Accounts Table
```sql
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'My Account',
    broker TEXT NOT NULL,
    mt5_server TEXT NOT NULL,
    mt5_login TEXT NOT NULL,
    mt5_investor_password_encrypted TEXT NOT NULL,  -- AES-256 encrypted
    account_currency TEXT NOT NULL DEFAULT 'USD',
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,2),
    current_equity DECIMAL(15,2),
    sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'pending' CHECK (last_sync_status IN ('pending', 'syncing', 'success', 'error')),
    last_sync_error TEXT,
    sync_fail_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, mt5_login, mt5_server)
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_accounts_sync ON public.accounts(sync_enabled, last_sync_at);
CREATE INDEX idx_accounts_broker ON public.accounts(mt5_server);  -- For broker grouping
```

#### 2.1.3 — Trades Table
```sql
CREATE TABLE public.trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
    entry_timestamp TIMESTAMPTZ NOT NULL,
    exit_timestamp TIMESTAMPTZ,
    entry_price DECIMAL(15,6) NOT NULL,
    exit_price DECIMAL(15,6),
    position_size DECIMAL(15,4) NOT NULL,  -- lot size
    pnl DECIMAL(15,2),                     -- profit/loss in account currency
    pnl_pips DECIMAL(15,2),
    commission DECIMAL(15,4) DEFAULT 0,
    swap DECIMAL(15,4) DEFAULT 0,
    stop_loss DECIMAL(15,6),
    take_profit DECIMAL(15,6),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    import_source TEXT NOT NULL DEFAULT 'manual' CHECK (import_source IN ('manual', 'csv', 'mt5')),
    session_tag TEXT,                       -- asian, london, newyork, overlap
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, ticket_number)
);

CREATE INDEX idx_trades_user_date ON public.trades(user_id, exit_timestamp DESC);
CREATE INDEX idx_trades_account ON public.trades(account_id, entry_timestamp DESC);
CREATE INDEX idx_trades_symbol ON public.trades(user_id, symbol);
CREATE INDEX idx_trades_status ON public.trades(user_id, status);
CREATE INDEX idx_trades_session ON public.trades(user_id, session_tag);
CREATE INDEX idx_trades_pnl ON public.trades(user_id, pnl);
```

#### 2.1.4 — Open Positions Table (live, replaced on each sync)
```sql
CREATE TABLE public.open_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('buy', 'sell')),
    entry_timestamp TIMESTAMPTZ NOT NULL,
    entry_price DECIMAL(15,6) NOT NULL,
    current_price DECIMAL(15,6),
    position_size DECIMAL(15,4) NOT NULL,
    floating_pnl DECIMAL(15,2),
    stop_loss DECIMAL(15,6),
    take_profit DECIMAL(15,6),
    swap DECIMAL(15,4) DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, ticket_number)
);

CREATE INDEX idx_open_positions_user ON public.open_positions(user_id);
CREATE INDEX idx_open_positions_symbol ON public.open_positions(symbol);
```

#### 2.1.5 — Journals Table
```sql
CREATE TABLE public.journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    mood TEXT CHECK (mood IN ('confident', 'uncertain', 'fearful', 'neutral', 'greedy', 'disciplined')),
    setup_quality INTEGER CHECK (setup_quality BETWEEN 1 AND 5),
    followed_plan BOOLEAN,
    screenshot_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(trade_id)  -- One journal per trade
);

CREATE INDEX idx_journals_user ON public.journals(user_id);
CREATE INDEX idx_journals_tags ON public.journals USING GIN(tags);
```

#### 2.1.6 — Tags Table
```sql
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',  -- indigo
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user ON public.tags(user_id);
```

#### 2.1.7 — Candle Cache Table (global, shared)
```sql
CREATE TABLE public.candle_cache (
    id BIGSERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL CHECK (timeframe IN ('M30', 'H1', 'H4', 'D1', 'W1')),
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(15,6) NOT NULL,
    high DECIMAL(15,6) NOT NULL,
    low DECIMAL(15,6) NOT NULL,
    close DECIMAL(15,6) NOT NULL,
    volume DECIMAL(15,2) DEFAULT 0,

    UNIQUE(symbol, timeframe, timestamp)
);

CREATE INDEX idx_candles_lookup ON public.candle_cache(symbol, timeframe, timestamp DESC);
```

#### 2.1.8 — Hot Symbols Table (tracked by market data worker)
```sql
CREATE TABLE public.hot_symbols (
    symbol TEXT PRIMARY KEY,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    candle_data_since TIMESTAMPTZ  -- earliest cached candle
);
```

#### 2.1.9 — Analytics Cache Table
```sql
CREATE TABLE public.analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,  -- NULL = all accounts
    period TEXT NOT NULL DEFAULT 'all' CHECK (period IN ('today', 'week', 'month', 'year', 'all')),
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    breakeven_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    profit_factor DECIMAL(10,2) DEFAULT 0,
    avg_win DECIMAL(15,2) DEFAULT 0,
    avg_loss DECIMAL(15,2) DEFAULT 0,
    largest_win DECIMAL(15,2) DEFAULT 0,
    largest_loss DECIMAL(15,2) DEFAULT 0,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    max_drawdown DECIMAL(15,2) DEFAULT 0,
    max_drawdown_pct DECIMAL(5,2) DEFAULT 0,
    avg_trade_duration INTERVAL,
    best_symbol TEXT,
    worst_symbol TEXT,
    best_session TEXT,
    worst_session TEXT,
    consecutive_wins INTEGER DEFAULT 0,
    consecutive_losses INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, account_id, period)
);
```

#### 2.1.10 — Session Tagging Function
```sql
-- Auto-tag trades by forex session based on entry time (UTC)
CREATE OR REPLACE FUNCTION public.get_session_tag(entry_time TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
    hour INTEGER;
BEGIN
    hour := EXTRACT(HOUR FROM entry_time AT TIME ZONE 'UTC');
    IF hour >= 0 AND hour < 8 THEN
        RETURN 'asian';
    ELSIF hour >= 8 AND hour < 13 THEN
        RETURN 'london';
    ELSIF hour >= 13 AND hour < 16 THEN
        RETURN 'overlap';  -- London + NY overlap
    ELSIF hour >= 16 AND hour < 22 THEN
        RETURN 'newyork';
    ELSE
        RETURN 'late-ny';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-set session_tag on trade insert
CREATE OR REPLACE FUNCTION public.auto_tag_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_tag IS NULL THEN
        NEW.session_tag := public.get_session_tag(NEW.entry_timestamp);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_session_tag
    BEFORE INSERT OR UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.auto_tag_session();
```

#### 2.1.11 — Monthly Trade Counter Reset
```sql
-- Reset free tier trade counts on 1st of each month
CREATE OR REPLACE FUNCTION public.reset_monthly_trade_count()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET trade_count_this_month = 0,
        month_reset_date = CURRENT_DATE
    WHERE month_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2.2 — Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.open_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Accounts: users can only manage their own accounts
CREATE POLICY accounts_all ON public.accounts FOR ALL USING (auth.uid() = user_id);

-- Trades: users can only access their own trades
CREATE POLICY trades_all ON public.trades FOR ALL USING (auth.uid() = user_id);

-- Open Positions: users can only see their own
CREATE POLICY positions_all ON public.open_positions FOR ALL USING (auth.uid() = user_id);

-- Journals: users can only manage their own
CREATE POLICY journals_all ON public.journals FOR ALL USING (auth.uid() = user_id);

-- Tags: users can only manage their own
CREATE POLICY tags_all ON public.tags FOR ALL USING (auth.uid() = user_id);

-- Analytics Cache: users can only see their own
CREATE POLICY analytics_select ON public.analytics_cache FOR SELECT USING (auth.uid() = user_id);

-- Candle Cache: readable by all authenticated users (shared data)
ALTER TABLE public.candle_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY candles_select ON public.candle_cache FOR SELECT TO authenticated USING (true);

-- Hot Symbols: readable by all authenticated users
ALTER TABLE public.hot_symbols ENABLE ROW LEVEL SECURITY;
CREATE POLICY hot_symbols_select ON public.hot_symbols FOR SELECT TO authenticated USING (true);

-- Service role bypass for Python workers (uses service_role key)
-- Service role automatically bypasses RLS in Supabase
```

### Step 2.3 — Storage Buckets
- [ ] Create storage bucket `trade-screenshots`:
  - Max file size: 5 MB
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`
  - Policy: authenticated users can upload/read their own files
  ```sql
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
      'trade-screenshots',
      'trade-screenshots',
      false,
      5242880,  -- 5MB
      ARRAY['image/png', 'image/jpeg', 'image/webp']
  );

  -- Upload policy: users can upload to their own folder
  CREATE POLICY ss_upload ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

  -- Read policy: users can read their own screenshots
  CREATE POLICY ss_read ON storage.objects FOR SELECT
      USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

  -- Delete policy: users can delete their own screenshots
  CREATE POLICY ss_delete ON storage.objects FOR DELETE
      USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
  ```

### Step 2.4 — Database Triggers for Analytics
```sql
-- Recalculate analytics cache when trades change
CREATE OR REPLACE FUNCTION public.invalidate_analytics_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark cache as stale by deleting it; frontend will trigger recalculation
    DELETE FROM public.analytics_cache WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trade_change
    AFTER INSERT OR UPDATE OR DELETE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.invalidate_analytics_cache();
```

### Step 2.5 — Updated Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_accounts_timestamp BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_trades_timestamp BEFORE UPDATE ON public.trades
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_journals_timestamp BEFORE UPDATE ON public.journals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### ✅ Phase 2 Verification
- [ ] All 10 tables created with correct columns and constraints
- [ ] RLS enabled on all user-facing tables
- [ ] Test: create user via Supabase Auth → profile auto-created
- [ ] Test: user A cannot read user B's trades (RLS enforced)
- [ ] Test: upload screenshot to storage → accessible only by uploader
- [ ] Test: insert trade → analytics_cache invalidated
- [ ] Test: insert trade → session_tag auto-set
- [ ] Test: service_role key bypasses RLS (for Python workers)

---

## Phase 3 — MT5 Sync Engine

> **Goal:** Python workers syncing trades for online users every 15s, market data worker caching candles.
> **Duration:** 5-7 days
> **Depends on:** Phase 1 + Phase 2

### Step 3.1 — Project Structure
```
/opt/rawjournal/sync-engine/
├── config.py               # Environment variables, constants
├── encryption.py            # AES-256 encrypt/decrypt for MT5 passwords
├── database.py              # Supabase client (service_role key)
├── scheduler.py             # FastAPI app + WebSocket + Redis queue management
├── trade_worker.py          # Trade sync worker process (1 per MT5 terminal)
├── market_data_worker.py    # Candle data worker (Worker #4)
├── models.py                # Pydantic models for trades, accounts, etc.
├── session_tagger.py        # Auto-tag trades by forex session
├── utils.py                 # Helpers: retry logic, error handling
├── requirements.txt         # Python dependencies
└── supervisord.conf         # Supervisor config for all processes
```

### Step 3.2 — Configuration (`config.py`)
- [ ] Load from `.env` file:
  ```
  SUPABASE_URL=https://api.rawjournal.pro
  SUPABASE_SERVICE_KEY=<service_role_key>
  REDIS_URL=redis://127.0.0.1:6379
  ENCRYPTION_KEY=<32-byte-hex-key>
  MT5_TERMINAL_1=/opt/mt5/worker_1/drive_c/Program Files/MetaTrader 5/terminal64.exe
  MT5_TERMINAL_2=/opt/mt5/worker_2/...
  MT5_TERMINAL_3=/opt/mt5/worker_3/...
  MT5_TERMINAL_4=/opt/mt5/worker_4/...
  DEMO_MT5_LOGIN=<demo-account-login>
  DEMO_MT5_PASSWORD=<demo-account-password>
  DEMO_MT5_SERVER=<demo-broker-server>
  SYNC_INTERVAL=15
  FULL_CHECK_INTERVAL=60
  CANDLE_UPDATE_INTERVAL=30
  GRACE_PERIOD=300
  TERMINAL_RESTART_HOURS=5
  ```

### Step 3.3 — Encryption Module (`encryption.py`)
- [ ] Implement AES-256-GCM encryption for investor passwords:
  - `encrypt(plaintext, key) → ciphertext + nonce + tag`
  - `decrypt(ciphertext, key) → plaintext`
  - Use `cryptography` library (Fernet or raw AES-GCM)
  - Key stored in `.env`, never in database

### Step 3.4 — Scheduler Service (`scheduler.py`)
- [ ] FastAPI application with:
  - **WebSocket endpoint** `/ws` — clients connect with JWT token
  - **Active sessions dict** — `{user_id: {connected_at, last_heartbeat, accounts: [...]}}`
  - **Grace period tracking** — `{user_id: disconnected_at}` for users who just left
  - **Sync queue** (Redis sorted set):
    - Key: `sync_queue`
    - Members: `{user_id}:{account_id}`
    - Score: next scheduled sync timestamp
  - **Broker grouping**: when building queue, sort by `mt5_server` so workers process same-broker accounts back-to-back
  - **Admin endpoints** (protected by service key):
    - `GET /admin/status` — active users, queue depth, worker health
    - `GET /admin/workers` — per-worker stats

- [ ] WebSocket handler logic:
  ```
  on_connect(user_id, jwt_token):
    1. Verify JWT with Supabase
    2. Add to active_sessions
    3. Fetch user's accounts from DB
    4. Queue IMMEDIATE sync for all accounts (catch-up)
    5. Start 15s recurring schedule

  on_heartbeat(user_id):
    1. Update last_heartbeat timestamp

  on_disconnect(user_id):
    1. Start grace timer (5 minutes)
    2. Keep syncing during grace

  grace_check_loop (every 30s):
    1. For each user in grace period:
       - If 5 minutes elapsed: remove from sync queue, stop syncing
  ```

### Step 3.5 — Trade Sync Worker (`trade_worker.py`)
- [ ] Each worker is a separate Python process (due to MT5 library being process-global)
- [ ] Worker lifecycle:
  ```
  1. Initialize MT5 terminal: mt5.initialize(path=TERMINAL_PATH)
  2. Main loop:
     a. Pop next job from Redis sync_queue (blocking pop with timeout)
     b. Decrypt investor password from database
     c. mt5.login(login, password, server, timeout=10000)
     d. If login fails: log error, increment fail count, skip
     e. Determine sync type:
        - lightweight (every 15s): positions_get() + account_info()
        - full check (every 60s): history_deals_get(last_sync, now)
     f. Lightweight sync:
        - positions = mt5.positions_get()
        - account = mt5.account_info()
        - Upsert open_positions table (delete old, insert current)
        - Update accounts.current_balance, accounts.current_equity
        - Push to WebSocket: {type: POSITION_UPDATE, data: positions}
     g. Full sync (every 4th cycle = 60s):
        - deals = mt5.history_deals_get(last_sync, now)
        - Transform deals to trade records
        - Auto-tag session (asian/london/newyork/overlap)
        - Upsert to trades table (ON CONFLICT ticket_number)
        - If new closed trades found:
          - Push notification: {type: NEW_TRADE, data: {symbol, pnl, pips}}
          - Update hot_symbols table
        - Update accounts.last_sync_at = now()
     h. Reschedule: add job back to queue with score = now + 15
     i. If login failed 3+ times: pause account, notify user via WebSocket
  3. Terminal restart: every 5 hours, shutdown() + reinitialize()
  ```

### Step 3.6 — Broker Server Grouping
- [ ] Scheduler sorts sync queue secondarily by `mt5_server`:
  ```
  Queue order (by next_sync time, then grouped by broker):
    1. user_A:account_1 (ICMarkets-Live) — due now
    2. user_C:account_3 (ICMarkets-Live) — due now (same broker!)
    3. user_B:account_2 (Pepperstone-Live) — due now
  ```
- [ ] Workers track current broker server. If next job is same server → skip login() step (~2s saved):
  ```python
  if current_server == next_account.mt5_server:
      # Same broker, different account — just re-login
      mt5.login(next_account.login, next_account.password, next_account.server)
  else:
      # Different broker — full login (slightly slower server switch)
      mt5.login(next_account.login, next_account.password, next_account.server)
      current_server = next_account.mt5_server
  ```
  NOTE: `mt5.login()` always re-authenticates, but same-server is ~2s faster than different-server

### Step 3.7 — Market Data Worker (`market_data_worker.py`)
- [ ] Runs as Worker #4, logged into FREE demo account permanently
- [ ] Logic:
  ```
  1. Initialize MT5 terminal #4
  2. Login to demo account (stays logged in)
  3. Main loop (every 30 seconds):
     a. Query hot_symbols table for active symbols
     b. For each symbol + each timeframe (M30, H1, H4, D1, W1):
        - Get last cached candle timestamp from DB
        - If no cache: fetch 6 months history
          mt5.copy_rates_range(symbol, timeframe, 6_months_ago, now)
        - If cache exists: fetch only new candles
          mt5.copy_rates_range(symbol, timeframe, last_cached + 1, now)
        - Upsert new candles to candle_cache table
        - Update Redis: latest candle for instant access
     c. Push candle updates to WebSocket subscribers:
        {type: CANDLE_UPDATE, symbol, timeframe, candle}
     d. Clean up cold symbols (no active positions for 7+ days):
        Remove from hot_symbols (keep candle data in DB)
  ```

### Step 3.8 — Weekend Mode
- [ ] Implement schedule check in scheduler:
  ```python
  def is_market_open():
      now = datetime.utcnow()
      # Forex market: Sun 22:00 UTC → Fri 22:00 UTC
      weekday = now.weekday()  # Mon=0, Sun=6
      hour = now.hour
      if weekday == 4 and hour >= 22:  # Friday after 22:00
          return False
      if weekday == 5:  # Saturday
          return False
      if weekday == 6 and hour < 22:  # Sunday before 22:00
          return False
      return True
  ```
- [ ] When market closed:
  - Reduce to 1 active worker
  - Sync interval: 30 minutes (for after-hours instruments like crypto on some brokers)
  - Market data worker: pause candle updates
  - Show banner on frontend: "Forex market closed. Live sync paused."

### Step 3.9 — Supervisor Configuration
- [ ] Create `/etc/supervisor/conf.d/rawjournal.conf`:
  ```ini
  [program:sync-scheduler]
  command=/opt/rawjournal/venv/bin/uvicorn scheduler:app --host 0.0.0.0 --port 8080
  directory=/opt/rawjournal/sync-engine
  user=rawjournal
  autostart=true
  autorestart=true
  stderr_logfile=/var/log/rawjournal/scheduler.err.log
  stdout_logfile=/var/log/rawjournal/scheduler.out.log
  environment=DISPLAY=":99",WINEPREFIX="/opt/mt5/worker_1"

  [program:trade-worker-1]
  command=/opt/rawjournal/venv/bin/python trade_worker.py --worker-id=1
  directory=/opt/rawjournal/sync-engine
  user=rawjournal
  autostart=true
  autorestart=true
  stderr_logfile=/var/log/rawjournal/worker1.err.log
  stdout_logfile=/var/log/rawjournal/worker1.out.log
  environment=DISPLAY=":99",WINEPREFIX="/opt/mt5/worker_1"

  [program:trade-worker-2]
  command=/opt/rawjournal/venv/bin/python trade_worker.py --worker-id=2
  directory=/opt/rawjournal/sync-engine
  environment=DISPLAY=":99",WINEPREFIX="/opt/mt5/worker_2"
  user=rawjournal
  autostart=true
  autorestart=true
  stderr_logfile=/var/log/rawjournal/worker2.err.log
  stdout_logfile=/var/log/rawjournal/worker2.out.log

  [program:trade-worker-3]
  command=/opt/rawjournal/venv/bin/python trade_worker.py --worker-id=3
  directory=/opt/rawjournal/sync-engine
  environment=DISPLAY=":99",WINEPREFIX="/opt/mt5/worker_3"
  user=rawjournal
  autostart=true
  autorestart=true
  stderr_logfile=/var/log/rawjournal/worker3.err.log
  stdout_logfile=/var/log/rawjournal/worker3.out.log

  [program:market-data-worker]
  command=/opt/rawjournal/venv/bin/python market_data_worker.py
  directory=/opt/rawjournal/sync-engine
  environment=DISPLAY=":99",WINEPREFIX="/opt/mt5/worker_4"
  user=rawjournal
  autostart=true
  autorestart=true
  stderr_logfile=/var/log/rawjournal/market-data.err.log
  stdout_logfile=/var/log/rawjournal/market-data.out.log
  ```
- [ ] Start all: `supervisorctl reread && supervisorctl update && supervisorctl start all`

### Step 3.10 — Health Monitoring
- [ ] Each worker reports health to Redis every 10s:
  ```python
  redis.hset(f'worker:{worker_id}:health', mapping={
      'status': 'running',
      'terminal_alive': True,
      'accounts_synced_last_hour': count,
      'current_account': account_id or 'idle',
      'last_error': error_msg or None,
      'uptime_hours': uptime,
      'cycles_since_restart': cycles
  })
  ```
- [ ] Scheduler monitors worker health:
  - If worker health not updated in 30s → mark as dead
  - If terminal_alive = False → attempt restart
  - Alert admin (log + optional webhook/email)

### ✅ Phase 3 Verification
- [ ] All 4 MT5 terminals start under Wine headless
- [ ] Worker connects to test MT5 demo account via mt5.login()
- [ ] history_deals_get() returns trade data from demo account
- [ ] Worker switches between 2 different accounts (login/sync/login/sync)
- [ ] Scheduler: WebSocket connects, user marked ACTIVE
- [ ] Scheduler: WebSocket disconnects, 5-min grace starts
- [ ] Scheduler: grace expires, user removed from sync queue
- [ ] Market data worker: candles appear in candle_cache table
- [ ] Market data worker: hot_symbols updated based on open positions
- [ ] Supervisor: all processes running, auto-restart on crash
- [ ] Broker grouping: same-server accounts synced consecutively
- [ ] Weekend mode: workers reduce activity during market close

---

## Phase 4 — Frontend Foundation

> **Goal:** Next.js app with auth, layout, routing, dark theme, WebSocket connection.
> **Duration:** 3-4 days
> **Depends on:** Phase 1 (Node.js) + Phase 2 (Auth tables)

### Step 4.1 — Initialize Next.js Project
- [ ] Create project:
  ```bash
  cd /opt/rawjournal
  npx create-next-app@14 frontend --typescript --tailwind --eslint --app --src-dir
  cd frontend
  ```
- [ ] Install core dependencies:
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  npm install zustand react-hook-form @hookform/resolvers zod
  npm install date-fns papaparse browser-image-compression
  npm install react-toastify sonner
  npm install lightweight-charts
  npm install lucide-react class-variance-authority clsx tailwind-merge
  npm install @tanstack/react-table
  ```
- [ ] Install shadcn/ui: `npx shadcn@latest init` (dark theme, slate coloring)
- [ ] Add shadcn components:
  ```bash
  npx shadcn@latest add button card input label select textarea
  npx shadcn@latest add dialog dropdown-menu popover separator
  npx shadcn@latest add table tabs badge avatar toast
  npx shadcn@latest add form calendar sheet command
  ```

### Step 4.2 — Folder Structure
```
/src
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx              # Auth layout (centered card)
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout (sidebar + header)
│   │   ├── page.tsx                # Dashboard overview (redirects to /dashboard)
│   │   ├── dashboard/page.tsx      # Analytics dashboard
│   │   ├── trades/
│   │   │   ├── page.tsx            # Trade list
│   │   │   ├── [id]/page.tsx       # Single trade detail + journal
│   │   │   ├── add/page.tsx        # Manual trade entry
│   │   │   └── import/page.tsx     # CSV/JSON import
│   │   ├── accounts/
│   │   │   ├── page.tsx            # List connected accounts
│   │   │   └── connect/page.tsx    # Connect MT5 account
│   │   ├── journal/page.tsx        # Journal entries list
│   │   ├── charts/
│   │   │   └── [symbol]/page.tsx   # TradingView chart for symbol
│   │   └── settings/
│   │       ├── page.tsx            # Profile settings
│   │       ├── subscription/page.tsx # Manage subscription
│   │       └── tags/page.tsx       # Manage tags
│   ├── api/
│   │   ├── accounts/
│   │   │   └── connect/route.ts    # Connect MT5 account (server-side)
│   │   ├── trades/
│   │   │   ├── import/route.ts     # CSV import processing
│   │   │   └── analytics/route.ts  # Compute analytics
│   │   ├── charts/
│   │   │   └── [symbol]/route.ts   # Fetch candle data
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts   # Create checkout session
│   │   │   └── webhook/route.ts    # Stripe webhook handler
│   │   └── cron/
│   │       └── monthly-reset/route.ts  # Reset free tier trade counts
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind + dark theme
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx             # Main navigation sidebar
│   │   ├── header.tsx              # Top header with user info + sync status
│   │   └── mobile-nav.tsx          # Mobile bottom navigation
│   ├── charts/
│   │   ├── equity-curve.tsx        # Recharts line chart
│   │   ├── calendar-heatmap.tsx    # Daily P&L heatmap
│   │   ├── pnl-bar-chart.tsx       # P&L by symbol/session
│   │   ├── win-rate-donut.tsx      # Win rate visualization
│   │   └── trading-chart.tsx       # TradingView Lightweight Charts wrapper
│   ├── trades/
│   │   ├── trade-table.tsx         # TanStack Table for trade list
│   │   ├── trade-form.tsx          # Manual trade entry form
│   │   ├── trade-card.tsx          # Trade summary card
│   │   ├── open-positions.tsx      # Live open positions widget
│   │   └── trade-notification.tsx  # Toast for new synced trades
│   ├── journal/
│   │   ├── journal-editor.tsx      # Notes + tags + mood + screenshots
│   │   └── screenshot-upload.tsx   # Image upload with compression
│   ├── accounts/
│   │   ├── account-card.tsx        # Account status card
│   │   └── connect-form.tsx        # MT5 connection form
│   └── dashboard/
│       ├── stats-cards.tsx         # Top metric cards (P&L, win rate, etc.)
│       └── session-breakdown.tsx   # Session performance breakdown
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   ├── server.ts              # Server-side Supabase client
│   │   └── middleware.ts          # Auth middleware
│   ├── utils/
│   │   ├── calculations.ts       # P&L, win rate, profit factor, etc.
│   │   ├── csv-parser.ts         # CSV/JSON import parsing
│   │   ├── format.ts             # Number/date/currency formatting
│   │   └── session.ts            # Forex session detection
│   └── constants.ts              # App constants, forex pairs list, etc.
├── hooks/
│   ├── use-auth.ts               # Auth state hook
│   ├── use-sync.ts               # WebSocket sync connection hook
│   ├── use-trades.ts             # Fetch/filter trades
│   ├── use-analytics.ts          # Fetch analytics data
│   ├── use-candles.ts            # Fetch chart candle data
│   └── use-subscription.ts      # Check subscription tier/limits
├── stores/
│   ├── auth-store.ts             # Zustand: user + profile state
│   ├── sync-store.ts             # Zustand: sync status, open positions
│   └── trade-store.ts            # Zustand: active filters, selected account
├── types/
│   └── index.ts                  # TypeScript types for all entities
└── middleware.ts                  # Next.js middleware (auth redirect)
```

### Step 4.3 — Dark Theme Configuration
- [ ] Configure `tailwind.config.ts`:
  - Force dark mode: `darkMode: 'class'`
  - Custom colors: dark backgrounds (#0a0a0f, #111118, #1a1a24), accent (indigo/violet)
  - Trading-specific colors: profit green (#22c55e), loss red (#ef4444)
- [ ] Configure `globals.css` with dark-only CSS variables
- [ ] Add `<html className="dark">` to root layout

### Step 4.4 — Authentication Pages
- [ ] Login page: email + password form, Supabase `signInWithPassword()`
- [ ] Signup page: name + email + password, Supabase `signUp()`, email verification
- [ ] Reset password page: email input, Supabase `resetPasswordForEmail()`
- [ ] Middleware: redirect unauthenticated users to `/login`, redirect authenticated from `/login` to `/dashboard`

### Step 4.5 — Dashboard Layout
- [ ] Collapsible sidebar with navigation:
  - Dashboard (analytics overview)
  - Trades (list + import)
  - Accounts (connected MT5)
  - Journal (entries)
  - Charts (market view)
  - Settings (profile, subscription, tags)
- [ ] Top header:
  - Account selector dropdown (switch between linked accounts)
  - Sync status indicator (green dot = syncing, yellow = grace, red = disconnected)
  - User avatar + dropdown (profile, logout)
- [ ] Mobile: bottom tab navigation (Dashboard, Trades, Journal, More)

### Step 4.6 — WebSocket Sync Hook (`use-sync.ts`)
- [ ] On dashboard mount: connect WebSocket to `wss://ws.rawjournal.pro/ws`
- [ ] Send auth token on connect
- [ ] Handle incoming messages:
  ```typescript
  type SyncMessage =
    | { type: 'POSITION_UPDATE'; data: OpenPosition[] }
    | { type: 'NEW_TRADE'; data: { symbol: string; pnl: number; pips: number } }
    | { type: 'BALANCE_UPDATE'; data: { balance: number; equity: number } }
    | { type: 'CANDLE_UPDATE'; data: { symbol: string; timeframe: string; candle: OHLCV } }
    | { type: 'SYNC_STATUS'; data: { status: 'syncing' | 'success' | 'error'; message?: string } }
    | { type: 'MARKET_CLOSED'; data: { message: string } }
  ```
- [ ] On `POSITION_UPDATE`: update Zustand sync store → re-render open positions widget
- [ ] On `NEW_TRADE`: show toast notification, invalidate trades query
- [ ] On `CANDLE_UPDATE`: update live chart
- [ ] Reconnect logic: if WebSocket drops, retry with exponential backoff (1s, 2s, 4s, max 30s)
- [ ] On unmount (tab close): WebSocket auto-closes → server starts grace timer

### Step 4.7 — PM2 Deployment
- [ ] Build: `npm run build`
- [ ] Start with PM2:
  ```bash
  pm2 start npm --name "rawjournal-frontend" -- start
  pm2 save
  pm2 startup
  ```

### ✅ Phase 4 Verification
- [ ] `https://rawjournal.pro` shows login page
- [ ] Signup creates user + profile in Supabase
- [ ] Login redirects to dashboard
- [ ] Sidebar navigation works on desktop
- [ ] Mobile responsive: bottom tabs + hamburger menu
- [ ] Dark theme applied everywhere (no white flashes)
- [ ] WebSocket connects on dashboard load, shows sync status
- [ ] WebSocket reconnects after intentional disconnect
- [ ] Middleware redirects unauthenticated users correctly

---

## Phase 5 — Trade Management

> **Goal:** Manual trade entry, CSV import, trade list, trade detail page.
> **Duration:** 4-5 days
> **Depends on:** Phase 4 (frontend foundation)

### Step 5.1 — Manual Trade Entry Form
- [ ] Route: `/trades/add`
- [ ] Form fields (React Hook Form + Zod validation):
  - Account selector (from user's linked accounts; or "Manual Account" for free tier)
  - Symbol (searchable combobox with common forex pairs)
  - Direction (Buy / Sell toggle)
  - Entry date + time (datetime picker)
  - Entry price (decimal input)
  - Exit date + time (optional — leave blank for open trade)
  - Exit price (optional)
  - Lot size (decimal, 0.01 - 100)
  - Stop loss (optional)
  - Take profit (optional)
  - Commission (optional, default 0)
  - Swap (optional, default 0)
- [ ] Auto-calculate P&L when exit price entered:
  ```typescript
  function calculatePnL(direction, entryPrice, exitPrice, lotSize, symbol) {
    const pipSize = symbol.includes('JPY') ? 0.01 : 0.0001;
    const pips = (exitPrice - entryPrice) / pipSize * (direction === 'buy' ? 1 : -1);
    const pipValue = symbol.includes('JPY') ? lotSize * 1000 * 0.01 : lotSize * 100000 * pipSize;
    return { pnl: pips * pipValue / 10, pips };
  }
  ```
- [ ] Free tier check: if `trade_count_this_month >= 15`, show upgrade prompt
- [ ] On submit: insert to `trades` table, increment `trade_count_this_month`, redirect to trade detail

### Step 5.2 — CSV Import
- [ ] Route: `/trades/import`
- [ ] File dropzone: accept `.csv`, `.json` files
- [ ] Parse CSV with PapaParse (client-side):
  1. Auto-detect format by checking column headers:
     - MT5: "Deal", "Time", "Type", "Symbol", "Volume", "Price", "Profit"
     - Generic: prompt user to map columns
  2. Show preview table (first 10 rows)
  3. Column mapping UI: dropdowns to map CSV columns to trade fields
  4. Validate all rows: date format, number fields, required fields
  5. Show validation summary: `247 valid, 3 errors (row 12: invalid date, ...)`
- [ ] Duplicate detection: check `ticket_number + entry_timestamp` against existing trades
- [ ] Import:
  - Free tier: reject if would exceed 15 trades/month
  - Send validated rows to API route `/api/trades/import`
  - Batch insert (100 at a time) to Supabase
  - Show progress: "Importing... 120/247"
  - Summary: "247 imported, 12 duplicates skipped, 3 errors"
- [ ] Support JSON import: expect array of trade objects matching schema

### Step 5.3 — Trade List Page
- [ ] Route: `/trades`
- [ ] TanStack Table with columns:
  - Date (exit_timestamp, formatted)
  - Symbol (with currency pair icon/badge)
  - Direction (green "BUY" / red "SELL" badge)
  - Lot Size
  - Entry Price
  - Exit Price
  - P&L (green/red colored, with pip count)
  - Session (Asian/London/NY badge)
  - Journal (icon: filled if journal exists, empty if not)
  - Actions (View, Edit, Delete)
- [ ] Filters bar:
  - Account selector (all accounts or specific)
  - Date range picker (today, this week, this month, custom)
  - Symbol search
  - Direction filter (all, buy, sell)
  - Session filter (all, asian, london, overlap, newyork)
  - Status filter (all, open, closed)
  - Sort by: date, P&L, symbol
- [ ] Pagination: 50 trades per page, infinite scroll on mobile
- [ ] Store filters in URL query params: `?account=uuid&from=2026-01-01&symbol=EURUSD`

### Step 5.4 — Trade Detail Page
- [ ] Route: `/trades/[id]`
- [ ] Display:
  - Trade header: symbol, direction, P&L (large), status badge
  - Trade metrics card: entry/exit prices, lot size, duration, R-multiple, risk/reward
  - TradingView chart: show candles for this symbol, overlay entry/exit markers, SL/TP lines
  - Journal section (Phase 7)
- [ ] Edit button: open form to modify trade details (for manual trades only, not MT5 synced)
- [ ] Delete button: confirm dialog, cascade delete journal

### Step 5.5 — Open Positions Widget
- [ ] Component on dashboard: show live open positions from sync
- [ ] Columns: Symbol, Direction, Lot Size, Entry Price, Current Price, Floating P&L
- [ ] Updates in real-time via WebSocket `POSITION_UPDATE` messages
- [ ] Click position → navigate to chart for that symbol

### ✅ Phase 5 Verification
- [ ] Manual trade entry: submit → appears in trade list
- [ ] Auto-calculated P&L matches expected values (test with EURUSD and USDJPY)
- [ ] Free tier: blocked after 15 trades, upgrade prompt shown
- [ ] CSV import: MT5 format auto-detected, all trades imported correctly
- [ ] CSV import: duplicates detected and skipped
- [ ] Trade list: sorting, filtering, pagination all functional
- [ ] Trade detail: displays all trade info + chart with markers
- [ ] Open positions widget: updates live without page refresh

---

## Phase 6 — Analytics & Charts

> **Goal:** Dashboard analytics, equity curves, calendar heatmap, session breakdown, TradingView charts.
> **Duration:** 5-6 days
> **Depends on:** Phase 5 (trades exist in DB)

### Step 6.1 — Analytics Computation API
- [ ] Route: `GET /api/trades/analytics?account_id=...&period=...`
- [ ] Logic:
  1. Check `analytics_cache` table first
  2. If cache exists and not stale → return cached
  3. If no cache → compute from trades:
     ```typescript
     const trades = await supabase.from('trades')
       .select('*').eq('user_id', userId).eq('status', 'closed');
     // Calculate: win rate, profit factor, avg win/loss, max drawdown, etc.
     ```
  4. Store result in `analytics_cache`
  5. Return computed analytics

### Step 6.2 — Dashboard Stats Cards
- [ ] Top row of dashboard: 6-8 metric cards
  - Total P&L (all time)
  - Win Rate %
  - Profit Factor
  - Total Trades
  - Average Win / Average Loss
  - Max Drawdown
  - Best Trade / Worst Trade
  - Consecutive Wins / Losses
- [ ] Each card: value, percentage change vs previous period, mini sparkline
- [ ] Period selector: Today, This Week, This Month, This Year, All Time

### Step 6.3 — Equity Curve Chart
- [ ] Component: `equity-curve.tsx` using Recharts AreaChart
- [ ] Data: cumulative P&L over time (from closed trades sorted by exit_timestamp)
- [ ] Features:
  - Gradient fill (green if positive, red if negative)
  - Hover tooltip: date, equity value, trade count
  - Zoom: date range brush selector
  - Overlay: mark drawdown periods in red

### Step 6.4 — Calendar Heatmap
- [ ] Component: `calendar-heatmap.tsx`
- [ ] Data: daily P&L aggregated from trades
- [ ] Color scale:
  - Dark green: >$100 profit
  - Light green: $1-100 profit
  - Gray: no trades
  - Light red: $1-100 loss
  - Dark red: >$100 loss
- [ ] Click day → show trades for that day
- [ ] Show: last 12 months, scrollable

### Step 6.5 — P&L Breakdown Charts
- [ ] P&L by Symbol (Recharts BarChart): horizontal bars, sorted by P&L
- [ ] P&L by Session (Recharts BarChart): Asian, London, Overlap, New York
- [ ] P&L by Day of Week (Recharts BarChart): Monday through Friday
- [ ] P&L by Hour of Day (Recharts BarChart): 24 bars
- [ ] Win Rate by Symbol (similar to above)
- [ ] Trade Duration Distribution (histogram)

### Step 6.6 — Session Breakdown Component
- [ ] Dedicated section: "Session Performance"
- [ ] Cards for each session (Asian, London, Overlap, New York):
  - Trade count
  - Win rate
  - Total P&L
  - Average P&L per trade
  - Best/Worst trade
- [ ] Highlight best and worst sessions

### Step 6.7 — TradingView Lightweight Charts Integration
- [ ] Component: `trading-chart.tsx`
- [ ] Setup:
  ```typescript
  import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

  const chart = createChart(containerRef.current, {
    width: containerWidth,
    height: 500,
    layout: { background: { color: '#0a0a0f' }, textColor: '#a1a1aa' },
    grid: { vertLines: { color: '#1a1a24' }, horzLines: { color: '#1a1a24' } },
    timeScale: { timeVisible: true, borderColor: '#2a2a34' },
  });

  const candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e', downColor: '#ef4444',
    borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ef4444'
  });
  ```
- [ ] Load candle data from API: `GET /api/charts/EURUSD?timeframe=H1&from=...&to=...`
- [ ] Timeframe selector: 30m, 1H, 4H, Daily, Weekly
- [ ] Trade markers overlay:
  ```typescript
  // Add entry marker
  candleSeries.setMarkers([{
    time: trade.entry_timestamp,
    position: trade.direction === 'buy' ? 'belowBar' : 'aboveBar',
    color: trade.direction === 'buy' ? '#22c55e' : '#ef4444',
    shape: trade.direction === 'buy' ? 'arrowUp' : 'arrowDown',
    text: `${trade.direction.toUpperCase()} ${trade.position_size} lots`
  }]);
  ```
- [ ] SL/TP lines: horizontal lines at stop_loss and take_profit prices
- [ ] Live updates: WebSocket `CANDLE_UPDATE` messages update the last candle
- [ ] Standalone chart page: `/charts/[symbol]` — full-screen chart with all user's trades for that symbol overlaid

### Step 6.8 — Live Price Ticker
- [ ] Component in header/sidebar: show current prices for user's open position symbols
- [ ] Data from Worker sync (current_price in open_positions table)
- [ ] Updates every 15s (on sync)
- [ ] Show: symbol, price, daily change %, small sparkline

### ✅ Phase 6 Verification
- [ ] Dashboard loads with all metric cards populated
- [ ] Equity curve renders correctly, zoom works
- [ ] Calendar heatmap: green/red days match actual P&L
- [ ] All breakdown charts render with correct data
- [ ] Session tags applied correctly (verify against known trade times)
- [ ] TradingView chart: candles load from cache, trade markers overlay correctly
- [ ] Live chart updates: new candle appears without refresh
- [ ] Price ticker shows current prices for open positions
- [ ] Performance: dashboard loads in <2s with 500 trades

---

## Phase 7 — Journaling System

> **Goal:** Rich journaling with notes, tags, mood, screenshots, quick journal from notification.
> **Duration:** 3-4 days
> **Depends on:** Phase 5 (trade detail page)

### Step 7.1 — Journal Editor Component
- [ ] Integrated into trade detail page (`/trades/[id]`)
- [ ] Fields:
  - **Notes**: Textarea (or Tiptap rich text editor if desired later)
  - **Tags**: Multi-select pills from user's tag list + inline "create new tag"
  - **Mood**: Radio group (Confident, Uncertain, Fearful, Neutral, Greedy, Disciplined)
  - **Setup Quality**: Star rating (1-5)
  - **Followed Plan**: Yes/No toggle
  - **Screenshots**: Upload area (drag & drop, max 5 images)
- [ ] Auto-save: debounced save 2 seconds after last edit (no save button needed)
- [ ] Show: "Saved ✓" indicator after auto-save

### Step 7.2 — Screenshot Upload
- [ ] Client-side image compression: `browser-image-compression` (max 1MB, max 1920px width)
- [ ] Upload to Supabase Storage: `trade-screenshots` bucket
- [ ] Path: `{user_id}/{trade_id}/{filename}`
- [ ] Show thumbnails after upload, click to open full-size
- [ ] Delete button per screenshot

### Step 7.3 — Tags Management
- [ ] Settings page: `/settings/tags`
- [ ] List user's tags with color dots
- [ ] Add tag: name input + color picker
- [ ] Edit/delete tags
- [ ] Predefined starter tags on signup:
  - "Breakout", "Trend Following", "Range", "News", "Reversal", "Scalp", "Swing"
- [ ] Tag usage count shown next to each tag

### Step 7.4 — Quick Journal from Trade Notification
- [ ] When `NEW_TRADE` WebSocket message received:
  - Toast notification: "EURUSD Buy closed +$47.50 (+23 pips)"
  - Toast has "Add Notes" button
  - Click → opens slide-over panel with journal editor for that trade
  - User can quickly add notes/tags/mood without leaving current page

### Step 7.5 — Journal List Page
- [ ] Route: `/journal`
- [ ] Timeline view: list of journal entries sorted by trade date
- [ ] Each entry shows: trade summary (symbol, P&L), notes preview, tags, mood emoji, screenshot thumbnail
- [ ] Filter by: tag, mood, date range, symbol
- [ ] Search: full-text search through notes

### ✅ Phase 7 Verification
- [ ] Journal saves and loads correctly for a trade
- [ ] Auto-save works (edit notes, wait 2s, refresh → notes persist)
- [ ] Screenshots upload, compress, display, delete correctly
- [ ] Tags can be created, applied, filtered
- [ ] Quick journal from notification opens correct trade
- [ ] Journal list page filters and searches work
- [ ] RLS: users cannot see other users' journals

---

## Phase 8 — Payments & Subscriptions

> **Goal:** Stripe integration, pricing page, subscription management, feature gating.
> **Duration:** 3-4 days
> **Depends on:** Phase 4 (auth + basic UI)

### Step 8.1 — Stripe Setup
- [ ] Create Stripe account (start in test mode)
- [ ] Create Products in Stripe Dashboard:
  - **RawJournal Pro**: $12.99/month (Price ID: `price_pro_monthly`)
  - **RawJournal Elite**: $30.00/month (Price ID: `price_elite_monthly`)
- [ ] Get API keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- [ ] Set webhook endpoint: `https://rawjournal.pro/api/stripe/webhook`
- [ ] Get webhook signing secret: `STRIPE_WEBHOOK_SECRET`
- [ ] Install: `npm install stripe @stripe/stripe-js`

### Step 8.2 — Checkout API Route
- [ ] `/api/stripe/checkout/route.ts`:
  ```typescript
  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: 'https://rawjournal.pro/settings/subscription?status=success',
    cancel_url: 'https://rawjournal.pro/settings/subscription?status=canceled',
    metadata: { user_id: user.id }
  });
  return redirect(session.url);
  ```

### Step 8.3 — Webhook Handler
- [ ] `/api/stripe/webhook/route.ts`:
  - Verify webhook signature
  - Handle events:
    - `checkout.session.completed` → set tier to pro/elite, save stripe_customer_id
    - `customer.subscription.updated` → update tier if plan changed
    - `customer.subscription.deleted` → downgrade to free
    - `invoice.payment_failed` → set status to past_due, email user

### Step 8.4 — Feature Gating
- [ ] Server-side utility (`lib/utils/subscription.ts`):
  ```typescript
  export function getFeatureLimits(tier: 'free' | 'pro' | 'elite') {
    return {
      maxAccounts: tier === 'elite' ? 5 : tier === 'pro' ? 1 : 1,
      maxTradesPerMonth: tier === 'free' ? 15 : Infinity,
      mt5SyncEnabled: tier !== 'free',
      csvImportEnabled: true,
      advancedAnalytics: tier !== 'free',
      prioritySync: tier === 'elite',
      sessionReplay: tier === 'elite',
    };
  }
  ```
- [ ] Apply limits:
  - Trade entry: check monthly count
  - Account connection: check account count
  - MT5 sync: only for paid tiers
  - Advanced analytics: gate certain charts for paid
- [ ] Upgrade prompts: show when limit hit, redirect to pricing

### Step 8.5 — Subscription Management Page
- [ ] Route: `/settings/subscription`
- [ ] Show: current plan, billing period, next payment date
- [ ] Upgrade/downgrade buttons
- [ ] Cancel subscription button (confirms, then downgrades at period end)
- [ ] Stripe Customer Portal link for invoice history

### Step 8.6 — Pricing Page (Public)
- [ ] Can be part of a simple landing page or within settings
- [ ] Three cards: Free, Pro ($12.99/mo), Elite ($30/mo)
- [ ] Feature comparison table
- [ ] CTA buttons → Stripe Checkout

### ✅ Phase 8 Verification
- [ ] Stripe test mode: create checkout → complete payment → tier updated in DB
- [ ] Webhook: subscription events correctly update user tier
- [ ] Feature gates: free user cannot add MT5 account, shown upgrade prompt
- [ ] Feature gates: free user blocked at 15 trades, shown upgrade prompt
- [ ] Subscription management: cancel → downgrades to free at period end
- [ ] Stripe Customer Portal accessible
- [ ] Test with Stripe test cards: `4242...`, `4000...` (decline)

---

## Phase 9 — Polish & Optimization

> **Goal:** Performance optimization, error handling, UX polish, responsive design.
> **Duration:** 3-4 days
> **Depends on:** Phases 5-8 complete

### Step 9.1 — Performance Optimization
- [ ] Database:
  - Run `EXPLAIN ANALYZE` on common queries, add missing indexes
  - Enable PostgreSQL query caching
  - Set up connection pooling (PgBouncer) if needed
- [ ] Frontend:
  - Dynamic imports for heavy components (charts, table)
  - Image optimization: `next/image` with width/height
  - Memoize expensive calculations with `useMemo`
- [ ] API:
  - Cache analytics responses (revalidate on trade change)
  - Cache candle data responses (revalidate every 30s)
- [ ] Assets:
  - Nginx gzip compression enabled
  - Static asset caching headers (1 year for hashed files)

### Step 9.2 — Error Handling & Edge Cases
- [ ] Network errors: show retry button, don't crash UI
- [ ] Empty states: "No trades yet" with CTA for import/entry/connect
- [ ] Loading states: skeleton loaders for all data-dependent components
- [ ] Form validation: inline error messages, prevent double submission
- [ ] MT5 connection errors: clear error messages with suggested actions
- [ ] Rate limiting: Nginx rate limit on API endpoints (100 req/min per IP)

### Step 9.3 — Mobile Responsiveness
- [ ] Test all pages on 375px width (iPhone SE)
- [ ] Charts: responsive width, touch-friendly
- [ ] Tables: horizontal scroll on mobile, or card view
- [ ] Forms: full-width inputs, large touch targets
- [ ] Navigation: bottom tabs, sheet-based menus

### Step 9.4 — Security Hardening
- [ ] CSRF protection on all form submissions
- [ ] Input sanitization (XSS prevention)
- [ ] Verify all API routes check authentication
- [ ] Verify all RLS policies working (test cross-user access)
- [ ] Set security headers in Nginx:
  ```nginx
  add_header X-Frame-Options "DENY";
  add_header X-Content-Type-Options "nosniff";
  add_header X-XSS-Protection "1; mode=block";
  add_header Strict-Transport-Security "max-age=31536000";
  add_header Content-Security-Policy "default-src 'self'; ...";
  ```

### Step 9.5 — Monitoring & Logging
- [ ] Frontend: error boundary components, console error capture
- [ ] Backend: structured logging in Python workers (JSON format)
- [ ] Uptime monitoring: UptimeRobot for `rawjournal.pro` (free tier)
- [ ] Disk space alerts: cron job to check, alert if >80%
- [ ] PostgreSQL slow query log: log queries >500ms

### ✅ Phase 9 Verification
- [ ] Lighthouse score: >80 on mobile
- [ ] All pages load in <2s on simulated slow 3G
- [ ] No console errors in production build
- [ ] Security headers present (check via securityheaders.com)
- [ ] Mobile: all pages usable on 375px screen
- [ ] Empty states display correctly
- [ ] Error states handled gracefully (show message, don't crash)

---

## Phase 10 — Testing & Launch

> **Goal:** Comprehensive testing, beta launch, monitoring.
> **Duration:** 3-5 days
> **Depends on:** All previous phases

### Step 10.1 — Testing Checklist

#### Authentication
- [ ] Signup → email verification → login → dashboard
- [ ] Password reset flow works end-to-end
- [ ] Session persists across page refreshes
- [ ] Logout clears session completely

#### MT5 Sync
- [ ] Connect MT5 demo account → full historical sync completes
- [ ] Open position appears on dashboard within 15s
- [ ] Close position in MT5 → trade appears in RawJournal within 60s
- [ ] Tab close → grace period → sync stops (verify in server logs)
- [ ] Return after grace → catch-up sync fetches missed trades
- [ ] Invalid credentials → clear error message, account not created
- [ ] Broker grouping: monitor sync logs, same-broker accounts processed consecutively

#### Trade Management
- [ ] Manual trade entry: all fields validate, P&L calculates correctly
- [ ] CSV import: MT5 format auto-detected, 100+ trades import successfully
- [ ] Duplicate detection: re-importing same CSV shows "X duplicates skipped"
- [ ] Trade list: filter by all criteria, sort by all columns
- [ ] Trade edit and delete work correctly

#### Analytics
- [ ] Dashboard metrics match manual calculation from trade data
- [ ] Equity curve: plot matches cumulative P&L
- [ ] Calendar heatmap: click day, trades shown match
- [ ] Session breakdown: trades correctly categorized
- [ ] Analytics update after new trade import

#### Charts
- [ ] Candle data loads for all 5 timeframes
- [ ] Trade markers positioned correctly on chart
- [ ] Live candle updates via WebSocket
- [ ] Chart responsive on mobile

#### Journaling
- [ ] Add notes, tags, screenshots to trade
- [ ] Auto-save persists on page refresh
- [ ] Screenshots upload and display correctly
- [ ] Quick journal from notification works

#### Payments
- [ ] Stripe checkout → subscription active → features unlocked
- [ ] Cancel → features locked at period end
- [ ] Free tier limits enforced (15 trades, no MT5 sync)

#### Security
- [ ] User A cannot access User B's data (test direct API calls)
- [ ] User A cannot access User B's screenshots
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] Invalid JWT tokens rejected

### Step 10.2 — Load Testing
- [ ] Simulate 20 concurrent WebSocket connections
- [ ] Simulate 50 concurrent API requests
- [ ] Monitor: CPU, RAM, response times during load
- [ ] Identify bottlenecks: database queries, worker throughput

### Step 10.3 — Beta Launch
- [ ] Invite 10-20 beta users
- [ ] Create feedback channel (Telegram group, Discord, or email)
- [ ] Monitor server logs daily for first 2 weeks
- [ ] Track: signup count, active users, sync success rate, error rate
- [ ] Fix critical bugs within 24 hours

### Step 10.4 — Production Hardening
- [ ] Switch Stripe to live mode
- [ ] Enable Supabase email rate limiting
- [ ] Configure fail2ban for SSH brute force protection
- [ ] Document recovery procedures (backup restore, service restart)
- [ ] Create admin dashboard or monitoring script for:
  - Active users count
  - Worker health
  - Sync queue depth
  - Error rates
  - Disk/RAM/CPU usage

### ✅ Phase 10 Verification
- [ ] All testing checklist items pass
- [ ] Load test: 20 concurrent users, <3s response times
- [ ] Beta users can: signup → connect MT5 → see synced trades → view analytics
- [ ] No data leaks between users
- [ ] Stripe live mode working
- [ ] Backups verified restorable
- [ ] Monitoring in place and alerting works

---

## Verification Checklist

### End-to-End User Journey (Must all pass before launch)

```
[ ] 1. User visits rawjournal.pro → sees login page
[ ] 2. Signs up with email → receives verification email → verifies
[ ] 3. Logs in → redirected to dashboard (empty state)
[ ] 4. Free tier: adds manual trade → appears in trade list
[ ] 5. Free tier: imports CSV → trades imported → analytics populated
[ ] 6. Free tier: hits 15 trade limit → upgrade prompt shown
[ ] 7. Upgrades to Pro via Stripe → payment succeeds → tier updated
[ ] 8. Connects MT5 account (investor password) → connection succeeds
[ ] 9. Full historical sync runs → all past trades imported
[ ] 10. Dashboard: equity curve, calendar, all charts render
[ ] 11. Open position appears on dashboard (live P&L updating)
[ ] 12. Closes trade in MT5 → trade appears in RawJournal within 60s
[ ] 13. Toast notification: "EURUSD +$47.50" → clicks "Add Notes"
[ ] 14. Adds journal entry with tags, mood, screenshot → saves
[ ] 15. Views chart: candles load, trade entry/exit markers visible
[ ] 16. Changes timeframe → chart updates with new candle data
[ ] 17. Closes browser tab → sync continues for 5 min → then stops
[ ] 18. Returns next day → catch-up sync imports missed trades
[ ] 19. Session breakdown: trades correctly tagged Asian/London/NY
[ ] 20. Mobile: all above works on phone browser
```

---

## Cost Summary

### Monthly Operating Costs

| Item | Cost |
|------|------|
| Hostinger KVM2 VPS | Already owned |
| Domain (rawjournal.pro) | ~$1/mo (paid annually) |
| Resend email (free tier) | $0 (up to 3,000 emails/mo) |
| Stripe fees | 2.9% + $0.30 per transaction |
| SSL (Let's Encrypt) | $0 |
| MetaApi | $0 (not used) |
| **Total fixed** | **~$1/month** |

### Revenue Projections

| Users | Free | Pro ($12.99) | Elite ($30) | Monthly Revenue |
|-------|------|-------------|-------------|-----------------|
| 50    | 40   | 8           | 2           | $164            |
| 200   | 140  | 45          | 15          | $1,035          |
| 500   | 350  | 110         | 40          | $2,629          |
| 1000  | 650  | 250         | 100         | $6,248          |

### Development Timeline

| Phase | Duration | Running Total |
|-------|----------|---------------|
| Phase 1: Infrastructure | 2-3 days | Week 1 |
| Phase 2: Core Backend | 2-3 days | Week 1 |
| Phase 3: MT5 Sync Engine | 5-7 days | Week 2-3 |
| Phase 4: Frontend Foundation | 3-4 days | Week 3-4 |
| Phase 5: Trade Management | 4-5 days | Week 4-5 |
| Phase 6: Analytics & Charts | 5-6 days | Week 5-6 |
| Phase 7: Journaling | 3-4 days | Week 7 |
| Phase 8: Payments | 3-4 days | Week 7-8 |
| Phase 9: Polish | 3-4 days | Week 8-9 |
| Phase 10: Testing & Launch | 3-5 days | Week 9-10 |
| **Total** | **~10 weeks** | |

---

## Scaling Roadmap (Post-Launch)

| Milestone | Action |
|-----------|--------|
| 30+ concurrent users | Upgrade KVM2 → KVM4 (add Worker 5) |
| 50+ concurrent users | Upgrade to KVM8 (add Workers 6-8) |
| cTrader demand | Add cTrader REST API integration (zero VPS cost) |
| MT4 demand | Add MT4 EA bridge option |
| Mobile app demand | React Native app (reuse API layer) |
| 1000+ users | Separate VPS: 1 for app, 1 for MT5 workers |
| AI features | Trade pattern detection, AI journal suggestions |
