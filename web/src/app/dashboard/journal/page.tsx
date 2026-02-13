"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatCurrency, cn } from "@/lib/utils/format";
import { MOODS } from "@/lib/constants";
import { BookOpen, Search, X } from "lucide-react";
import type { Journal, Trade } from "@/types";

interface JournalEntry extends Journal {
  trade: Trade;
}

export default function JournalListPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [moodFilter, setMoodFilter] = useState("");

  useEffect(() => {
    async function load() {
      const { data: journals } = await supabase
        .from("journals")
        .select("*, trade:trades(*)")
        .order("created_at", { ascending: false });

      setEntries(((journals as any) || []).filter((j: any) => j.trade));
      setLoading(false);
    }
    load();
  }, []);

  const allTags = [...new Set(entries.flatMap((e) => e.tags))];
  const hasFilters = search || tagFilter || moodFilter;

  const filtered = entries.filter((e) => {
    if (search && !e.notes?.toLowerCase().includes(search.toLowerCase())) return false;
    if (tagFilter && !e.tags.includes(tagFilter)) return false;
    if (moodFilter && e.mood !== moodFilter) return false;
    return true;
  });

  if (loading) return <div className="py-12 text-center text-sm text-text-secondary">Loading journal...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-text-primary">Journal</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-sm w-48 pl-8"
          />
        </div>
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="input-sm">
          <option value="">All Tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={moodFilter} onChange={(e) => setMoodFilter(e.target.value)} className="input-sm">
          <option value="">All Moods</option>
          {MOODS.map((m) => (
            <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setTagFilter(""); setMoodFilter(""); }}
            className="inline-flex items-center gap-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-16 text-center">
          <BookOpen className="mb-3 h-8 w-8 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">
            {entries.length === 0 ? "No journal entries yet." : "No entries match filters."}
          </p>
          {entries.length === 0 && (
            <p className="mt-1 text-xs text-text-secondary/60">Add notes to your trades to start journaling.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const moodInfo = MOODS.find((m) => m.value === entry.mood);
            const trade = entry.trade;

            return (
              <Link
                key={entry.id}
                href={`/dashboard/trades/${entry.trade_id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-text-primary">{trade?.symbol}</span>
                    <span className={cn("text-xs font-medium", trade?.direction === "buy" ? "text-profit" : "text-loss")}>
                      {trade?.direction?.toUpperCase()}
                    </span>
                    {trade?.pnl != null && (
                      <span className={cn("font-medium tabular-nums", trade.pnl >= 0 ? "text-profit" : "text-loss")}>
                        {formatCurrency(trade.pnl)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {moodInfo && <span title={moodInfo.label}>{moodInfo.emoji}</span>}
                    {entry.setup_quality != null && entry.setup_quality > 0 && (
                      <span className="text-xs text-accent">{"★".repeat(entry.setup_quality)}</span>
                    )}
                    {entry.followed_plan === true && <span className="text-xs text-profit">Plan ✓</span>}
                    {entry.followed_plan === false && <span className="text-xs text-loss">Plan ✗</span>}
                  </div>
                </div>

                {entry.notes && (
                  <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{entry.notes}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-text-secondary">
                      {tag}
                    </span>
                  ))}
                  {entry.screenshot_urls.length > 0 && (
                    <span className="text-xs text-text-secondary">📷 {entry.screenshot_urls.length}</span>
                  )}
                  <span className="ml-auto text-xs text-text-secondary/60">
                    {trade?.exit_timestamp ? formatDateTime(trade.exit_timestamp) : formatDateTime(trade?.entry_timestamp || entry.created_at)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
