#!/bin/bash
# RawJournal MT5 Workers — VPS Deployment Script
# Run from the project root directory on the VPS
#
# Usage:
#   bash docker/scripts/deploy.sh build       # Build images only
#   bash docker/scripts/deploy.sh up           # Build + start all services
#   bash docker/scripts/deploy.sh up-minimal   # Start scheduler + 1 worker + redis
#   bash docker/scripts/deploy.sh down         # Stop all services
#   bash docker/scripts/deploy.sh logs [svc]   # Tail logs (optionally for one service)
#   bash docker/scripts/deploy.sh status       # Show status + health check

set -e

echo "=== RawJournal MT5 Workers ==="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    echo "Install: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose plugin not found."
    exit 1
fi

# Check .env
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env from .env.example"
    fi
    echo ""
    echo "IMPORTANT: Edit .env and fill in your values before continuing:"
    echo "  nano .env"
    echo ""
    echo "Required variables:"
    echo "  SUPABASE_URL         - Your Supabase instance URL"
    echo "  SUPABASE_SERVICE_KEY - Supabase service role key"
    echo "  ENCRYPTION_KEY       - Generate: python3 -c \"import os; print(os.urandom(32).hex())\""
    echo ""
    echo "Optional (for market data worker #4):"
    echo "  DEMO_MT5_LOGIN       - Demo MT5 account number"
    echo "  DEMO_MT5_PASSWORD    - Demo MT5 password"
    echo "  DEMO_MT5_SERVER      - Demo MT5 server name"
    echo ""
    echo "After editing .env, run this script again."
    exit 1
fi

# Validate required vars
source .env
MISSING=""
[ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "https://api.rawjournal.pro" ] && MISSING="$MISSING SUPABASE_URL"
[ -z "$SUPABASE_SERVICE_KEY" ] || [ "$SUPABASE_SERVICE_KEY" = "your-service-role-key-here" ] && MISSING="$MISSING SUPABASE_SERVICE_KEY"
[ -z "$ENCRYPTION_KEY" ] || [ "$ENCRYPTION_KEY" = "your-32-byte-hex-key-here" ] && MISSING="$MISSING ENCRYPTION_KEY"

if [ -n "$MISSING" ]; then
    echo "ERROR: Missing or default values for:$MISSING"
    echo "Edit .env and fill in actual values."
    exit 1
fi

COMPOSE="docker compose -f docker/docker-compose.yml --env-file .env"
ACTION=${1:-up}

case $ACTION in
    build)
        echo "Building images..."
        $COMPOSE build
        ;;
    up)
        echo "Building and starting all services..."
        $COMPOSE up -d --build
        echo ""
        $COMPOSE ps
        ;;
    up-minimal)
        echo "Starting scheduler + 1 worker + redis (minimal test)..."
        $COMPOSE up -d --build scheduler worker-1 redis
        echo ""
        $COMPOSE ps
        ;;
    down)
        echo "Stopping all services..."
        $COMPOSE down
        ;;
    logs)
        $COMPOSE logs -f ${2:-}
        ;;
    status)
        $COMPOSE ps
        echo ""
        echo "Health check:"
        curl -s http://localhost:8080/health 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "  Scheduler not responding yet"
        ;;
    restart)
        echo "Restarting services..."
        $COMPOSE restart ${2:-}
        ;;
    *)
        echo "Usage: $0 {build|up|up-minimal|down|logs|status|restart}"
        exit 1
        ;;
esac

echo ""
echo "Quick commands:"
echo "  Status:  bash docker/scripts/deploy.sh status"
echo "  Logs:    bash docker/scripts/deploy.sh logs [service]"
echo "  Stop:    bash docker/scripts/deploy.sh down"
echo "  Minimal: bash docker/scripts/deploy.sh up-minimal"
