"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calculatePnl } from "@/lib/utils/calculations";
import { FOREX_PAIRS, FREE_TIER_TRADE_LIMIT } from "@/lib/constants";
import { ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils/format";
import type { Account, Profile } from "@/types";

export default function AddTradePage() {
  const router = useRouter();
  const supabase = createClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [symbolSearch, setSymbolSearch] = useState("");
  const [showSymbols, setShowSymbols] = useState(false);

  const [form, setForm] = useState({
    account_id: "",
    symbol: "",
    direction: "buy" as "buy" | "sell",
    entry_timestamp: "",
    exit_timestamp: "",
    entry_price: "",
    exit_price: "",
    position_size: "0.01",
    stop_loss: "",
    take_profit: "",
    commission: "0",
    swap: "0",
  });

  useEffect(() => {
    async function load() {
      const { data: accs } = await supabase.from("accounts").select("*");
      const { data: prof } = await supabase.from("profiles").select("*").single();
      setAccounts(accs || []);
      setProfile(prof);
      if (accs?.length) setForm((f) => ({ ...f, account_id: accs[0].id }));
    }
    load();
  }, []);

  const filteredPairs = FOREX_PAIRS.filter((p) =>
    p.toLowerCase().includes(symbolSearch.toLowerCase())
  );

  const autoCalc = form.exit_price && form.entry_price && form.symbol
    ? calculatePnl(
        form.direction,
        parseFloat(form.entry_price),
        parseFloat(form.exit_price),
        parseFloat(form.position_size) || 0.01,
        form.symbol
      )
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.account_id) { setError("Select an account"); return; }
    if (!form.symbol) { setError("Enter a symbol"); return; }
    if (!form.entry_price) { setError("Enter an entry price"); return; }
    if (!form.entry_timestamp) { setError("Enter entry date/time"); return; }

    if (profile?.subscription_tier === "free") {
      if ((profile.trade_count_this_month || 0) >= FREE_TIER_TRADE_LIMIT) {
        setError(`Free tier limit: ${FREE_TIER_TRADE_LIMIT} trades/month. Upgrade to add more.`);
        return;
      }
    }

    setLoading(true);

    const tradeData = {
      account_id: form.account_id,
      ticket_number: `manual-${Date.now()}`,
      symbol: form.symbol.toUpperCase(),
      direction: form.direction,
      entry_timestamp: new Date(form.entry_timestamp).toISOString(),
      exit_timestamp: form.exit_timestamp ? new Date(form.exit_timestamp).toISOString() : null,
      entry_price: parseFloat(form.entry_price),
      exit_price: form.exit_price ? parseFloat(form.exit_price) : null,
      position_size: parseFloat(form.position_size) || 0.01,
      pnl: autoCalc?.pnl ?? null,
      pnl_pips: autoCalc?.pips ?? null,
      commission: parseFloat(form.commission) || 0,
      swap: parseFloat(form.swap) || 0,
      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
      take_profit: form.take_profit ? parseFloat(form.take_profit) : null,
      status: form.exit_price ? "closed" : "open",
      import_source: "manual",
    };

    const { data, error: insertError } = await supabase
      .from("trades")
      .insert(tradeData)
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    if (profile?.subscription_tier === "free") {
      await supabase
        .from("profiles")
        .update({ trade_count_this_month: (profile.trade_count_this_month || 0) + 1 })
        .eq("id", profile.id);
    }

    router.push(`/dashboard/trades/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/trades"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to trades
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Add Trade</h1>
        </div>
      </div>

      {profile?.subscription_tier === "free" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-secondary">
          <Info className="h-4 w-4 shrink-0" />
          Free tier: {(profile.trade_count_this_month || 0)}/{FREE_TIER_TRADE_LIMIT} trades this month
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Account */}
        <Field label="Account">
          <select
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            className="input"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.label} ({a.broker})</option>
            ))}
          </select>
        </Field>

        {/* Symbol */}
        <Field label="Symbol">
          <div className="relative">
            <input
              type="text"
              value={form.symbol || symbolSearch}
              onChange={(e) => {
                setSymbolSearch(e.target.value);
                setForm({ ...form, symbol: e.target.value.toUpperCase() });
                setShowSymbols(true);
              }}
              onFocus={() => setShowSymbols(true)}
              onBlur={() => setTimeout(() => setShowSymbols(false), 200)}
              placeholder="e.g. EURUSD"
              className="input"
            />
            {showSymbols && filteredPairs.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                {filteredPairs.slice(0, 8).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onMouseDown={() => { setForm({ ...form, symbol: p }); setSymbolSearch(""); setShowSymbols(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        {/* Direction */}
        <Field label="Direction">
          <div className="grid grid-cols-2 gap-2">
            {(["buy", "sell"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm({ ...form, direction: d })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all",
                  form.direction === d
                    ? d === "buy"
                      ? "border-profit bg-profit/10 text-profit"
                      : "border-loss bg-loss/10 text-loss"
                    : "border-border text-text-secondary hover:bg-surface-hover"
                )}
              >
                {d === "buy" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {d === "buy" ? "Long" : "Short"}
              </button>
            ))}
          </div>
        </Field>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry Date/Time">
            <input
              type="datetime-local"
              value={form.entry_timestamp}
              onChange={(e) => setForm({ ...form, entry_timestamp: e.target.value })}
              required
              className="input"
            />
          </Field>
          <Field label="Exit Date/Time" optional>
            <input
              type="datetime-local"
              value={form.exit_timestamp}
              onChange={(e) => setForm({ ...form, exit_timestamp: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry Price">
            <input type="number" step="any" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: e.target.value })} required className="input tabular-nums" />
          </Field>
          <Field label="Exit Price" optional>
            <input type="number" step="any" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: e.target.value })} className="input tabular-nums" />
          </Field>
        </div>

        {/* Lot size */}
        <Field label="Lot Size">
          <input type="number" step="0.01" min="0.01" max="100" value={form.position_size} onChange={(e) => setForm({ ...form, position_size: e.target.value })} className="input tabular-nums" />
        </Field>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stop Loss" optional>
            <input type="number" step="any" value={form.stop_loss} onChange={(e) => setForm({ ...form, stop_loss: e.target.value })} className="input tabular-nums" />
          </Field>
          <Field label="Take Profit" optional>
            <input type="number" step="any" value={form.take_profit} onChange={(e) => setForm({ ...form, take_profit: e.target.value })} className="input tabular-nums" />
          </Field>
        </div>

        {/* Commission / Swap */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Commission">
            <input type="number" step="0.01" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} className="input tabular-nums" />
          </Field>
          <Field label="Swap">
            <input type="number" step="0.01" value={form.swap} onChange={(e) => setForm({ ...form, swap: e.target.value })} className="input tabular-nums" />
          </Field>
        </div>

        {/* Auto P&L preview */}
        {autoCalc && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-secondary">Calculated P&L</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${autoCalc.pnl >= 0 ? "text-profit" : "text-loss"}`}>
              ${autoCalc.pnl.toFixed(2)}
              <span className="ml-2 text-sm font-normal text-text-secondary">
                ({autoCalc.pips >= 0 ? "+" : ""}{autoCalc.pips.toFixed(1)} pips)
              </span>
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-loss/20 bg-loss/10 px-3 py-2.5 text-sm text-loss">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-accent py-3 font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
          ) : (
            "Add Trade"
          )}
        </button>
      </form>
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
        {optional && <span className="ml-1 normal-case tracking-normal text-text-secondary/50">(optional)</span>}
      </label>
      {children}
    </div>
  );
}
