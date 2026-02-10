"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatCurrency, formatPrice, cn } from "@/lib/utils/format";
import type { Trade, Journal, Tag } from "@/types";
import JournalEditor from "@/components/journal/journal-editor";

export default function TradeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [journal, setJournal] = useState<Journal | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tradeRes, journalRes, tagsRes] = await Promise.all([
        supabase.from("trades").select("*").eq("id", params.id).single(),
        supabase.from("journals").select("*").eq("trade_id", params.id).single(),
        supabase.from("tags").select("*"),
      ]);
      setTrade(tradeRes.data);
      setJournal(journalRes.data);
      setTags(tagsRes.data || []);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    await supabase.from("trades").delete().eq("id", params.id);
    router.push("/dashboard/trades");
  }

  if (loading) return <div className="py-12 text-center text-text-secondary">Loading...</div>;
  if (!trade) return <div className="py-12 text-center text-text-secondary">Trade not found.</div>;

  const duration = trade.exit_timestamp
    ? Math.round((new Date(trade.exit_timestamp).getTime() - new Date(trade.entry_timestamp).getTime()) / 60000)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/trades" className="mb-2 inline-block text-sm text-text-secondary hover:text-text-primary">
            &larr; All Trades
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{trade.symbol}</h1>
            <span className={cn(
              "rounded px-2 py-0.5 text-sm font-medium",
              trade.direction === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
            )}>
              {trade.direction.toUpperCase()}
            </span>
            <span className={cn(
              "rounded px-2 py-0.5 text-xs",
              trade.status === "open" ? "bg-accent/10 text-accent" : "bg-border text-text-secondary"
            )}>
              {trade.status.toUpperCase()}
            </span>
          </div>
          {trade.pnl != null && (
            <p className={cn("mt-1 text-3xl font-bold", trade.pnl >= 0 ? "text-profit" : "text-loss")}>
              {formatCurrency(trade.pnl)}
              {trade.pnl_pips != null && (
                <span className="ml-2 text-lg text-text-secondary">
                  ({trade.pnl_pips > 0 ? "+" : ""}{trade.pnl_pips} pips)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {trade.import_source === "manual" && (
            <button
              onClick={handleDelete}
              className="rounded-lg border border-border px-4 py-2 text-sm text-loss transition-colors hover:bg-loss/10"
            >
              Delete
            </button>
          )}
          <Link
            href={`/dashboard/charts/${trade.symbol}`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            View Chart
          </Link>
        </div>
      </div>

      {/* Trade Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Entry Price" value={formatPrice(trade.entry_price, trade.symbol)} />
        <MetricCard label="Exit Price" value={trade.exit_price ? formatPrice(trade.exit_price, trade.symbol) : "—"} />
        <MetricCard label="Lot Size" value={trade.position_size.toString()} />
        <MetricCard label="Duration" value={duration ? formatDuration(duration) : "Open"} />
        <MetricCard label="Entry Time" value={formatDateTime(trade.entry_timestamp)} />
        <MetricCard label="Exit Time" value={trade.exit_timestamp ? formatDateTime(trade.exit_timestamp) : "—"} />
        <MetricCard label="Commission" value={formatCurrency(trade.commission)} />
        <MetricCard label="Swap" value={formatCurrency(trade.swap)} />
        {trade.stop_loss && <MetricCard label="Stop Loss" value={formatPrice(trade.stop_loss, trade.symbol)} />}
        {trade.take_profit && <MetricCard label="Take Profit" value={formatPrice(trade.take_profit, trade.symbol)} />}
        <MetricCard label="Session" value={trade.session_tag || "—"} />
        <MetricCard label="Source" value={trade.import_source} />
      </div>

      {/* Journal section */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Trade Journal</h2>
        <JournalEditor
          tradeId={trade.id}
          journal={journal}
          tags={tags}
          onUpdate={setJournal}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}
