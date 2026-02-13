# RawJournal — Hostinger VPS + Coolify Deployment Guide

## Architecture Overview

```
Hostinger KVM2 VPS (Ubuntu 22.04)
├── Coolify (manages all services)
│   ├── Supabase (PostgreSQL + Auth + Storage)
│   ├── Next.js Frontend
│   └── MT5 Workers (Docker Compose)
└── Nginx (auto-configured by Coolify for SSL + reverse proxy)
```

---

## Part 1: Initial VPS Setup

### 1.1 Access Your Hostinger VPS

**Via Hostinger Panel:**
1. Log into [hostinger.com](https://hostinger.com)
2. Navigate to: **VPS** → Select your KVM2 server → **Overview**
3. Note your:
   - **IP Address:** `XXX.XXX.XXX.XXX`
   - **Root Password:** (visible in panel, or reset if needed)

**Via SSH (from your local machine):**
```powershell
ssh root@YOUR_VPS_IP
# Enter root password when prompted
```

### 1.2 Install Coolify (one-time setup)

```bash
# On VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Wait 2-5 minutes for installation to complete.

### 1.3 Access Coolify

Open browser: `http://YOUR_VPS_IP:8000`

**First time:**
- Create admin account (email + password)
- This becomes your Coolify dashboard login

---

## Part 2: Deploy Supabase

### 2.1 Create Supabase Service in Coolify

In Coolify dashboard:
1. Click **+ New** (top right)
2. Select **Service** (not Resource or Database)
3. Select **Supabase** from the service list
4. Configure:
   - **Name:** `rawjournal-supabase`
   - **Destination:** Select your server
   - **Domain:** `api.rawjournal.pro` (or leave empty for now)
   - **Environment:** Keep defaults (it auto-generates secure passwords)

5. Click **Deploy**

**Wait 3-5 minutes** — Supabase will:
- Pull ~6 Docker images (PostgreSQL, PostgREST, GoTrue, Storage, etc.)
- Start all containers
- Auto-configure Nginx reverse proxy (if domain set)

### 2.2 Access Supabase Studio

In Coolify:
- Go to **Services** → `rawjournal-supabase`
- Look for **Supabase Studio** link (usually port 3000)
- Click to open Studio UI

**OR** manual access:
```
http://YOUR_VPS_IP:3000
```

### 2.3 Get Supabase Connection Details

In Supabase Studio:
1. Go to **Settings** (gear icon, bottom left)
2. Select **API**
3. Copy these values:

```
URL:           https://api.rawjournal.pro    (or http://YOUR_VPS_IP:8000)
anon key:      eyJh... (long JWT, starts with eyJ)
service_role:  eyJh... (different JWT, also starts with eyJ)
```

**Save these!** You'll need them in `.env` files.

### 2.4 Apply Database Schema

In Supabase Studio:
1. Click **SQL Editor** (left sidebar)
2. Click **+ New Query**
3. Open `supabase/migrations/001_initial_schema.sql` from your project
4. Copy entire file contents
5. Paste into SQL Editor
6. Click **Run** (or press F5)

You should see: ✅ Success message and all tables created.

**Verify:** Go to **Table Editor** → You should see tables: `profiles`, `accounts`, `trades`, `open_positions`, etc.

---

## Part 3: Deploy Next.js Frontend

### 3.1 Create Git Resource in Coolify

In Coolify dashboard:
1. Click **+ New**
2. Select **Resource → Git Repository**
3. Configure:

**Source:**
- **Git Provider:** GitHub (or manual Git URL)
- **Repository:** `yourusername/trading-journal` (or your repo URL)
- **Branch:** `main`

**Build Settings:**
- **Base Directory:** `web`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Ports:** `3000` (expose)

**Domain:**
- **Domain:** `rawjournal.pro`

**Environment Variables:** (click Add)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://api.rawjournal.pro
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...your-anon-key
NEXT_PUBLIC_WS_URL=wss://ws.rawjournal.pro
```

4. Click **Deploy**

Coolify will:
- Clone your repo
- Run `npm install && npm run build` in `web/` directory
- Start with `npm start`
- Auto-configure Nginx + SSL for `rawjournal.pro`

**Check logs:** In resource page → **Logs** tab (real-time build output)

---

## Part 4: Deploy MT5 Workers

### 4.1 Push Code to VPS

**Option A — Git clone on VPS (recommended for testing):**

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Clone repo
cd /opt
git clone https://github.com/yourusername/trading-journal.git rawjournal
cd rawjournal
```

**Option B — Use Coolify Git (for auto-updates):**
- Skip manual clone
- Coolify will clone the repo when you create the resource

### 4.2 Configure Environment Variables

```bash
# On VPS, in project directory
cd /opt/rawjournal
cp .env.example .env
nano .env
```

Fill in these values:
```bash
SUPABASE_URL=https://api.rawjournal.pro
SUPABASE_SERVICE_KEY=eyJh...your-service-role-key
REDIS_URL=redis://redis:6379
ENCRYPTION_KEY=paste-generated-key-here
```

**Generate encryption key:**
```bash
python3 -c "import os; print(os.urandom(32).hex())"
```

**Optional (for market data worker #4):**
```bash
DEMO_MT5_LOGIN=your-demo-account-number
DEMO_MT5_PASSWORD=your-demo-password
DEMO_MT5_SERVER=demo-server-name
```

Save and exit (`Ctrl+X`, `Y`, `Enter`)

### 4.3 Deploy via Coolify (Recommended)

**Option A — Coolify Docker Compose Service:**

In Coolify:
1. Click **+ New**
2. Select **Resource → Docker Compose**
3. Configure:
   - **Name:** `rawjournal-workers`
   - **Docker Compose Location:** Select **From Repository**
   - **Repository:** Your Git repo
   - **Compose File Path:** `docker/docker-compose.yml`
   - **Base Directory:** (root)
   - **Network:** `coolify` (default)

4. Add environment variables (same as above)
5. **Ports to expose:**
   - `8080:8080` (scheduler WebSocket)

6. Click **Deploy**

Coolify will:
- Clone repo
- Run `docker compose -f docker/docker-compose.yml up -d`
- Auto-configure Nginx for `ws.rawjournal.pro` → port 8080

### 4.4 OR Deploy Manually (Testing)

```bash
# On VPS
cd /opt/rawjournal

# Build and start (minimal: scheduler + 1 worker + redis)
bash docker/scripts/deploy.sh up-minimal

# Watch first startup (takes ~5 minutes first time)
bash docker/scripts/deploy.sh logs worker-1

# Check status
bash docker/scripts/deploy.sh status
```

**First startup stages:**
1. Wine prefix initialization (~30 sec)
2. Windows Python installation (~1 min)
3. MetaTrader5 + rpyc installation (~1 min)
4. MT5 terminal download (~2 min)
5. rpyc server start (~10 sec)
6. Worker ready ✅

**Subsequent startups:** ~15 seconds (Wine prefix persists on volume)

---

## Part 5: Domain Configuration

### 5.1 Point Domains to VPS

In **Hostinger Domain Panel** (or your domain registrar):

Add **A Records:**
```
@                 → YOUR_VPS_IP    (rawjournal.pro)
api               → YOUR_VPS_IP    (api.rawjournal.pro)
ws                → YOUR_VPS_IP    (ws.rawjournal.pro)
```

**Propagation:** Can take 5 minutes to 24 hours

### 5.2 SSL Certificates (Auto)

Coolify automatically:
- Detects domain configuration
- Requests Let's Encrypt certificates
- Configures Nginx reverse proxy
- Auto-renews certificates

**Check SSL status:**
- In Coolify → each service → **Domains** tab
- Look for 🔒 icon (SSL active)

---

## Part 6: Verification

### 6.1 Check All Services

**In Coolify Dashboard:**
- Supabase: ✅ Running (all 6 containers)
- Next.js: ✅ Running (1 container)
- Workers: ✅ Running (scheduler + 4 workers + redis = 6 containers)

**Test URLs:**
```bash
# Frontend
curl -I https://rawjournal.pro
# Should return: 200 OK

# Supabase
curl https://api.rawjournal.pro/rest/v1/
# Should return: {"message":"..."}

# Scheduler
curl http://YOUR_VPS_IP:8080/health
# Should return: {"status":"ok","active_users":0,...}
```

### 6.2 Test MT5 Worker Logs

```bash
# On VPS
cd /opt/rawjournal
bash docker/scripts/deploy.sh logs worker-1

# Look for:
# [1/6] Starting Xvfb... ✓
# [2/6] Wine prefix exists, reusing ✓
# [3/6] Windows Python already installed ✓
# [4/6] MT5 already installed ✓
# [5/6] Starting rpyc bridge server... rpyc server ready ✓
# [6/6] Starting worker process... Mode: Trade Worker ✓
# === Worker 1 running (PID 123, rpyc PID 456) ===
```

### 6.3 Test Database Connection

In Supabase Studio:
1. Go to **Table Editor** → `profiles`
2. Should be empty (no users yet)
3. Go to **Authentication** → **Users**
4. Click **Add User** (manually create first test user)

In frontend:
1. Open `https://rawjournal.pro`
2. Register new account
3. Check Supabase → **Authentication** → user appears ✓
4. Check Supabase → **Table Editor** → `profiles` → user profile created ✓

---

## Part 7: Monitoring

### 7.1 Coolify Dashboard

**All services visible at:**
`http://YOUR_VPS_IP:8000`

For each service:
- **Overview:** CPU, RAM, status
- **Logs:** Real-time logs (last 1000 lines)
- **Terminal:** Direct shell access to container
- **Restart/Stop/Start:** Service controls

### 7.2 Worker Health API

```bash
# Check scheduler status
curl http://YOUR_VPS_IP:8080/admin/status?key=YOUR_SERVICE_KEY

# Returns:
{
  "active_users": 0,
  "grace_users": 0,
  "queue_size": 0,
  "market_open": true,
  "workers": {
    "worker_1": {"status": "running", "terminal_alive": "True", ...},
    "worker_2": {"status": "running", ...},
    ...
  }
}
```

### 7.3 Common Issues

**Workers not starting:**
```bash
# Check logs
docker logs rawjournal-worker-1

# Common fixes:
# 1. Missing .env values → fill in .env
# 2. Supabase not running → check Coolify
# 3. First startup slow → wait 5 minutes
# 4. Wine/MT5 install failed → docker restart rawjournal-worker-1
```

**Frontend "Network Error":**
- Check NEXT_PUBLIC_SUPABASE_URL in Coolify env vars
- Verify Supabase is running
- Check browser console for CORS errors

**Database connection failed:**
- Verify SUPABASE_SERVICE_KEY is correct (service role, not anon key)
- Check Supabase container is healthy in Coolify

---

## Summary: Where is What?

| Component | Location | How to Access |
|-----------|----------|---------------|
| **Coolify** | `http://VPS_IP:8000` | Admin dashboard for all services |
| **Supabase Studio** | `http://VPS_IP:3000` | Database management |
| **Frontend** | `https://rawjournal.pro` | Public website |
| **Scheduler API** | `http://VPS_IP:8080` | WebSocket + health checks |
| **Next.js Logs** | Coolify → Services → rawjournal-frontend → Logs | Real-time build/runtime logs |
| **Worker Logs** | VPS: `bash docker/scripts/deploy.sh logs` | MT5 worker debug output |
| **Database Tables** | Supabase Studio → Table Editor | View/edit data |
| **Environment Vars** | Coolify → Service → Environment | Edit without redeploying |
| **SSL Certs** | Coolify → Service → Domains | Auto-managed by Coolify |

---

## Quick Commands Cheat Sheet

```bash
# === On VPS (SSH) ===

# View all Docker containers
docker ps -a

# View worker logs
cd /opt/rawjournal
bash docker/scripts/deploy.sh logs worker-1

# Restart workers
bash docker/scripts/deploy.sh restart

# Stop all workers
bash docker/scripts/deploy.sh down

# Pull latest code + rebuild
git pull
bash docker/scripts/deploy.sh up

# Check disk space
df -h

# Check memory
free -h

# === In Coolify UI ===

# Redeploy frontend: Services → rawjournal-frontend → Deploy button
# Restart service: Services → [service] → Restart button
# View logs: Services → [service] → Logs tab
# Edit env vars: Services → [service] → Environment tab → Save → Deploy
```

---

## Next Steps

1. ✅ Deploy Supabase in Coolify
2. ✅ Apply database schema in Supabase Studio
3. ✅ Note down API keys (URL, anon, service_role)
4. ✅ Configure `.env` on VPS with real values
5. ✅ Deploy workers via Coolify or manual script
6. ✅ Wait for first startup (~5 min)
7. ✅ Test scheduler health endpoint
8. ✅ Deploy Next.js frontend in Coolify
9. ✅ Set up domains (A records)
10. ✅ Register test user and verify sync

**You're ready to test MT5 account sync!**
