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
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
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

  const filteredPerformance = useMemo(() => {
    if (period === "ALL") return performanceData;
    const now = new Date();
    let cutoff: Date;
    switch (period) {
      case "1D": cutoff = subDays(now, 1); break;
      case "1W": cutoff = subDays(now, 7); break;
      case "1M": cutoff = subMonths(now, 1); break;
      case "3M": cutoff = subMonths(now, 3); break;
      default: return performanceData;
    }
    return performanceData.filter((d) => isAfter(parseISO(d.date), cutoff));
  }, [performanceData, period]);

  const periodPnl = filteredPerformance.reduce((s, d) => s + d.pnl, 0);

  // Calendar grid (starts Monday)
  const firstDayOfWeek = calendarData.length > 0 ? calendarData[0].dayOfWeek : 1;
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const statCards = [
    {
      label: "Total P&L",
      value: formatPnl(totalPnl),
      icon: DollarSign,
      color: totalPnl >= 0 ? "text-profit" : "text-loss",
      sub: `${totalClosed} closed trades`,
    },
    {
      label: "Unrealized",
      value: formatPnl(unrealizedPnl),
      icon: Clock,
      color: unrealizedPnl >= 0 ? "text-profit" : "text-loss",
      sub: `${positions.length} open`,
    },
    {
      label: "Realized",
      value: formatPnl(realizedPnl),
      icon: CheckCircle2,
      color: realizedPnl >= 0 ? "text-profit" : "text-loss",
      sub: null,
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: Target,
      color: "text-text-primary",
      sub: null,
      progress: parseFloat(winRate) || 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="mt-0.5 text-sm text-text-secondary">{currentDate}</p>
        </div>
        <Link
          href="/dashboard/trades/add"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Add Trade
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border/80"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
                  <Icon className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xs font-medium text-text-secondary">{card.label}</p>
              <p className={`mt-0.5 text-xl font-bold tracking-tight ${card.color}`}>
                {card.value}
              </p>
              {card.sub && (
                <p className="mt-1 text-[11px] text-text-secondary">{card.sub}</p>
              )}
              {"progress" in card && card.progress !== undefined && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent/50 transition-all"
                    style={{ width: `${card.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Performance + Calendar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Performance chart */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">Performance</span>
            </div>
            <div className="flex rounded-lg border border-border bg-background p-0.5">
              {periodFilters.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-white/[0.08] text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <p className={`mb-4 text-2xl font-bold ${periodPnl >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPnl(periodPnl)}
          </p>
          {filteredPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filteredPerformance} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(parseISO(d), "MMM d")}
                  stroke="#737373"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#1a1a1a" }}
                />
                <YAxis
                  stroke="#737373"
                  fontSize={10}
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
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {filteredPerformance.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "#5a9a6e" : "#c4605a"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2">
              <BarChart3 className="h-8 w-8 text-border" strokeWidth={1} />
              <p className="text-sm text-text-secondary">No trades in this period</p>
            </div>
          )}
        </div>

        {/* Monthly Calendar */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">Monthly P&L</h3>
            <span className="text-xs text-text-secondary">{monthLabel}</span>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="text-[10px] font-medium text-text-secondary">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
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
                  className={`relative flex aspect-square items-center justify-center rounded-md text-[11px] transition-colors ${
                    today
                      ? "ring-1 ring-accent/40 text-text-primary font-medium"
                      : day.trades > 0
                        ? "text-text-primary"
                        : "text-text-secondary/60"
                  }`}
                >
                  {day.dayNum}
                  {day.trades > 0 && (
                    <span
                      className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                        hasProfit ? "bg-profit" : hasLoss ? "bg-loss" : "bg-text-secondary"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-profit" /> Profit
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-loss" /> Loss
            </span>
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">
            Open Positions
            {positions.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-secondary">({positions.length})</span>
            )}
          </h2>
        </div>
        {positions.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-secondary">Symbol</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-secondary">Side</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-secondary">Size</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-secondary">Entry</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-secondary">Current</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-secondary">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover">
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{p.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.direction === "buy" ? "text-profit" : "text-loss"}`}>
                        {p.direction === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {p.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">{p.position_size}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{p.entry_price}</td>
                    <td className="px-4 py-3 text-right text-text-primary">{p.current_price}</td>
                    <td className={`px-4 py-3 text-right font-medium ${(p.floating_pnl ?? 0) >= 0 ? "text-profit" : "text-loss"}`}>
                      {formatPnl(p.floating_pnl ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center">
            <Clipboard className="mx-auto h-6 w-6 text-text-secondary/50" strokeWidth={1.5} />
            <p className="mt-2 text-sm text-text-secondary">No open positions</p>
            <p className="mt-1 text-xs text-text-secondary/60">Open positions will appear here when synced</p>
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/dashboard/trades", label: "View Trades", icon: ArrowUpRight },
          { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/dashboard/journal", label: "Journal", icon: Clipboard },
          { href: "/dashboard/trades/import", label: "Import CSV", icon: Plus },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
