"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatPercent, cn } from "@/lib/utils/format";
import { BarChart3 } from "lucide-react";
import type { AnalyticsData, AnalyticsPeriod, Account } from "@/types";
import EquityCurve from "@/components/charts/equity-curve";
import CalendarHeatmap from "@/components/charts/calendar-heatmap";
import PnlBarChart from "@/components/charts/pnl-bar-chart";
import SessionBreakdown from "@/components/charts/session-breakdown";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export default function AnalyticsPage() {
  const supabase = createClient();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("accounts").select("*").then(({ data }: { data: Account[] | null }) => setAccounts(data || []));
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (accountId) params.set("account_id", accountId);
      const res = await fetch(`/api/trades/analytics?${params}`);
      if (res.ok) setAnalytics(await res.json());
      setLoading(false);
    }
    load();
  }, [accountId, period]);

  if (loading && !analytics) {
    return <div className="py-12 text-center text-sm text-text-secondary">Loading analytics...</div>;
  }

  const a = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <div className="flex items-center gap-2">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input-sm">
            <option value="">All Accounts</option>
            {accounts.map((ac) => (
              <option key={ac.id} value={ac.id}>{ac.label}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-border">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                  period === p.value
                    ? "bg-accent text-black"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!a || a.total_trades === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-16 text-center">
          <BarChart3 className="mb-3 h-8 w-8 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">No closed trades for this period.</p>
          <p className="mt-1 text-xs text-text-secondary/60">Start adding trades to see analytics.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total P&L" value={formatCurrency(a.total_pnl)} color={a.total_pnl >= 0 ? "text-profit" : "text-loss"} />
            <StatCard label="Win Rate" value={formatPercent(a.win_rate)} color={a.win_rate >= 50 ? "text-profit" : "text-loss"} />
            <StatCard label="Profit Factor" value={a.profit_factor === Infinity ? "∞" : a.profit_factor.toFixed(2)} color={a.profit_factor >= 1 ? "text-profit" : "text-loss"} />
            <StatCard label="Total Trades" value={a.total_trades.toString()} />
            <StatCard label="Max Drawdown" value={formatCurrency(a.max_drawdown)} color="text-loss" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Avg Win" value={formatCurrency(a.avg_win)} color="text-profit" />
            <StatCard label="Avg Loss" value={formatCurrency(a.avg_loss)} color="text-loss" />
            <StatCard label="Largest Win" value={formatCurrency(a.largest_win)} color="text-profit" />
            <StatCard label="Largest Loss" value={formatCurrency(a.largest_loss)} color="text-loss" />
            <StatCard label="Consec. Wins" value={a.consecutive_wins.toString()} />
          </div>

          {/* Equity Curve */}
          {a.equity_curve.length > 0 && (
            <ChartCard title="Equity Curve">
              <EquityCurve data={a.equity_curve} />
            </ChartCard>
          )}

          {/* Calendar Heatmap */}
          {a.daily_pnl.length > 0 && (
            <ChartCard title="Daily P&L Calendar">
              <CalendarHeatmap data={a.daily_pnl} />
            </ChartCard>
          )}

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {a.by_symbol.length > 0 && (
              <ChartCard title="P&L by Symbol">
                <PnlBarChart data={a.by_symbol.map((s) => ({ name: s.symbol, pnl: s.pnl }))} />
              </ChartCard>
            )}
            {a.by_session.length > 0 && (
              <ChartCard title="P&L by Session">
                <PnlBarChart data={a.by_session.map((s) => ({ name: s.session, pnl: s.pnl }))} />
              </ChartCard>
            )}
            {a.by_day_of_week.length > 0 && (
              <ChartCard title="P&L by Day of Week">
                <PnlBarChart data={a.by_day_of_week.map((d) => ({ name: d.day, pnl: d.pnl }))} />
              </ChartCard>
            )}
            {a.by_hour.length > 0 && (
              <ChartCard title="P&L by Hour (UTC)">
                <PnlBarChart data={a.by_hour.map((h) => ({ name: `${h.hour}:00`, pnl: h.pnl }))} />
              </ChartCard>
            )}
          </div>

          {/* Session Breakdown */}
          {a.by_session.length > 0 && (
            <ChartCard title="Session Performance">
              <SessionBreakdown data={a.by_session} />
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-text-secondary">{title}</h2>
      {children}
    </div>
  );
}
