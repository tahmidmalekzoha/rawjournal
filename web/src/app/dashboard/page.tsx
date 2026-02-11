import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subDays } from "date-fns";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch open positions
  const { data: positions } = await supabase.from("open_positions").select("*");

  // Stats from all closed trades
  const { data: allTrades } = await supabase
    .from("trades")
    .select("pnl, direction, status, exit_timestamp, entry_timestamp")
    .eq("status", "closed");

  const unrealizedPnl = positions?.reduce((s: number, p: any) => s + (p.floating_pnl || 0), 0) ?? 0;
  const realizedPnl = allTrades?.reduce((s: number, t: any) => s + (t.pnl || 0), 0) ?? 0;
  const totalPnl = realizedPnl + unrealizedPnl;
  const totalClosed = allTrades?.length ?? 0;
  const winCount = allTrades?.filter((t: any) => t.pnl && t.pnl > 0).length ?? 0;
  const winRate = totalClosed > 0 ? ((winCount / totalClosed) * 100).toFixed(1) : "0";

  // Build daily P&L data for the chart & calendar
  const dailyPnlMap = new Map<string, number>();
  const dailyTradeCountMap = new Map<string, number>();
  allTrades?.forEach((t: any) => {
    const dateStr = t.exit_timestamp
      ? format(parseISO(t.exit_timestamp), "yyyy-MM-dd")
      : format(parseISO(t.entry_timestamp), "yyyy-MM-dd");
    dailyPnlMap.set(dateStr, (dailyPnlMap.get(dateStr) || 0) + (t.pnl || 0));
    dailyTradeCountMap.set(dateStr, (dailyTradeCountMap.get(dateStr) || 0) + 1);
  });

  // Performance data: last 30 days for chart
  const performanceData = Array.from(dailyPnlMap.entries())
    .map(([date, pnl]) => ({ date, pnl, trades: dailyTradeCountMap.get(date) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calendar data for current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const calendarData = daysInMonth.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return {
      date: key,
      dayNum: parseInt(format(d, "d")),
      dayOfWeek: getDay(d),
      pnl: dailyPnlMap.get(key) || 0,
      trades: dailyTradeCountMap.get(key) || 0,
    };
  });

  // Current month/year label
  const monthLabel = format(now, "MMMM yyyy");

  return (
    <DashboardClient
      totalPnl={totalPnl}
      unrealizedPnl={unrealizedPnl}
      realizedPnl={realizedPnl}
      winRate={winRate}
      totalClosed={totalClosed}
      performanceData={performanceData}
      calendarData={calendarData}
      monthLabel={monthLabel}
      positions={positions || []}
      currentDate={format(now, "EEE, MMM d")}
    />
  );
}
