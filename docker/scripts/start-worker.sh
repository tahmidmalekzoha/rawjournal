#!/bin/bash
# Start Xvfb + Wine MT5 terminal + Python worker
set -e

WORKER_ID=${WORKER_ID:-1}

echo "Starting Xvfb..."
Xvfb :99 -screen 0 1024x768x16 &
sleep 2

echo "Initializing Wine prefix..."
export WINEPREFIX=/opt/mt5/worker_${WORKER_ID}
if [ ! -d "$WINEPREFIX" ]; then
    wineboot --init 2>/dev/null
    sleep 3
fi

# Install MT5 if not present
MT5_EXE="$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe"
if [ ! -f "$MT5_EXE" ]; then
    echo "MT5 not installed in prefix $WORKER_ID. Downloading..."
    wget -q -O /tmp/mt5setup.exe "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
    wine /tmp/mt5setup.exe /auto 2>/dev/null
    sleep 10
    rm -f /tmp/mt5setup.exe
    echo "MT5 installed."
fi

# Launch correct worker type
if [ "${IS_MARKET_DATA_WORKER}" = "true" ]; then
    echo "Starting market data worker (Worker #$WORKER_ID)..."
    exec python market_data_worker.py
else
    echo "Starting trade worker $WORKER_ID..."
    exec python trade_worker.py --worker-id="$WORKER_ID"
fi
