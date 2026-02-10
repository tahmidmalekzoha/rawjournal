"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createChart, type IChartApi } from "lightweight-charts";
import { TIMEFRAMES } from "@/lib/constants";
import type { Timeframe } from "@/types";

interface CandleRow {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeRow {
  id: string;
  direction: "buy" | "sell";
  entry_timestamp: string;
  exit_timestamp: string | null;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  pnl: number | null;
  stop_loss: number | null;
  take_profit: number | null;
}

export default function ChartPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<TradeRow[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
      layout: { background: { color: "#0a0a0f" }, textColor: "#a1a1aa" },
      grid: { vertLines: { color: "#1a1a24" }, horzLines: { color: "#1a1a24" } },
      timeScale: { timeVisible: true, borderColor: "#2a2a34" },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Fetch data
    setLoading(true);
    fetch(`/api/charts/${symbol}?timeframe=${timeframe}`)
      .then((r) => r.json())
      .then((data) => {
        const candles = (data.candles || []).map((c: CandleRow) => ({
          time: Math.floor(new Date(c.timestamp).getTime() / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        if (candles.length > 0) {
          candleSeries.setData(candles);
        }

        // Trade markers
        const tradeData = data.trades || [];
        setTrades(tradeData);

        const markers = tradeData.flatMap((t: TradeRow) => {
          const m = [];
          m.push({
            time: Math.floor(new Date(t.entry_timestamp).getTime() / 1000),
            position: t.direction === "buy" ? "belowBar" : "aboveBar",
            color: t.direction === "buy" ? "#22c55e" : "#ef4444",
            shape: t.direction === "buy" ? "arrowUp" : "arrowDown",
            text: `${t.direction.toUpperCase()} ${t.position_size}`,
          });
          if (t.exit_timestamp && t.exit_price) {
            m.push({
              time: Math.floor(new Date(t.exit_timestamp).getTime() / 1000),
              position: t.direction === "buy" ? "aboveBar" : "belowBar",
              color: "#6366f1",
              shape: "circle",
              text: t.pnl != null ? `$${t.pnl.toFixed(2)}` : "Exit",
            });
          }
          return m;
        }).sort((a: any, b: any) => a.time - b.time);

        if (markers.length > 0) {
          candleSeries.setMarkers(markers);
        }

        // SL/TP lines for recent trades
        for (const t of tradeData.slice(-5)) {
          if (t.stop_loss) {
            const slLine = chart.addLineSeries({
              color: "#ef4444",
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            const entryTime = Math.floor(new Date(t.entry_timestamp).getTime() / 1000);
            const endTime = t.exit_timestamp
              ? Math.floor(new Date(t.exit_timestamp).getTime() / 1000)
              : Math.floor(Date.now() / 1000);
            slLine.setData([
              { time: entryTime as any, value: t.stop_loss },
              { time: endTime as any, value: t.stop_loss },
            ]);
          }
          if (t.take_profit) {
            const tpLine = chart.addLineSeries({
              color: "#22c55e",
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            const entryTime = Math.floor(new Date(t.entry_timestamp).getTime() / 1000);
            const endTime = t.exit_timestamp
              ? Math.floor(new Date(t.exit_timestamp).getTime() / 1000)
              : Math.floor(Date.now() / 1000);
            tpLine.setData([
              { time: entryTime as any, value: t.take_profit },
              { time: endTime as any, value: t.take_profit },
            ]);
          }
        }

        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Resize handler
    function onResize() {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, timeframe]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/trades" className="text-sm text-text-secondary hover:text-text-primary">
            &larr; Trades
          </Link>
          <h1 className="text-2xl font-bold">{symbol}</h1>
        </div>
        <div className="flex rounded-lg border border-border">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value as Timeframe)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                timeframe === tf.value
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-4 text-center text-text-secondary text-sm">Loading chart data...</div>}

      <div ref={containerRef} className="rounded-xl border border-border overflow-hidden" />

      {/* Trade list for this symbol */}
      {trades.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-semibold">Trades on {symbol}</h2>
          <div className="space-y-2">
            {trades.slice(-10).reverse().map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/trades/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  <span className={t.direction === "buy" ? "text-profit" : "text-loss"}>
                    {t.direction.toUpperCase()}
                  </span>
                  <span className="text-sm text-text-secondary">{t.position_size} lots</span>
                </div>
                {t.pnl != null && (
                  <span className={`font-medium ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    ${t.pnl.toFixed(2)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
