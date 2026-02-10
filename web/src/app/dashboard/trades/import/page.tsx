"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseCsvFile, mapRowToTrade } from "@/lib/utils/csv-parser";
import type { Account, CsvColumnMapping } from "@/types";
import type { CsvParseResult } from "@/lib/utils/csv-parser";

export default function ImportTradesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("accounts").select("*");
      setAccounts(data || []);
      if (data?.length) setAccountId(data[0].id);
    }
    load();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setError("");
    setResult(null);
    try {
      const parsed = await parseCsvFile(file);
      setParseResult(parsed);
      setMapping(parsed.suggestedMapping);
    } catch {
      setError("Failed to parse file. Ensure it is a valid CSV.");
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    if (!parseResult || !accountId) return;
    setImporting(true);
    setError("");

    const trades = parseResult.rows.map((row) =>
      mapRowToTrade(row, mapping, accountId, parseResult.detectedFormat === "mt5")
    ).filter((t) => t.symbol && t.entry_price);

    if (trades.length === 0) {
      setError("No valid trades found. Check your column mapping.");
      setImporting(false);
      return;
    }

    const res = await fetch("/api/trades/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trades, account_id: accountId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Import failed");
      setImporting(false);
      return;
    }

    setResult(data);
    setImporting(false);
  }

  const mappingFields: { key: keyof CsvColumnMapping; label: string; required: boolean }[] = [
    { key: "ticket_number", label: "Ticket/Deal #", required: false },
    { key: "symbol", label: "Symbol", required: true },
    { key: "direction", label: "Direction (Buy/Sell)", required: true },
    { key: "entry_timestamp", label: "Entry Time", required: true },
    { key: "exit_timestamp", label: "Exit Time", required: false },
    { key: "entry_price", label: "Entry Price", required: true },
    { key: "exit_price", label: "Exit Price", required: false },
    { key: "position_size", label: "Lot Size", required: true },
    { key: "pnl", label: "Profit/Loss", required: false },
    { key: "commission", label: "Commission", required: false },
    { key: "swap", label: "Swap", required: false },
    { key: "stop_loss", label: "Stop Loss", required: false },
    { key: "take_profit", label: "Take Profit", required: false },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Import Trades</h1>
        <button onClick={() => router.back()} className="text-sm text-text-secondary hover:text-text-primary">
          Cancel
        </button>
      </div>

      {/* Account selector */}
      <div>
        <label className="mb-1.5 block text-sm text-text-secondary">Account</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.label} ({a.broker})</option>
          ))}
        </select>
      </div>

      {/* File dropzone */}
      {!parseResult && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            dragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
          }`}
        >
          <p className="text-lg font-medium text-text-primary">Drop CSV file here</p>
          <p className="mt-1 text-sm text-text-secondary">or click to browse</p>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileInput}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <p className="mt-4 text-xs text-text-secondary">Supports MT5 CSV exports and custom formats</p>
        </div>
      )}

      {/* Parse result */}
      {parseResult && !result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
            <div>
              <p className="font-medium">{parseResult.rows.length} rows detected</p>
              <p className="text-sm text-text-secondary">
                Format: {parseResult.detectedFormat === "mt5" ? "MT5 Export (auto-detected)" : "Generic CSV"}
              </p>
            </div>
            <button
              onClick={() => { setParseResult(null); setMapping({}); }}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Reset
            </button>
          </div>

          {/* Column mapping */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Column Mapping</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {mappingFields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs text-text-secondary">
                    {field.label} {field.required && <span className="text-loss">*</span>}
                  </label>
                  <select
                    value={mapping[field.key] || ""}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value || undefined })}
                    className="input text-sm"
                  >
                    <option value="">— Skip —</option>
                    {parseResult.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Preview (first 5 rows)</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-surface text-text-secondary">
                  <tr>
                    {parseResult.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {parseResult.headers.map((h) => (
                        <td key={h} className="px-3 py-2 whitespace-nowrap">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full rounded-lg bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {importing ? `Importing...` : `Import ${parseResult.rows.length} Trades`}
          </button>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-6 text-center">
          <h2 className="text-xl font-bold text-profit">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{result.imported}</p>
              <p className="text-sm text-text-secondary">Imported</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-secondary">{result.duplicates}</p>
              <p className="text-sm text-text-secondary">Duplicates skipped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-loss">{result.errors}</p>
              <p className="text-sm text-text-secondary">Errors</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard/trades")}
            className="rounded-lg bg-accent px-6 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            View Trades
          </button>
        </div>
      )}

      {error && <p className="text-sm text-loss">{error}</p>}
    </div>
  );
}
