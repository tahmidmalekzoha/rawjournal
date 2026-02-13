import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get("timeframe") || "H1";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("candle_cache")
    .select("timestamp, open, high, low, close, volume")
    .eq("symbol", params.symbol.toUpperCase())
    .eq("timeframe", timeframe)
    .order("timestamp", { ascending: true })
    .limit(2000);

  if (from) query = query.gte("timestamp", from);
  if (to) query = query.lte("timestamp", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch user's trades for this symbol (for markers)
  const { data: trades } = await supabase
    .from("trades")
    .select("id, direction, entry_timestamp, exit_timestamp, entry_price, exit_price, position_size, pnl, stop_loss, take_profit")
    .eq("user_id", user.id)
    .eq("symbol", params.symbol.toUpperCase())
    .order("entry_timestamp", { ascending: true });

  return NextResponse.json({
    candles: data || [],
    trades: trades || [],
  });
}
