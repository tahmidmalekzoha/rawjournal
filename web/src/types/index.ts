// ========== Database Row Types ==========

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: "free" | "pro" | "elite";
  subscription_status: "active" | "canceled" | "past_due" | "trialing";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trade_count_this_month: number;
  month_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  label: string;
  broker: string;
  mt5_server: string;
  mt5_login: string;
  mt5_investor_password_encrypted: string;
  account_currency: string;
  initial_balance: number;
  current_balance: number | null;
  current_equity: number | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: "pending" | "syncing" | "success" | "error";
  last_sync_error: string | null;
  sync_fail_count: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;
  ticket_number: string;
  symbol: string;
  direction: "buy" | "sell";
  entry_timestamp: string;
  exit_timestamp: string | null;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  pnl: number | null;
  pnl_pips: number | null;
  commission: number;
  swap: number;
  stop_loss: number | null;
  take_profit: number | null;
  status: "open" | "closed";
  import_source: "manual" | "csv" | "mt5";
  session_tag: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OpenPosition {
  id: string;
  user_id: string;
  account_id: string;
  ticket_number: string;
  symbol: string;
  direction: "buy" | "sell";
  entry_timestamp: string;
  entry_price: number;
  current_price: number | null;
  position_size: number;
  floating_pnl: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  swap: number;
  synced_at: string;
}

export interface Journal {
  id: string;
  trade_id: string;
  user_id: string;
  notes: string | null;
  tags: string[];
  mood: Mood | null;
  setup_quality: number | null;
  followed_plan: boolean | null;
  screenshot_urls: string[];
  created_at: string;
  updated_at: string;
}

export type Mood = "confident" | "uncertain" | "fearful" | "neutral" | "greedy" | "disciplined";

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CandleData {
  id: number;
  symbol: string;
  timeframe: Timeframe;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "M30" | "H1" | "H4" | "D1" | "W1";

export interface AnalyticsCache {
  id: string;
  user_id: string;
  account_id: string | null;
  period: AnalyticsPeriod;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  total_pnl: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  avg_trade_duration: string | null;
  best_symbol: string | null;
  worst_symbol: string | null;
  best_session: string | null;
  worst_session: string | null;
  consecutive_wins: number;
  consecutive_losses: number;
  calculated_at: string;
}

export type AnalyticsPeriod = "today" | "week" | "month" | "year" | "all";

// ========== Computed / UI Types ==========

export interface TradeWithJournal extends Trade {
  journal?: Journal | null;
}

export interface TradeFilters {
  account_id?: string;
  from?: string;
  to?: string;
  symbol?: string;
  direction?: "buy" | "sell";
  session?: string;
  status?: "open" | "closed";
  sort_by?: "date" | "pnl" | "symbol";
  sort_dir?: "asc" | "desc";
  page?: number;
}

export interface AnalyticsData {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  largest_win: number;
  largest_loss: number;
  total_pnl: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  consecutive_wins: number;
  consecutive_losses: number;
  best_symbol: string | null;
  worst_symbol: string | null;
  best_session: string | null;
  worst_session: string | null;
  equity_curve: { date: string; equity: number; trade_count: number }[];
  daily_pnl: { date: string; pnl: number; trades: number }[];
  by_symbol: { symbol: string; pnl: number; trades: number; win_rate: number }[];
  by_session: { session: string; pnl: number; trades: number; win_rate: number }[];
  by_day_of_week: { day: string; pnl: number; trades: number }[];
  by_hour: { hour: number; pnl: number; trades: number }[];
}

export interface CsvColumnMapping {
  ticket_number?: string;
  symbol?: string;
  direction?: string;
  entry_timestamp?: string;
  exit_timestamp?: string;
  entry_price?: string;
  exit_price?: string;
  position_size?: string;
  pnl?: string;
  commission?: string;
  swap?: string;
  stop_loss?: string;
  take_profit?: string;
}
