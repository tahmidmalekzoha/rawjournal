"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  Target,
  BarChart3,
  Clipboard,
  Search,
  Plus,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format, parseISO, subDays, subMonths, isAfter } from "date-fns";

interface PerformanceItem {
  date: string;
  pnl: number;
  trades: number;
}

interface CalendarDay {
  date: string;
  dayNum: number;
  dayOfWeek: number;
  pnl: number;
  trades: number;
}

interface Props {
  totalPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
  winRate: string;
  totalClosed: number;
  performanceData: PerformanceItem[];
  calendarData: CalendarDay[];
  monthLabel: string;
  positions: any[];
  currentDate: string;
}

const periodFilters = ["1D", "1W", "1M", "3M", "ALL"] as const;

function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export default function DashboardClient({
  totalPnl,
  unrealizedPnl,
  realizedPnl,
  winRate,
  totalClosed,
  performanceData,
  calendarData,
  monthLabel,
  positions,
  currentDate,
}: Props) {
  const [period, setPeriod] = useState<(typeof periodFilters)[number]>("1W");

  // Filter performance data by period
  const filteredPerformance = useMemo(() => {
    if (period === "ALL") return performanceData;
    const now = new Date();
    let cutoff: Date;
    switch (period) {
      case "1D":
        cutoff = subDays(now, 1);
        break;
      case "1W":
        cutoff = subDays(now, 7);
        break;
      case "1M":
        cutoff = subMonths(now, 1);
        break;
      case "3M":
        cutoff = subMonths(now, 3);
        break;
      default:
        return performanceData;
    }
    return performanceData.filter((d) => isAfter(parseISO(d.date), cutoff));
  }, [performanceData, period]);

  const periodPnl = filteredPerformance.reduce((s, d) => s + d.pnl, 0);

  // Build calendar grid (starts Monday)
  const firstDayOfWeek = calendarData.length > 0 ? calendarData[0].dayOfWeek : 1;
  // Adjust so Monday = 0
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const statCards = [
    {
      label: "TOTAL P&L",
      value: formatPnl(totalPnl),
      icon: DollarSign,
      badge: "TOTAL",
      color: totalPnl >= 0 ? "text-profit" : "text-loss",
    },
    {
      label: "UNREALIZED",
      value: formatPnl(unrealizedPnl),
      icon: Clock,
      badge: null,
      color: unrealizedPnl >= 0 ? "text-profit" : "text-loss",
    },
    {
      label: "REALIZED",
      value: formatPnl(realizedPnl),
      icon: CheckCircle2,
      badge: null,
      color: realizedPnl >= 0 ? "text-profit" : "text-loss",
    },
    {
      label: "WIN RATE",
      value: `${winRate}%`,
      icon: Target,
      badge: null,
      subtitle: `${totalClosed} closed trades`,
      color: "text-text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary">{currentDate}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-text-secondary" />
            <span className="text-sm text-text-secondary">Search...</span>
            <kbd className="ml-8 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-text-secondary">
              Ctrl-K
            </kbd>
          </div>
          <Link
            href="/dashboard/trades/add"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-black transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
          </Link>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface-hover">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative rounded-xl border border-border bg-surface p-5"
            >
              {card.badge && (
                <span className="absolute top-4 right-4 rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {card.badge}
                </span>
              )}
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                <Icon className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                {card.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                {card.value}
              </p>
              {card.subtitle && (
                <p className="mt-0.5 text-xs text-text-secondary">{card.subtitle}</p>
              )}
              {card.label === "TOTAL P&L" && (
                <p className="mt-0.5 text-xs text-profit">
                  → {totalClosed} trades
                </p>
              )}
              {card.label === "UNREALIZED" && (
                <p className="mt-0.5 text-xs text-text-secondary">
                  {positions.length} open positions
                </p>
              )}
              {card.label === "WIN RATE" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-profit to-profit/60"
                    style={{ width: `${parseFloat(winRate) || 0}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Performance + Calendar row */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Performance chart */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-text-secondary" />
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                Performance
              </span>
            </div>
            <div className="flex rounded-lg border border-border bg-background p-0.5">
              {periodFilters.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-surface-hover text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <p className={`mb-4 text-3xl font-bold ${periodPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPnl(periodPnl)}
          </p>
          {filteredPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={filteredPerformance} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(parseISO(d), "MMM d")}
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#1a1a1a" }}
                />
                <YAxis
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a0a",
                    border: "1px solid #1a1a1a",
                    borderRadius: 8,
                    color: "#e5e5e5",
                    fontSize: 12,
                  }}
                  labelFormatter={(d) => format(parseISO(d as string), "MMM d, yyyy")}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "P&L"]}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {filteredPerformance.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "#5a9a6e" : "#c4605a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-text-secondary">
              No trades taken
            </div>
          )}
        </div>

        {/* Monthly P&L Calendar */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Monthly P&L</h3>
            <span className="text-xs text-text-secondary">{monthLabel}</span>
          </div>
          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="text-[11px] font-medium text-text-secondary">
                {d}
              </span>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {calendarData.map((day) => {
              const hasProfit = day.pnl > 0;
              const hasLoss = day.pnl < 0;
              const today = day.date === format(new Date(), "yyyy-MM-dd");
              return (
                <div
                  key={day.date}
                  title={
                    day.trades > 0
                      ? `${day.date}: $${day.pnl.toFixed(2)} (${day.trades} trades)`
                      : day.date
                  }
                  className={`relative flex aspect-square items-center justify-center rounded-md text-xs transition-colors ${
                    today
                      ? "border border-accent/30 bg-accent/5 text-text-primary font-medium"
                      : day.trades > 0
                      ? "bg-surface-hover text-text-primary"
                      : "text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {day.dayNum}
                  {day.trades > 0 && (
                    <span
                      className={`absolute bottom-1 h-1 w-1 rounded-full ${
                        hasProfit ? "bg-profit" : hasLoss ? "bg-loss" : "bg-text-secondary"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-4 flex items-center justify-end gap-3 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-profit" />
              Profit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-loss" />
              Loss
            </span>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-text-primary">Open Positions</h2>
        {positions.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-text-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Direction</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Entry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Current</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3 font-medium text-text-primary">{p.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={p.direction === "buy" ? "text-profit" : "text-loss"}>
                        {p.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{p.position_size}</td>
                    <td className="px-4 py-3 text-right">{p.entry_price}</td>
                    <td className="px-4 py-3 text-right">{p.current_price}</td>
                    <td className={`px-4 py-3 text-right font-medium ${(p.floating_pnl ?? 0) >= 0 ? "text-profit" : "text-loss"}`}>
                      ${p.floating_pnl?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface px-6 py-8">
            <div className="flex items-center gap-3 text-text-secondary">
              <Clipboard className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-sm">No open positions</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
