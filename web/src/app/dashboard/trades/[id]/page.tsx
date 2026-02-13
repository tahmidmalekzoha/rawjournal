"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatCurrency, formatPrice, cn } from "@/lib/utils/format";
import { ArrowLeft, ExternalLink, Trash2, TrendingUp, TrendingDown, Clock } from "lucide-react";
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

  if (loading) return <div className="py-20 text-center text-sm text-text-secondary">Loading...</div>;
  if (!trade) return <div className="py-20 text-center text-sm text-text-secondary">Trade not found.</div>;

  const duration = trade.exit_timestamp
    ? Math.round((new Date(trade.exit_timestamp).getTime() - new Date(trade.entry_timestamp).getTime()) / 60000)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back nav */}
      <Link
        href="/dashboard/trades"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to trades
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{trade.symbol}</h1>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                trade.direction === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
              )}>
                {trade.direction === "buy" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trade.direction.toUpperCase()}
              </span>
              <span className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                trade.status === "open" ? "bg-accent/10 text-accent" : "bg-white/5 text-text-secondary"
              )}>
                {trade.status}
              </span>
            </div>
            {trade.pnl != null && (
              <div className="mt-2 flex items-baseline gap-2">
                <p className={cn("text-3xl font-bold tabular-nums", trade.pnl >= 0 ? "text-profit" : "text-loss")}>
                  {formatCurrency(trade.pnl)}
                </p>
                {trade.pnl_pips != null && (
                  <span className="text-sm text-text-secondary">
                    {trade.pnl_pips > 0 ? "+" : ""}{trade.pnl_pips} pips
                  </span>
                )}
              </div>
            )}
            {duration != null && (
              <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="h-3 w-3" />
                {formatDuration(duration)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/charts/${trade.symbol}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Chart
            </Link>
            {trade.import_source === "manual" && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-loss/30 hover:text-loss"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Entry Price" value={formatPrice(trade.entry_price, trade.symbol)} />
        <MetricCard label="Exit Price" value={trade.exit_price ? formatPrice(trade.exit_price, trade.symbol) : "—"} />
        <MetricCard label="Lot Size" value={trade.position_size.toString()} />
        <MetricCard label="Duration" value={duration ? formatDuration(duration) : "Open"} />
        <MetricCard label="Entry Time" value={formatDateTime(trade.entry_timestamp)} />
        <MetricCard label="Exit Time" value={trade.exit_timestamp ? formatDateTime(trade.exit_timestamp) : "—"} />
        <MetricCard label="Commission" value={formatCurrency(trade.commission)} />
        <MetricCard label="Swap" value={formatCurrency(trade.swap)} />
        {trade.stop_loss && <MetricCard label="Stop Loss" value={formatPrice(trade.stop_loss, trade.symbol)} highlight="loss" />}
        {trade.take_profit && <MetricCard label="Take Profit" value={formatPrice(trade.take_profit, trade.symbol)} highlight="profit" />}
        <MetricCard label="Session" value={trade.session_tag || "—"} />
        <MetricCard label="Source" value={trade.import_source} />
      </div>

      {/* Journal section */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Trade Journal</h2>
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

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: "profit" | "loss" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">{label}</p>
      <p className={cn(
        "mt-1 text-sm font-medium tabular-nums",
        highlight === "profit" ? "text-profit" : highlight === "loss" ? "text-loss" : "text-text-primary"
      )}>
        {value}
      </p>
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
