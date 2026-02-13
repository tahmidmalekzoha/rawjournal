"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils/format";
import { SESSIONS, TRADES_PER_PAGE } from "@/lib/constants";
import {
  Plus,
  Filter,
  Trash2,
  Pencil,
  Link2,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  ArrowUpDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Trade, Account } from "@/types";

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-text-secondary">Loading trades...</div>}>
      <TradesContent />
    </Suspense>
  );
}

function TradesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

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

  function toggleSort(col: string) {
    if (sortBy === col) {
      updateFilter("dir", sortDir === "asc" ? "desc" : "asc");
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", col);
      params.set("dir", "desc");
      params.delete("page");
      router.push(`/dashboard/trades?${params.toString()}`);
    }
  }

  async function handleDeleteTrade(e: React.MouseEvent, tradeId: string) {
    e.stopPropagation();
    if (!confirm("Delete this trade?")) return;
    await supabase.from("trades").delete().eq("id", tradeId);
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
    setTotal((prev) => prev - 1);
  }

  function clearFilters() {
    router.push("/dashboard/trades?status=closed");
  }

  const totalPages = Math.ceil(total / TRADES_PER_PAGE);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trades</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {total} {statusFilter || "total"} trade{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/trades/import"
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Link>
          <Link
            href="/dashboard/trades/add"
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            Add Trade
          </Link>
        </div>
      </div>

      {/* Trade table card */}
      <div className="rounded-xl border border-border bg-surface">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Status toggle */}
            <div className="flex rounded-lg border border-border bg-background p-0.5">
              {["closed", "open", ""].map((s) => (
                <button
                  key={s}
                  onClick={() => updateFilter("status", s)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-white/[0.08] text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {s === "" ? "All" : s === "closed" ? "Closed" : "Open"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                showFilters || activeFilterCount > 0
                  ? "border-accent/30 bg-accent/5 text-text-primary"
                  : "border-border text-text-secondary hover:bg-surface-hover"
              )}
            >
              <Filter className="h-3 w-3" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="border-b border-border bg-background px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <FilterField label="Account">
                <select value={accountFilter} onChange={(e) => updateFilter("account", e.target.value)} className="input-sm">
                  <option value="">All</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </FilterField>
              <FilterField label="Symbol">
                <input type="text" placeholder="e.g. EURUSD" value={symbolFilter} onChange={(e) => updateFilter("symbol", e.target.value)} className="input-sm w-28" />
              </FilterField>
              <FilterField label="Direction">
                <select value={directionFilter} onChange={(e) => updateFilter("direction", e.target.value)} className="input-sm">
                  <option value="">All</option>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </FilterField>
              <FilterField label="Session">
                <select value={sessionFilter} onChange={(e) => updateFilter("session", e.target.value)} className="input-sm">
                  <option value="">All</option>
                  {SESSIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </FilterField>
              <FilterField label="From">
                <input type="date" value={fromFilter} onChange={(e) => updateFilter("from", e.target.value)} className="input-sm" />
              </FilterField>
              <FilterField label="To">
                <input type="date" value={toFilter} onChange={(e) => updateFilter("to", e.target.value)} className="input-sm" />
              </FilterField>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-text-secondary hover:text-loss transition-colors">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-sm text-text-secondary">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-text-secondary">No trades found</p>
            <Link href="/dashboard/trades/add" className="mt-2 inline-block text-sm text-accent hover:underline">
              Add your first trade
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-text-secondary">
                <tr>
                  <ThSort label="Date" col="date" current={sortBy} dir={sortDir} onClick={toggleSort} />
                  <ThSort label="Symbol" col="symbol" current={sortBy} dir={sortDir} onClick={toggleSort} />
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider">Side</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">Entry</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">Exit</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider">Size</th>
                  <ThSort label="P&L" col="pnl" current={sortBy} dir={sortDir} onClick={toggleSort} className="text-right" />
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider">Source</th>
                  <th className="px-4 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/dashboard/trades/${t.id}`)}
                    className="group cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-text-primary">
                        {t.exit_timestamp ? format(parseISO(t.exit_timestamp), "MMM d, yyyy") : "Open"}
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {t.entry_timestamp ? format(parseISO(t.entry_timestamp), "HH:mm") : ""}
                        {t.exit_timestamp ? ` — ${format(parseISO(t.exit_timestamp), "HH:mm")}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-primary">{t.symbol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        t.direction === "buy" ? "text-profit" : "text-loss"
                      )}>
                        {t.direction === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {t.direction === "buy" ? "Long" : "Short"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">{t.entry_price}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">{t.exit_price ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{t.position_size}</td>
                    <td className={cn("px-4 py-3 text-right tabular-nums font-medium", (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                      {t.pnl != null ? formatCurrency(t.pnl) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        t.import_source === "mt5"
                          ? "border-profit/20 text-profit"
                          : t.import_source === "csv"
                            ? "border-accent/20 text-accent"
                            : "border-border text-text-secondary"
                      )}>
                        {t.import_source === "manual" && <Pencil className="h-2.5 w-2.5" />}
                        {t.import_source === "mt5" && <Link2 className="h-2.5 w-2.5" />}
                        {t.import_source === "manual" ? "Manual" : t.import_source === "mt5" ? "MT5" : "CSV"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => handleDeleteTrade(e, t.id)}
                          className="rounded p-1 text-text-secondary transition-colors hover:text-loss"
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
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-text-secondary">
              {(page - 1) * TRADES_PER_PAGE + 1}–{Math.min(page * TRADES_PER_PAGE, total)} of {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => updateFilter("page", String(page - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <button
                onClick={() => updateFilter("page", String(page + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThSort({ label, col, current, dir, onClick, className }: {
  label: string; col: string; current: string; dir: string; onClick: (col: string) => void; className?: string;
}) {
  const active = current === col;
  return (
    <th
      onClick={() => onClick(col)}
      className={cn(
        "cursor-pointer select-none px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors hover:text-text-primary",
        active ? "text-accent" : "text-text-secondary",
        className || "text-left"
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", active ? "opacity-100" : "opacity-0")} />
      </span>
    </th>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">{label}</label>
      {children}
    </div>
  );
}
