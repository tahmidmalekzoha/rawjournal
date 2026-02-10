"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatCurrency, cn } from "@/lib/utils/format";
import { SESSIONS, TRADES_PER_PAGE } from "@/lib/constants";
import type { Trade, Account } from "@/types";

export default function TradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

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

  const totalPages = Math.ceil(total / TRADES_PER_PAGE);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Trades</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/trades/import"
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Import CSV
          </Link>
          <Link
            href="/dashboard/trades/add"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            + Add Trade
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-text-secondary">Loading trades...</div>
      ) : trades.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-text-secondary">No trades found.</p>
          <Link href="/dashboard/trades/add" className="mt-3 inline-block text-accent hover:underline">
            Add your first trade
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-text-secondary">
                <tr>
                  <Th onClick={() => updateFilter("sort", "date")} active={sortBy === "date"}>Date</Th>
                  <Th onClick={() => updateFilter("sort", "symbol")} active={sortBy === "symbol"}>Symbol</Th>
                  <th className="px-4 py-3 text-left">Dir</th>
                  <th className="px-4 py-3 text-right">Size</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Exit</th>
                  <Th onClick={() => updateFilter("sort", "pnl")} active={sortBy === "pnl"} className="text-right">P&L</Th>
                  <th className="px-4 py-3 text-left">Session</th>
                  <th className="px-4 py-3 text-center">Journal</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/dashboard/trades/${t.id}`)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                      {t.exit_timestamp ? formatDateTime(t.exit_timestamp) : formatDateTime(t.entry_timestamp)}
                    </td>
                    <td className="px-4 py-3 font-medium">{t.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-block rounded px-2 py-0.5 text-xs font-medium",
                        t.direction === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                      )}>
                        {t.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{t.position_size}</td>
                    <td className="px-4 py-3 text-right">{t.entry_price}</td>
                    <td className="px-4 py-3 text-right">{t.exit_price ?? "—"}</td>
                    <td className={cn("px-4 py-3 text-right font-medium", (t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss")}>
                      {t.pnl != null ? formatCurrency(t.pnl) : "—"}
                      {t.pnl_pips != null && (
                        <span className="ml-1 text-xs text-text-secondary">({t.pnl_pips > 0 ? "+" : ""}{t.pnl_pips}p)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{t.session_tag ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-text-secondary">📝</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Showing {(page - 1) * TRADES_PER_PAGE + 1}–{Math.min(page * TRADES_PER_PAGE, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <button
                    onClick={() => updateFilter("page", String(page - 1))}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
                  >
                    Prev
                  </button>
                )}
                {page < totalPages && (
                  <button
                    onClick={() => updateFilter("page", String(page + 1))}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-hover"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
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
        "cursor-pointer px-4 py-3 text-left select-none transition-colors hover:text-text-primary",
        active ? "text-accent" : "",
        className
      )}
    >
      {children}
    </th>
  );
}
