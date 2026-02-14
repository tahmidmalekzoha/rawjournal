"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Link2, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import type { Account } from "@/types";

type AccountSummary = Pick<Account, "id" | "label" | "broker" | "mt5_server" | "mt5_login" | "account_currency" | "initial_balance" | "current_balance" | "current_equity" | "sync_enabled" | "last_sync_at" | "last_sync_status" | "last_sync_error" | "sync_fail_count" | "created_at">;

export default function AccountsSettingsPage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [form, setForm] = useState({
    label: "",
    broker: "",
    mt5_server: "",
    mt5_login: "",
    investor_password: "",
    account_currency: "USD",
    initial_balance: "",
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const { data } = await supabase
      .from("accounts")
      .select("id, label, broker, mt5_server, mt5_login, account_currency, initial_balance, current_balance, current_equity, sync_enabled, last_sync_at, last_sync_status, last_sync_error, sync_fail_count, created_at")
      .order("created_at");
    setAccounts(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          initial_balance: form.initial_balance ? parseFloat(form.initial_balance) : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect account");
        setSubmitting(false);
        return;
      }

      setAccounts([...accounts, data]);
      setForm({ label: "", broker: "", mt5_server: "", mt5_login: "", investor_password: "", account_currency: "USD", initial_balance: "" });
      setShowForm(false);
      setShowPassword(false);
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Disconnect this MT5 account? All synced trades will remain but future syncing will stop.")) return;

    const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setAccounts(accounts.filter((a) => a.id !== id));
    }
  }

  function syncStatusBadge(account: AccountSummary) {
    const status = account.last_sync_status;
    if (status === "success") return <span className="inline-flex items-center gap-1 text-xs text-profit"><CheckCircle2 className="h-3 w-3" /> Synced</span>;
    if (status === "syncing") return <span className="inline-flex items-center gap-1 text-xs text-accent"><Loader2 className="h-3 w-3 animate-spin" /> Syncing</span>;
    if (status === "error") return <span className="inline-flex items-center gap-1 text-xs text-loss" title={account.last_sync_error || ""}><AlertCircle className="h-3 w-3" /> Error</span>;
    return <span className="text-xs text-text-secondary">Pending</span>;
  }

  if (loading) return <div className="py-12 text-center text-sm text-text-secondary">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">MT5 Accounts</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" /> Connect Account
          </button>
        )}
      </div>

      {/* Connect form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-text-secondary">Connect MT5 Account</label>
            <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-text-secondary">Account Label</label>
              <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. IC Markets Demo" className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Broker <span className="text-loss">*</span></label>
              <input type="text" value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="e.g. IC Markets" required className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">MT5 Server <span className="text-loss">*</span></label>
              <input type="text" value={form.mt5_server} onChange={(e) => setForm({ ...form, mt5_server: e.target.value })} placeholder="e.g. ICMarketsSC-Demo" required className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">MT5 Login <span className="text-loss">*</span></label>
              <input type="text" value={form.mt5_login} onChange={(e) => setForm({ ...form, mt5_login: e.target.value })} placeholder="e.g. 12345678" required className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Investor Password <span className="text-loss">*</span></label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.investor_password} onChange={(e) => setForm({ ...form, investor_password: e.target.value })} placeholder="Read-only password" required className="input w-full pr-9" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-text-secondary">Investor (read-only) password only. Never share your master password.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Currency</label>
              <select value={form.account_currency} onChange={(e) => setForm({ ...form, account_currency: e.target.value })} className="input w-full">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="AUD">AUD</option>
                <option value="CAD">CAD</option>
                <option value="CHF">CHF</option>
                <option value="NZD">NZD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Initial Balance</label>
              <input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} placeholder="e.g. 10000" className="input w-full" />
            </div>
          </div>

          <button type="submit" disabled={submitting || !form.broker || !form.mt5_server || !form.mt5_login || !form.investor_password} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {submitting ? "Connecting..." : "Connect Account"}
          </button>
        </form>
      )}

      {/* Account list */}
      {accounts.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <Link2 className="mb-3 h-8 w-8 text-text-secondary/40" />
          <p className="text-sm text-text-secondary">No MT5 accounts connected.</p>
          <p className="mt-1 text-xs text-text-secondary/60">Connect your MetaTrader 5 account to auto-sync trades.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-sm text-accent transition-colors hover:text-accent-hover">
            Connect your first account
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{account.label}</span>
                    {syncStatusBadge(account)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span>{account.broker}</span>
                    <span className="text-text-secondary/30">·</span>
                    <span>{account.mt5_server}</span>
                    <span className="text-text-secondary/30">·</span>
                    <span>Login: {account.mt5_login}</span>
                  </div>
                  {account.current_balance != null && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-text-secondary">Balance: <span className="text-text-primary">{account.account_currency} {account.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                      {account.current_equity != null && (
                        <span className="text-text-secondary">Equity: <span className="text-text-primary">{account.account_currency} {account.current_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                      )}
                    </div>
                  )}
                  {account.last_sync_at && (
                    <p className="text-[10px] text-text-secondary/50">Last sync: {new Date(account.last_sync_at).toLocaleString()}</p>
                  )}
                </div>
                <button onClick={() => handleDelete(account.id)} title="Disconnect account" className="shrink-0 rounded-lg p-1.5 text-text-secondary/40 transition-colors hover:bg-loss/10 hover:text-loss">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
