"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatCurrency, cn } from "@/lib/utils/format";
import { SESSIONS, TRADES_PER_PAGE } from "@/lib/constants";
import {
  Search,
  Plus,
  Bell,
  Filter,
  Trash2,
  Pencil,
  Link2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Trade, Account } from "@/types";

export default function TradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filters from URL
  const accountFilter = searchParams.get("account") || "";
  const symbolFilter = searchParams.get("symbol") || "";
  const directionFilter = searchParams.get("direction") || "";
  const sessionFilter = searchParams.get("session") || "";
  const statusFilter = searchParams.get("status") || "closed";
  const fromFilter = searchParams.get("from") || "";
  const toFilter = searchParams.get("to") || "";
  const sortBy = searchParams.get("sort") || "date";
  const sortDir = searchParams.get("dir") || "desc";
  const page = parseInt(searchParams.get("page") || "1");

  const activeFilterCount = [accountFilter, symbolFilter, directionFilter, sessionFilter, fromFilter, toFilter].filter(Boolean).length;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: accs } = await supabase.from("accounts").select("*");
      setAccounts(accs || []);

      let query = supabase.from("trades").select("*", { count: "exact" });

      if (accountFilter) query = query.eq("account_id", accountFilter);
      if (symbolFilter) query = query.ilike("symbol", `%${symbolFilter}%`);
      if (directionFilter) query = query.eq("direction", directionFilter);
      if (sessionFilter) query = query.eq("session_tag", sessionFilter);
      if (statusFilter) query = query.eq("status", statusFilter);
      if (fromFilter) query = query.gte("entry_timestamp", fromFilter);
      if (toFilter) query = query.lte("entry_timestamp", toFilter);

      const orderCol = sortBy === "pnl" ? "pnl" : sortBy === "symbol" ? "symbol" : "exit_timestamp";
      query = query.order(orderCol, { ascending: sortDir === "asc", nullsFirst: false });

      const from = (page - 1) * TRADES_PER_PAGE;
      query = query.range(from, from + TRADES_PER_PAGE - 1);

      const { data, count } = await query;
      setTrades(data || []);
      setTotal(count || 0);
      setLoading(false);
    }
    load();
  }, [accountFilter, symbolFilter, directionFilter, sessionFilter, statusFilter, fromFilter, toFilter, sortBy, sortDir, page]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`/dashboard/trades?${params.toString()}`);
  }

  async function handleDeleteTrade(e: React.MouseEvent, tradeId: string) {
    e.stopPropagation();
    if (!confirm("Delete this trade?")) return;
    await supabase.from("trades").delete().eq("id", tradeId);
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setTotal((prev) => prev - 1);
  }

  const totalPages = Math.ceil(total / TRADES_PER_PAGE);
  const currentDate = format(new Date(), "EEE, MMM d");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trades</h1>
          <p className="text-sm text-text-secondary">{currentDate}</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Actions row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">Trades</h2>
          <span className="text-sm text-text-secondary">• Not connected</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent-hover">
            Connect MT4/MT5
          </button>
          <Link
            href="/dashboard/trades/import"
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Import CSV
          </Link>
          <Link
            href="/dashboard/trades/add"
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            + Add Trade
          </Link>
        </div>
      </div>

      {/* Trade History header */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary">Trade History</h3>
            <span className="text-xs text-text-secondary">{total} of {total} trades</span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              showFilters || activeFilterCount > 0
                ? "border-accent/30 bg-accent/5 text-text-primary"
                : "border-border text-text-secondary hover:bg-surface-hover"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-black">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 border-b border-border px-5 py-3 bg-background">
            <select value={accountFilter} onChange={(e) => updateFilter("account", e.target.value)} className="input-sm">
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Symbol..."
              value={symbolFilter}
              onChange={(e) => updateFilter("symbol", e.target.value)}
              className="input-sm w-28"
            />
            <select value={directionFilter} onChange={(e) => updateFilter("direction", e.target.value)} className="input-sm">
              <option value="">All Dirs</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <select value={sessionFilter} onChange={(e) => updateFilter("session", e.target.value)} className="input-sm">
              <option value="">All Sessions</option>
              {SESSIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => updateFilter("status", e.target.value)} className="input-sm">
              <option value="">All Status</option>
              <option value="closed">Closed</option>
              <option value="open">Open</option>
            </select>
            <input type="date" value={fromFilter} onChange={(e) => updateFilter("from", e.target.value)} className="input-sm" />
            <input type="date" value={toFilter} onChange={(e) => updateFilter("to", e.target.value)} className="input-sm" />
          </div>
        )}

        {/* Free plan banner */}
        <div className="border-b border-border bg-[#1a1a2e] px-5 py-2.5">
          <p className="text-sm text-text-secondary">
            Free plan loads <span className="font-semibold text-text-primary">your last 15 trades</span>.
            Upgrade to Pro to unlock full history and longer timeframes.
          </p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-16 text-center text-text-secondary">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-text-secondary">No trades found.</p>
            <Link href="/dashboard/trades/add" className="mt-3 inline-block text-accent hover:underline">
              Add your first trade
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-text-secondary">
                <tr>
                  <Th onClick={() => updateFilter("sort", "date")} active={sortBy === "date"}>
                    OPEN / CLOSE
                  </Th>
                  <Th onClick={() => updateFilter("sort", "symbol")} active={sortBy === "symbol"}>
                    SYMBOL
                  </Th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">TYPE</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">ENTRY</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">EXIT</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">SIZE</th>
                  <Th onClick={() => updateFilter("sort", "pnl")} active={sortBy === "pnl"} className="text-right">
                    P&L
                  </Th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">SOURCE</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider w-20" />
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/dashboard/trades/${t.id}`)}
                    className="group cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs text-text-secondary">
                        Open: {t.entry_timestamp ? format(parseISO(t.entry_timestamp), "MMM d h:mm a") : "—"}
                      </div>
                      <div className="text-xs text-text-primary font-medium">
                        Close: {t.exit_timestamp ? format(parseISO(t.exit_timestamp), "MMM d hh:mm a") : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                          t.pnl && t.pnl >= 0 ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                        )}>
                          {t.pnl && t.pnl >= 0 ? "●" : "●"}
                        </span>
                        <span className="font-medium text-text-primary">{t.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
                        t.direction === "buy" ? "text-profit" : "text-loss"
                      )}>
                        {t.direction === "buy" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {t.direction === "buy" ? "Long" : "Short"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-text-primary">${t.entry_price}</td>
                    <td className="px-4 py-3.5 text-right text-text-primary">{t.exit_price ? `$${t.exit_price}` : "—"}</td>
                    <td className="px-4 py-3.5 text-right text-text-secondary">{t.position_size}</td>
                    <td className={cn("px-4 py-3.5 text-right font-semibold", (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                      {t.pnl != null ? formatCurrency(t.pnl) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        t.import_source === "mt5"
                          ? "border-profit/30 text-profit"
                          : t.import_source === "csv"
                          ? "border-accent/30 text-accent"
                          : "border-border text-text-secondary"
                      )}>
                        {t.import_source === "manual" && <Pencil className="h-2.5 w-2.5" />}
                        {t.import_source === "mt5" && <Link2 className="h-2.5 w-2.5" />}
                        {t.import_source === "csv" && "CSV"}
                        {t.import_source === "manual" ? "Manual" : t.import_source === "mt5" ? "MT5" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/trades/${t.id}`);
                          }}
                          className="rounded p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteTrade(e, t.id)}
                          className="rounded p-1.5 text-text-secondary transition-colors hover:bg-loss/10 hover:text-loss"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-sm text-text-secondary">
              Showing {(page - 1) * TRADES_PER_PAGE + 1}–{Math.min(page * TRADES_PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <button
                  onClick={() => updateFilter("page", String(page - 1))}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
              )}
              {page < totalPages && (
                <button
                  onClick={() => updateFilter("page", String(page + 1))}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, onClick, active, className }: {
  children: React.ReactNode; onClick: () => void; active: boolean; className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider select-none transition-colors hover:text-text-primary",
        active ? "text-accent" : "text-text-secondary",
        className
      )}
    >
      {children}
    </th>
  );
}
