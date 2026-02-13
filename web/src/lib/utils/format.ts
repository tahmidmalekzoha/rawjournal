import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy");
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d, yyyy HH:mm");
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), "HH:mm");
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPips(pips: number): string {
  return `${pips >= 0 ? "+" : ""}${pips.toFixed(1)} pips`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatPrice(price: number, symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes("JPY")) return price.toFixed(3);
  if (s.startsWith("XAU")) return price.toFixed(2);
  if (s.startsWith("XAG")) return price.toFixed(4);
  return price.toFixed(5);
}

export function formatLots(lots: number): string {
  return lots.toFixed(2);
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
