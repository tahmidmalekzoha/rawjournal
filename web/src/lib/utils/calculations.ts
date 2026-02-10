import type { Trade } from "@/types";

/** Pip size for a given symbol */
export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return 0.01;
  if (s.startsWith("XAU")) return 0.1;
  if (s.startsWith("XAG")) return 0.01;
  return 0.0001;
}

/** Calculate P&L in pips */
export function calculatePips(
  direction: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
  symbol: string
): number {
  const pip = pipSize(symbol);
  return direction === "buy"
    ? (exitPrice - entryPrice) / pip
    : (entryPrice - exitPrice) / pip;
}

/** Estimate P&L in USD (simplified — assumes pip value based on standard lot) */
export function calculatePnl(
  direction: "buy" | "sell",
  entryPrice: number,
  exitPrice: number,
  lotSize: number,
  symbol: string
): { pnl: number; pips: number } {
  const pips = calculatePips(direction, entryPrice, exitPrice, symbol);
  const s = symbol.toUpperCase();
  let pipValue: number;

  if (s.includes("JPY")) {
    pipValue = lotSize * 1000 * 0.01; // ~$1000 per lot per pip for JPY
  } else if (s.startsWith("XAU")) {
    pipValue = lotSize * 100 * 0.1; // Gold: $1 per 0.1 per standard lot
  } else {
    pipValue = lotSize * 100000 * 0.0001; // Standard: $10 per lot per pip
  }

  return { pnl: Math.round(pips * pipValue * 100) / 100, pips: Math.round(pips * 10) / 10 };
}

/** Compute analytics from an array of closed trades */
export function computeAnalytics(trades: Trade[]) {
  const closed = trades.filter((t) => t.status === "closed" && t.pnl != null);
  if (closed.length === 0) return emptyAnalytics();

  const sorted = [...closed].sort(
    (a, b) => new Date(a.exit_timestamp!).getTime() - new Date(b.exit_timestamp!).getTime()
  );

  const wins = sorted.filter((t) => t.pnl! > 0);
  const losses = sorted.filter((t) => t.pnl! < 0);
  const breakeven = sorted.filter((t) => t.pnl === 0);

  const totalPnl = sorted.reduce((s, t) => s + t.pnl!, 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl!, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0));

  // Max drawdown
  let peak = 0, maxDD = 0, maxDDPct = 0, cumPnl = 0;
  for (const t of sorted) {
    cumPnl += t.pnl!;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  // Consecutive wins/losses
  let cw = 0, cl = 0, maxCW = 0, maxCL = 0;
  for (const t of sorted) {
    if (t.pnl! > 0) { cw++; cl = 0; } else if (t.pnl! < 0) { cl++; cw = 0; } else { cw = 0; cl = 0; }
    maxCW = Math.max(maxCW, cw);
    maxCL = Math.max(maxCL, cl);
  }

  // By symbol
  const symbolMap = new Map<string, { pnl: number; trades: number; wins: number }>();
  for (const t of sorted) {
    const e = symbolMap.get(t.symbol) || { pnl: 0, trades: 0, wins: 0 };
    e.pnl += t.pnl!;
    e.trades++;
    if (t.pnl! > 0) e.wins++;
    symbolMap.set(t.symbol, e);
  }
  const bySymbol = Array.from(symbolMap.entries())
    .map(([symbol, d]) => ({ symbol, pnl: d.pnl, trades: d.trades, win_rate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl);

  // By session
  const sessionMap = new Map<string, { pnl: number; trades: number; wins: number }>();
  for (const t of sorted) {
    const s = t.session_tag || "unknown";
    const e = sessionMap.get(s) || { pnl: 0, trades: 0, wins: 0 };
    e.pnl += t.pnl!;
    e.trades++;
    if (t.pnl! > 0) e.wins++;
    sessionMap.set(s, e);
  }
  const bySession = Array.from(sessionMap.entries())
    .map(([session, d]) => ({ session, pnl: d.pnl, trades: d.trades, win_rate: d.trades > 0 ? (d.wins / d.trades) * 100 : 0 }));

  // By day of week
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayMap = new Map<string, { pnl: number; trades: number }>();
  for (const t of sorted) {
    const day = dayNames[new Date(t.exit_timestamp!).getUTCDay()];
    const e = dayMap.get(day) || { pnl: 0, trades: 0 };
    e.pnl += t.pnl!;
    e.trades++;
    dayMap.set(day, e);
  }
  const byDayOfWeek = dayNames.filter((d) => dayMap.has(d)).map((day) => ({
    day, pnl: dayMap.get(day)!.pnl, trades: dayMap.get(day)!.trades,
  }));

  // By hour
  const hourMap = new Map<number, { pnl: number; trades: number }>();
  for (const t of sorted) {
    const hour = new Date(t.entry_timestamp).getUTCHours();
    const e = hourMap.get(hour) || { pnl: 0, trades: 0 };
    e.pnl += t.pnl!;
    e.trades++;
    hourMap.set(hour, e);
  }
  const byHour = Array.from(hourMap.entries())
    .map(([hour, d]) => ({ hour, pnl: d.pnl, trades: d.trades }))
    .sort((a, b) => a.hour - b.hour);

  // Equity curve
  let running = 0;
  const equityCurve = sorted.map((t) => {
    running += t.pnl!;
    return { date: t.exit_timestamp!, equity: Math.round(running * 100) / 100, trade_count: 1 };
  });

  // Daily P&L
  const dailyMap = new Map<string, { pnl: number; trades: number }>();
  for (const t of sorted) {
    const d = t.exit_timestamp!.slice(0, 10);
    const e = dailyMap.get(d) || { pnl: 0, trades: 0 };
    e.pnl += t.pnl!;
    e.trades++;
    dailyMap.set(d, e);
  }
  const dailyPnl = Array.from(dailyMap.entries())
    .map(([date, d]) => ({ date, pnl: Math.round(d.pnl * 100) / 100, trades: d.trades }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const bestSymbol = bySymbol.length > 0 ? bySymbol[0].symbol : null;
  const worstSymbol = bySymbol.length > 0 ? bySymbol[bySymbol.length - 1].symbol : null;
  const bestSession = bySession.length > 0 ? bySession.sort((a, b) => b.pnl - a.pnl)[0].session : null;
  const worstSession = bySession.length > 0 ? bySession.sort((a, b) => a.pnl - b.pnl)[0].session : null;

  return {
    total_trades: sorted.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    breakeven_trades: breakeven.length,
    win_rate: Math.round((wins.length / sorted.length) * 10000) / 100,
    profit_factor: grossLoss > 0 ? Math.round((grossWin / grossLoss) * 100) / 100 : grossWin > 0 ? Infinity : 0,
    avg_win: wins.length > 0 ? Math.round((grossWin / wins.length) * 100) / 100 : 0,
    avg_loss: losses.length > 0 ? Math.round((grossLoss / losses.length) * 100) / 100 : 0,
    largest_win: wins.length > 0 ? Math.max(...wins.map((t) => t.pnl!)) : 0,
    largest_loss: losses.length > 0 ? Math.min(...losses.map((t) => t.pnl!)) : 0,
    total_pnl: Math.round(totalPnl * 100) / 100,
    max_drawdown: Math.round(maxDD * 100) / 100,
    max_drawdown_pct: Math.round(maxDDPct * 100) / 100,
    consecutive_wins: maxCW,
    consecutive_losses: maxCL,
    best_symbol: bestSymbol,
    worst_symbol: worstSymbol,
    best_session: bestSession,
    worst_session: worstSession,
    equity_curve: equityCurve,
    daily_pnl: dailyPnl,
    by_symbol: bySymbol,
    by_session: bySession,
    by_day_of_week: byDayOfWeek,
    by_hour: byHour,
  };
}

function emptyAnalytics() {
  return {
    total_trades: 0, winning_trades: 0, losing_trades: 0, breakeven_trades: 0,
    win_rate: 0, profit_factor: 0, avg_win: 0, avg_loss: 0,
    largest_win: 0, largest_loss: 0, total_pnl: 0,
    max_drawdown: 0, max_drawdown_pct: 0,
    consecutive_wins: 0, consecutive_losses: 0,
    best_symbol: null, worst_symbol: null,
    best_session: null, worst_session: null,
    equity_curve: [], daily_pnl: [],
    by_symbol: [], by_session: [], by_day_of_week: [], by_hour: [],
  };
}
