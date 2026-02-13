import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { computeAnalytics } from "@/lib/utils/calculations";
import type { Trade, AnalyticsPeriod } from "@/types";
import { subDays, startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account_id");
  const period = (searchParams.get("period") || "all") as AnalyticsPeriod;

  // Build query
  let query = supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "closed")
    .order("exit_timestamp", { ascending: true });

  if (accountId) query = query.eq("account_id", accountId);

  // Apply period filter
  const now = new Date();
  switch (period) {
    case "today":
      query = query.gte("exit_timestamp", startOfDay(now).toISOString());
      break;
    case "week":
      query = query.gte("exit_timestamp", startOfWeek(now, { weekStartsOn: 1 }).toISOString());
      break;
    case "month":
      query = query.gte("exit_timestamp", startOfMonth(now).toISOString());
      break;
    case "year":
      query = query.gte("exit_timestamp", startOfYear(now).toISOString());
      break;
  }

  const { data: trades, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const analytics = computeAnalytics((trades as Trade[]) || []);
  return NextResponse.json(analytics);
}
