import Papa from "papaparse";
import type { CsvColumnMapping } from "@/types";

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  detectedFormat: "mt5" | "generic";
  suggestedMapping: CsvColumnMapping;
}

const MT5_HEADERS = ["deal", "time", "type", "symbol", "volume", "price", "profit"];

function detectMt5Format(headers: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return MT5_HEADERS.every((h) => lower.includes(h));
}

function suggestMapping(headers: string[], isMt5: boolean): CsvColumnMapping {
  const lower = headers.map((h) => h.toLowerCase().trim());

  if (isMt5) {
    return {
      ticket_number: headers[lower.indexOf("deal")] || headers[lower.indexOf("order")] || undefined,
      symbol: headers[lower.indexOf("symbol")] || undefined,
      direction: headers[lower.indexOf("type")] || undefined,
      entry_timestamp: headers[lower.indexOf("time")] || undefined,
      entry_price: headers[lower.indexOf("price")] || undefined,
      position_size: headers[lower.indexOf("volume")] || undefined,
      pnl: headers[lower.indexOf("profit")] || undefined,
      commission: headers[lower.indexOf("commission")] || undefined,
      swap: headers[lower.indexOf("swap")] || undefined,
    };
  }

  // Generic heuristic
  const find = (keywords: string[]) =>
    headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k))) || undefined;

  return {
    ticket_number: find(["ticket", "deal", "order", "id"]),
    symbol: find(["symbol", "pair", "instrument"]),
    direction: find(["type", "direction", "side"]),
    entry_timestamp: find(["open time", "entry time", "entry date", "open date", "time"]),
    exit_timestamp: find(["close time", "exit time", "close date", "exit date"]),
    entry_price: find(["open price", "entry price", "entry"]),
    exit_price: find(["close price", "exit price", "exit"]),
    position_size: find(["volume", "lot", "size", "quantity"]),
    pnl: find(["profit", "pnl", "p&l", "net profit"]),
    commission: find(["commission", "comm"]),
    swap: find(["swap"]),
    stop_loss: find(["sl", "stop loss", "stop"]),
    take_profit: find(["tp", "take profit", "target"]),
  };
}

export function parseCsvFile(file: File): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        const isMt5 = detectMt5Format(headers);
        resolve({
          headers,
          rows,
          detectedFormat: isMt5 ? "mt5" : "generic",
          suggestedMapping: suggestMapping(headers, isMt5),
        });
      },
      error(err) {
        reject(err);
      },
    });
  });
}

export function mapRowToTrade(
  row: Record<string, string>,
  mapping: CsvColumnMapping,
  accountId: string,
  isMt5: boolean
) {
  const getVal = (key: keyof CsvColumnMapping) => {
    const col = mapping[key];
    return col ? (row[col] ?? "").trim() : "";
  };

  const rawDirection = getVal("direction").toLowerCase();
  let direction: "buy" | "sell" = "buy";
  if (rawDirection.includes("sell") || rawDirection === "1") direction = "sell";

  const entryPrice = parseFloat(getVal("entry_price")) || 0;
  const exitPrice = parseFloat(getVal("exit_price")) || undefined;
  const pnl = parseFloat(getVal("pnl")) || undefined;
  const symbol = getVal("symbol").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const ticket = getVal("ticket_number") || `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    account_id: accountId,
    ticket_number: ticket,
    symbol,
    direction,
    entry_timestamp: getVal("entry_timestamp") || new Date().toISOString(),
    exit_timestamp: getVal("exit_timestamp") || (exitPrice ? new Date().toISOString() : null),
    entry_price: entryPrice,
    exit_price: exitPrice ?? null,
    position_size: parseFloat(getVal("position_size")) || 0.01,
    pnl: pnl ?? null,
    pnl_pips: null,
    commission: parseFloat(getVal("commission")) || 0,
    swap: parseFloat(getVal("swap")) || 0,
    stop_loss: parseFloat(getVal("stop_loss")) || null,
    take_profit: parseFloat(getVal("take_profit")) || null,
    status: (exitPrice || pnl != null ? "closed" : "open") as "open" | "closed",
    import_source: "csv" as const,
  };
}
