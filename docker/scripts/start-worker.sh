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

echo "=== RawJournal Worker $WORKER_ID Starting ==="

# --- 1. Virtual display ---
echo "[1/6] Starting Xvfb..."
Xvfb :99 -screen 0 1024x768x16 -nolisten tcp &
sleep 2

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
    wine64 /opt/wine-python/python-installer.exe /quiet InstallAllUsers=0 \
        TargetDir="C:\\Python311" PrependPath=1 Include_test=0 \
        Include_doc=0 Include_tcltk=0 2>/dev/null || true
    sleep 15

    if [ ! -f "$WIN_PYTHON" ]; then
        echo "ERROR: Windows Python installation failed"
        ls -la "$WINEPREFIX/drive_c/" 2>/dev/null || true
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
    echo "[4/6] Downloading and installing MetaTrader 5..."
    wget -q -O /tmp/mt5setup.exe "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
    wine64 /tmp/mt5setup.exe /auto 2>/dev/null || true
    sleep 20
    rm -f /tmp/mt5setup.exe

    if [ ! -f "$MT5_EXE" ]; then
        echo "WARNING: MT5 may not have installed correctly"
        find "$WINEPREFIX/drive_c" -name "terminal64.exe" 2>/dev/null || true
    else
        echo "       MT5 installed successfully"
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

# Signal handling: clean shutdown of both processes
cleanup() {
    echo "Shutting down worker $WORKER_ID..."
    kill $WORKER_PID 2>/dev/null || true
    kill $RPYC_PID 2>/dev/null || true
    wait $WORKER_PID 2>/dev/null || true
    wait $RPYC_PID 2>/dev/null || true
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
