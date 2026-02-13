import type { Profile, Account, Trade, OpenPosition, Journal, Tag } from "@/types";

// Fixed demo user ID
export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

// ---- Helpers ----
function uuid(i: number): string {
  return `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "AUDUSD", "NZDUSD", "USDCAD", "GBPJPY", "EURJPY", "NAS100"] as const;
const SESSIONS = ["asian", "london", "overlap", "newyork", "late-ny"] as const;
const MOODS: Array<"confident" | "uncertain" | "fearful" | "neutral" | "greedy" | "disciplined"> = [
  "confident", "uncertain", "fearful", "neutral", "greedy", "disciplined",
];

function basePriceForSymbol(symbol: string): number {
  switch (symbol) {
    case "EURUSD": return 1.0850;
    case "GBPUSD": return 1.2650;
    case "USDJPY": return 149.50;
    case "XAUUSD": return 2350.0;
    case "AUDUSD": return 0.6550;
    case "NZDUSD": return 0.6100;
    case "USDCAD": return 1.3600;
    case "GBPJPY": return 189.20;
    case "EURJPY": return 162.10;
    case "NAS100": return 18500.0;
    default: return 1.0;
  }
}

function pipSizeForSymbol(symbol: string): number {
  if (symbol.includes("JPY")) return 0.01;
  if (symbol.startsWith("XAU")) return 0.1;
  if (symbol === "NAS100") return 0.1;
  return 0.0001;
}

function spreadPips(symbol: string): number {
  switch (symbol) {
    case "XAUUSD": return randomBetween(15, 35);
    case "NAS100": return randomBetween(5, 20);
    case "GBPJPY":
    case "EURJPY": return randomBetween(2, 5);
    default: return randomBetween(0.5, 2.5);
  }
}

// ---- Generate Data ----

export const mockProfile: Profile = {
  id: MOCK_USER_ID,
  email: "demo@rawjournal.pro",
  full_name: "Demo Trader",
  subscription_tier: "pro",
  subscription_status: "active",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  trade_count_this_month: 0,
  month_reset_date: new Date().toISOString().split("T")[0],
  created_at: "2025-06-01T00:00:00Z",
  updated_at: new Date().toISOString(),
};

export const mockAccounts: Account[] = [
  {
    id: uuid(100),
    user_id: MOCK_USER_ID,
    label: "IC Markets Demo",
    broker: "IC Markets",
    mt5_server: "ICMarketsSC-Demo",
    mt5_login: "51234567",
    mt5_investor_password_encrypted: "",
    account_currency: "USD",
    initial_balance: 10000,
    current_balance: 12450.30,
    current_equity: 12520.80,
    sync_enabled: true,
    last_sync_at: new Date().toISOString(),
    last_sync_status: "success",
    last_sync_error: null,
    sync_fail_count: 0,
    created_at: "2025-06-01T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: uuid(101),
    user_id: MOCK_USER_ID,
    label: "Pepperstone Live",
    broker: "Pepperstone",
    mt5_server: "Pepperstone-Live",
    mt5_login: "67890123",
    mt5_investor_password_encrypted: "",
    account_currency: "USD",
    initial_balance: 25000,
    current_balance: 27830.50,
    current_equity: 27900.00,
    sync_enabled: true,
    last_sync_at: new Date().toISOString(),
    last_sync_status: "success",
    last_sync_error: null,
    sync_fail_count: 0,
    created_at: "2025-08-15T00:00:00Z",
    updated_at: new Date().toISOString(),
  },
];

// Generate 80 mock trades spread over last 6 months
function generateTrades(): Trade[] {
  const trades: Trade[] = [];
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

  // Use a seeded-ish approach for consistency within a session
  for (let i = 0; i < 80; i++) {
    const symbol = pick(SYMBOLS);
    const direction = Math.random() > 0.5 ? "buy" : "sell" as const;
    const accountId = Math.random() > 0.4 ? mockAccounts[0].id : mockAccounts[1].id;
    const entryTime = new Date(sixMonthsAgo + Math.random() * (now - sixMonthsAgo));
    const durationMinutes = randomInt(5, 480);
    const exitTime = new Date(entryTime.getTime() + durationMinutes * 60000);
    const session = pick(SESSIONS);
    const lotSize = pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0]);

    const base = basePriceForSymbol(symbol);
    const pip = pipSizeForSymbol(symbol);
    const variation = pip * randomBetween(-80, 80);
    const entryPrice = Math.round((base + variation) * 1e6) / 1e6;

    // Win ~55% of trades for realistic feel
    const isWin = Math.random() < 0.55;
    const pipMove = randomBetween(5, 60) * pip;
    const exitPrice = direction === "buy"
      ? Math.round((entryPrice + (isWin ? pipMove : -pipMove)) * 1e6) / 1e6
      : Math.round((entryPrice - (isWin ? pipMove : -pipMove)) * 1e6) / 1e6;

    // Calculate P&L
    const pipsGained = direction === "buy"
      ? (exitPrice - entryPrice) / pip
      : (entryPrice - exitPrice) / pip;

    let pipValue: number;
    if (symbol.includes("JPY")) pipValue = lotSize * 1000 * 0.01;
    else if (symbol.startsWith("XAU")) pipValue = lotSize * 100 * 0.1;
    else if (symbol === "NAS100") pipValue = lotSize * 10 * 0.1;
    else pipValue = lotSize * 100000 * 0.0001;

    const pnl = Math.round(pipsGained * pipValue * 100) / 100;
    const commission = Math.round(lotSize * -3.5 * 100) / 100;
    const swap = Math.round(randomBetween(-2, 1) * 100) / 100;

    const sl = direction === "buy"
      ? Math.round((entryPrice - randomBetween(15, 40) * pip) * 1e6) / 1e6
      : Math.round((entryPrice + randomBetween(15, 40) * pip) * 1e6) / 1e6;
    const tp = direction === "buy"
      ? Math.round((entryPrice + randomBetween(20, 80) * pip) * 1e6) / 1e6
      : Math.round((entryPrice - randomBetween(20, 80) * pip) * 1e6) / 1e6;

    trades.push({
      id: uuid(1000 + i),
      user_id: MOCK_USER_ID,
      account_id: accountId,
      ticket_number: `${10000 + i}`,
      symbol,
      direction,
      entry_timestamp: entryTime.toISOString(),
      exit_timestamp: exitTime.toISOString(),
      entry_price: entryPrice,
      exit_price: exitPrice,
      position_size: lotSize,
      pnl,
      pnl_pips: Math.round(pipsGained * 10) / 10,
      commission,
      swap,
      stop_loss: sl,
      take_profit: tp,
      status: "closed",
      import_source: "mt5",
      session_tag: session,
      raw_data: null,
      created_at: entryTime.toISOString(),
      updated_at: exitTime.toISOString(),
    });
  }

  return trades.sort(
    (a, b) => new Date(b.exit_timestamp!).getTime() - new Date(a.exit_timestamp!).getTime()
  );
}

function generateOpenPositions(): OpenPosition[] {
  const positions: OpenPosition[] = [];
  for (let i = 0; i < 3; i++) {
    const symbol = SYMBOLS[i];
    const direction = i % 2 === 0 ? "buy" : "sell" as const;
    const base = basePriceForSymbol(symbol);
    const pip = pipSizeForSymbol(symbol);
    const entry = Math.round((base + pip * randomBetween(-20, 20)) * 1e6) / 1e6;
    const current = Math.round((entry + pip * randomBetween(-30, 30)) * 1e6) / 1e6;
    const floating = direction === "buy"
      ? Math.round((current - entry) * 10000) / 100
      : Math.round((entry - current) * 10000) / 100;

    positions.push({
      id: uuid(2000 + i),
      user_id: MOCK_USER_ID,
      account_id: mockAccounts[0].id,
      ticket_number: `${20000 + i}`,
      symbol,
      direction,
      entry_timestamp: new Date(Date.now() - randomInt(60, 600) * 60000).toISOString(),
      entry_price: entry,
      current_price: current,
      position_size: pick([0.05, 0.1, 0.2]),
      floating_pnl: floating,
      stop_loss: direction === "buy" ? entry - 30 * pip : entry + 30 * pip,
      take_profit: direction === "buy" ? entry + 60 * pip : entry - 60 * pip,
      swap: 0,
      synced_at: new Date().toISOString(),
    });
  }
  return positions;
}

function generateJournals(trades: Trade[]): Journal[] {
  const journals: Journal[] = [];
  // Add journals for ~40% of trades
  const tradesWithJournals = trades.filter((_, i) => i % 3 === 0 || i % 5 === 0);
  const tagNames = ["Breakout", "Trend Following", "Range", "News", "Reversal", "Scalp", "Swing"];
  const noteTemplates = [
    "Solid setup. Waited for confirmation on the 1H timeframe before entering.",
    "Took this trade based on the supply/demand zone. Entry was a bit early.",
    "News-driven move. Got in after the initial spike settled.",
    "Followed the plan perfectly. Set and forget.",
    "Should have taken profits earlier. Got greedy and gave back some gains.",
    "Great risk-to-reward on this one. Textbook setup.",
    "Impulsive entry. Need to wait for better confirmation next time.",
    "Broke my rules on position sizing. Lesson learned.",
    "Clean breakout trade. Volume confirmed the move.",
    "Reversal pattern at key level. High conviction trade.",
  ];

  tradesWithJournals.forEach((trade, i) => {
    const tags = [pick(tagNames)];
    if (Math.random() > 0.5) tags.push(pick(tagNames.filter((t) => !tags.includes(t))));

    journals.push({
      id: uuid(3000 + i),
      trade_id: trade.id,
      user_id: MOCK_USER_ID,
      notes: pick(noteTemplates),
      tags,
      mood: pick(MOODS),
      setup_quality: randomInt(1, 5),
      followed_plan: Math.random() > 0.3 ? true : Math.random() > 0.5 ? false : null,
      screenshot_urls: [],
      created_at: trade.created_at,
      updated_at: trade.updated_at,
    });
  });

  return journals;
}

function generateCandles(trades: Trade[]) {
  const symbols = [...new Set(trades.map((t) => t.symbol))];
  const timeframes = ["M30", "H1", "H4", "D1", "W1"];
  const candles: any[] = [];
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

  for (const symbol of symbols) {
    const base = basePriceForSymbol(symbol);
    const pip = pipSizeForSymbol(symbol);

    for (const tf of timeframes) {
      const intervalMs =
        tf === "M30"  ? 30 * 60 * 1000 :
        tf === "H1"   ? 60 * 60 * 1000 :
        tf === "H4"   ? 4 * 60 * 60 * 1000 :
        tf === "D1"   ? 24 * 60 * 60 * 1000 :
                        7 * 24 * 60 * 60 * 1000;

      // Limit candle count per symbol/tf to keep memory reasonable
      const maxCandles = tf === "M30" ? 500 : tf === "H1" ? 500 : tf === "H4" ? 300 : tf === "D1" ? 180 : 52;
      const startTime = Math.max(sixMonthsAgo, now - maxCandles * intervalMs);
      let price = base + pip * randomBetween(-50, 50);

      for (let t = startTime; t < now; t += intervalMs) {
        const open = price;
        const move = pip * randomBetween(-20, 20);
        const close = open + move;
        const high = Math.max(open, close) + pip * randomBetween(1, 15);
        const low = Math.min(open, close) - pip * randomBetween(1, 15);
        const volume = randomInt(50, 5000);

        candles.push({
          id: uuid(50000 + candles.length),
          symbol,
          timeframe: tf,
          timestamp: new Date(t).toISOString(),
          open: Math.round(open * 1e6) / 1e6,
          high: Math.round(high * 1e6) / 1e6,
          low: Math.round(low * 1e6) / 1e6,
          close: Math.round(close * 1e6) / 1e6,
          volume,
        });

        price = close; // walk forward
      }
    }
  }

  return candles;
}

function generateTags(): Tag[] {
  const tags = [
    { name: "Breakout", color: "#3b82f6" },
    { name: "Trend Following", color: "#22c55e" },
    { name: "Range", color: "#f59e0b" },
    { name: "News", color: "#ef4444" },
    { name: "Reversal", color: "#8b5cf6" },
    { name: "Scalp", color: "#ec4899" },
    { name: "Swing", color: "#06b6d4" },
  ];
  return tags.map((t, i) => ({
    id: uuid(4000 + i),
    user_id: MOCK_USER_ID,
    name: t.name,
    color: t.color,
    created_at: "2025-06-01T00:00:00Z",
  }));
}

// ---- Singleton store (shared across server & client in same process) ----
export const mockTrades = generateTrades();
export const mockOpenPositions = generateOpenPositions();
export const mockJournals = generateJournals(mockTrades);
export const mockTags = generateTags();
export const mockCandles = generateCandles(mockTrades);
