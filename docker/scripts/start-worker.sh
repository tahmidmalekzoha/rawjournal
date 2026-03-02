#!/bin/bash
# Start Xvfb + Wine Python rpyc server + MT5 terminal + native Python worker
#
# First run: initializes Wine prefix, installs Windows Python + MT5 (~5 min)
# Subsequent runs: skips install, starts in ~10 seconds
set -e

WORKER_ID=${WORKER_ID:-1}
export WINEPREFIX=/opt/mt5/worker_${WORKER_ID}
export DISPLAY=:99
export WINEDEBUG=-all

# Track consecutive failures to add backoff and prevent infinite rapid restart loops
FAIL_COUNT_FILE="/tmp/.worker_${WORKER_ID}_fail_count"
if [ -f "$FAIL_COUNT_FILE" ]; then
    FAIL_COUNT=$(cat "$FAIL_COUNT_FILE")
else
    FAIL_COUNT=0
fi

if [ "$FAIL_COUNT" -gt 0 ]; then
    BACKOFF=$(( FAIL_COUNT * 15 ))
    [ "$BACKOFF" -gt 120 ] && BACKOFF=120
    echo "Previous failures detected ($FAIL_COUNT). Waiting ${BACKOFF}s before retry..."
    sleep "$BACKOFF"
fi

echo "=== RawJournal Worker $WORKER_ID Starting ==="

# --- 1. Virtual display ---
echo "[1/6] Starting Xvfb..."
# Clean up stale Xvfb lock files and processes from previous runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
pkill -f "Xvfb :99" 2>/dev/null || true
sleep 1

Xvfb :99 -screen 0 1024x768x16 -nolisten tcp &
XVFB_PID=$!
sleep 2

# Verify Xvfb actually started
if ! kill -0 "$XVFB_PID" 2>/dev/null; then
    echo "ERROR: Xvfb failed to start"
    echo $(( FAIL_COUNT + 1 )) > "$FAIL_COUNT_FILE"
    exit 1
fi
echo "       Xvfb started (PID $XVFB_PID)"

# --- 2. Wine prefix ---
if [ ! -d "$WINEPREFIX/drive_c" ]; then
    echo "[2/6] Initializing Wine prefix..."
    WINEDLLOVERRIDES="mscoree,mshtml=" wineboot --init 2>/dev/null || true
    sleep 5
    echo "       Wine prefix created at $WINEPREFIX"
else
    echo "[2/6] Wine prefix exists, reusing"
fi

# --- 3. Windows Python (for MetaTrader5 package + rpyc server) ---
WIN_PYTHON="$WINEPREFIX/drive_c/Python311/python.exe"
if [ ! -f "$WIN_PYTHON" ]; then
    echo "[3/6] Installing Windows Python 3.11..."

    PYTHON_INSTALLED=false
    for attempt in 1 2 3; do
        echo "       Install attempt $attempt/3..."
        wine64 /opt/wine-python/python-installer.exe /quiet InstallAllUsers=0 \
            TargetDir="C:\\Python311" PrependPath=1 Include_test=0 \
            Include_doc=0 Include_tcltk=0 2>&1 | tail -5 || true
        sleep 15

        if [ -f "$WIN_PYTHON" ]; then
            PYTHON_INSTALLED=true
            break
        fi
        echo "       Attempt $attempt failed. Contents of drive_c:"
        ls -la "$WINEPREFIX/drive_c/" 2>/dev/null || true
        sleep 5
    done

    if [ "$PYTHON_INSTALLED" = false ]; then
        echo "ERROR: Windows Python installation failed after 3 attempts"
        echo "       Clearing Wine prefix to allow fresh retry on next start..."
        rm -rf "$WINEPREFIX"
        echo $(( FAIL_COUNT + 1 )) > "$FAIL_COUNT_FILE"
        exit 1
    fi

    echo "       Installing MetaTrader5 + rpyc in Wine Python..."
    wine64 "$WIN_PYTHON" -m pip install --upgrade pip 2>/dev/null || true
    wine64 "$WIN_PYTHON" -m pip install MetaTrader5 rpyc 2>/dev/null || true
    echo "       Wine Python setup complete"
else
    echo "[3/6] Windows Python already installed"
fi

# --- 4. MetaTrader 5 terminal ---
MT5_EXE="$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe"
if [ ! -f "$MT5_EXE" ]; then
    echo "[4/6] Installing MetaTrader 5 from pre-extracted files..."

    # Check if MT5 was pre-extracted during Docker build
    if [ -d "/opt/mt5-portable" ]; then
        # Find terminal64.exe in the extracted files
        MT5_SRC=$(find /opt/mt5-portable -name "terminal64.exe" 2>/dev/null | head -1)
        if [ -n "$MT5_SRC" ]; then
            MT5_SRC_DIR=$(dirname "$MT5_SRC")
            mkdir -p "$WINEPREFIX/drive_c/Program Files/MetaTrader 5"
            cp -r "$MT5_SRC_DIR"/* "$WINEPREFIX/drive_c/Program Files/MetaTrader 5/"
            echo "       MT5 installed from pre-extracted files"
        else
            # No terminal64.exe found — copy entire extracted content and search
            mkdir -p "$WINEPREFIX/drive_c/Program Files/MetaTrader 5"
            cp -r /opt/mt5-portable/* "$WINEPREFIX/drive_c/Program Files/MetaTrader 5/" 2>/dev/null || true
            echo "       MT5 files copied (terminal64.exe not found in expected location)"
            echo "       Contents:"
            find "$WINEPREFIX/drive_c/Program Files/MetaTrader 5" -maxdepth 2 -name "*.exe" 2>/dev/null || true
        fi
    else
        echo "WARNING: /opt/mt5-portable not found — MT5 was not pre-extracted during build"
        echo "         Skipping MT5 installation"
    fi

    # Verify
    if [ -f "$MT5_EXE" ]; then
        echo "       MT5 installed successfully at $MT5_EXE"
    else
        FOUND=$(find "$WINEPREFIX/drive_c" -name "terminal64.exe" 2>/dev/null | head -1)
        if [ -n "$FOUND" ]; then
            MT5_EXE="$FOUND"
            echo "       MT5 found at alternate path: $MT5_EXE"
        else
            echo "WARNING: MT5 terminal64.exe not found. Trade syncing may not work."
        fi
    fi
else
    echo "[4/6] MT5 already installed"
fi

# --- 5. rpyc bridge server (Wine Python) ---
echo "[5/6] Starting rpyc bridge server..."
wine64 "$WIN_PYTHON" /opt/scripts/rpyc_server.py &
RPYC_PID=$!

# Wait for rpyc server to be ready (up to 60s)
for i in $(seq 1 30); do
    if python -c "import socket; s=socket.socket(); s.settimeout(1); s.connect(('localhost', 18812)); s.close()" 2>/dev/null; then
        echo "       rpyc server ready (attempt $i)"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "ERROR: rpyc server failed to start within 60 seconds"
        exit 1
    fi
    sleep 2
done

# --- 6. Worker process ---
echo "[6/6] Starting worker process..."

# Reset fail counter on successful startup
rm -f "$FAIL_COUNT_FILE"

# Signal handling: clean shutdown of both processes
cleanup() {
    echo "Shutting down worker $WORKER_ID..."
    kill $WORKER_PID 2>/dev/null || true
    kill $RPYC_PID 2>/dev/null || true
    kill $XVFB_PID 2>/dev/null || true
    wait $WORKER_PID 2>/dev/null || true
    wait $RPYC_PID 2>/dev/null || true
    rm -f /tmp/.X99-lock /tmp/.X11-unix/X99
    exit 0
}
trap cleanup SIGTERM SIGINT

if [ "${IS_MARKET_DATA_WORKER}" = "true" ]; then
    echo "       Mode: Market Data Worker"
    python market_data_worker.py &
else
    echo "       Mode: Trade Worker"
    python trade_worker.py --worker-id="$WORKER_ID" &
fi
WORKER_PID=$!

echo "=== Worker $WORKER_ID running (PID $WORKER_PID, rpyc PID $RPYC_PID) ==="

# Wait for worker to finish
wait $WORKER_PID
cleanup
