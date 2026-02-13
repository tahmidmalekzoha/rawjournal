"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createChart, type IChartApi } from "lightweight-charts";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils/format";
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

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
      layout: { background: { color: "#000000" }, textColor: "#737373" },
      grid: { vertLines: { color: "#1a1a1a" }, horzLines: { color: "#1a1a1a" } },
      timeScale: { timeVisible: true, borderColor: "#1a1a1a" },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#5a9a6e",
      downColor: "#c4605a",
      borderVisible: false,
      wickUpColor: "#5a9a6e",
      wickDownColor: "#c4605a",
    });

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

        const tradeData = data.trades || [];
        setTrades(tradeData);

        const markers = tradeData.flatMap((t: TradeRow) => {
          const m = [];
          m.push({
            time: Math.floor(new Date(t.entry_timestamp).getTime() / 1000),
            position: t.direction === "buy" ? "belowBar" : "aboveBar",
            color: t.direction === "buy" ? "#5a9a6e" : "#c4605a",
            shape: t.direction === "buy" ? "arrowUp" : "arrowDown",
            text: `${t.direction.toUpperCase()} ${t.position_size}`,
          });
          if (t.exit_timestamp && t.exit_price) {
            m.push({
              time: Math.floor(new Date(t.exit_timestamp).getTime() / 1000),
              position: t.direction === "buy" ? "aboveBar" : "belowBar",
              color: "#ffffff",
              shape: "circle",
              text: t.pnl != null ? `$${t.pnl.toFixed(2)}` : "Exit",
            });
          }
          return m;
        }).sort((a: any, b: any) => a.time - b.time);

        if (markers.length > 0) {
          candleSeries.setMarkers(markers);
        }

        for (const t of tradeData.slice(-5)) {
          if (t.stop_loss) {
            const slLine = chart.addLineSeries({
              color: "#c4605a",
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
              color: "#5a9a6e",
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/trades"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to trades
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{symbol}</h1>
        </div>
        <div className="flex rounded-lg border border-border">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value as Timeframe)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                timeframe === tf.value
                  ? "bg-accent text-black"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-4 text-center text-sm text-text-secondary">Loading chart data...</div>}

      <div ref={containerRef} className="rounded-xl border border-border overflow-hidden" />

      {/* Trade list */}
      {trades.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Trades on {symbol}
          </h2>
          <div className="space-y-1.5">
            {trades.slice(-10).reverse().map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/trades/${t.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex items-center gap-3">
                  {t.direction === "buy" ? (
                    <TrendingUp className="h-3.5 w-3.5 text-profit" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-loss" />
                  )}
                  <span className={cn("text-sm font-medium", t.direction === "buy" ? "text-profit" : "text-loss")}>
                    {t.direction.toUpperCase()}
                  </span>
                  <span className="text-xs text-text-secondary">{t.position_size} lots</span>
                </div>
                {t.pnl != null && (
                  <span className={cn("text-sm font-medium tabular-nums", t.pnl >= 0 ? "text-profit" : "text-loss")}>
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
