export const FOREX_PAIRS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "NZDUSD", "USDCAD",
  "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURNZD", "EURCAD",
  "GBPJPY", "GBPCHF", "GBPAUD", "GBPNZD", "GBPCAD",
  "AUDJPY", "AUDCHF", "AUDNZD", "AUDCAD",
  "NZDJPY", "NZDCHF", "NZDCAD",
  "CADJPY", "CADCHF", "CHFJPY",
  "XAUUSD", "XAGUSD", "XAUEUR",
  "US30", "US500", "NAS100", "GER40", "UK100", "JPN225",
  "BTCUSD", "ETHUSD",
] as const;

export const SESSIONS = [
  { value: "asian", label: "Asian", color: "#f59e0b" },
  { value: "london", label: "London", color: "#3b82f6" },
  { value: "overlap", label: "Overlap", color: "#8b5cf6" },
  { value: "newyork", label: "New York", color: "#22c55e" },
  { value: "late-ny", label: "Late NY", color: "#6b7280" },
] as const;

export const MOODS = [
  { value: "confident", label: "Confident", emoji: "💪" },
  { value: "uncertain", label: "Uncertain", emoji: "🤔" },
  { value: "fearful", label: "Fearful", emoji: "😰" },
  { value: "neutral", label: "Neutral", emoji: "😐" },
  { value: "greedy", label: "Greedy", emoji: "🤑" },
  { value: "disciplined", label: "Disciplined", emoji: "🎯" },
] as const;

export const DEFAULT_TAGS = [
  { name: "Breakout", color: "#3b82f6" },
  { name: "Trend Following", color: "#22c55e" },
  { name: "Range", color: "#f59e0b" },
  { name: "News", color: "#ef4444" },
  { name: "Reversal", color: "#8b5cf6" },
  { name: "Scalp", color: "#ec4899" },
  { name: "Swing", color: "#06b6d4" },
];

export const TIMEFRAMES = [
  { value: "M30", label: "30m" },
  { value: "H1", label: "1H" },
  { value: "H4", label: "4H" },
  { value: "D1", label: "Daily" },
  { value: "W1", label: "Weekly" },
] as const;

export const FREE_TIER_TRADE_LIMIT = 15;

export const TRADES_PER_PAGE = 50;
