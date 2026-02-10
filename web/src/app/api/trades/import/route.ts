import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { FREE_TIER_TRADE_LIMIT } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { trades, account_id } = body as { trades: any[]; account_id: string };

  if (!trades?.length || !account_id) {
    return NextResponse.json({ error: "Missing trades or account_id" }, { status: 400 });
  }

  // Verify account ownership
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", account_id)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Check free tier limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trade_count_this_month")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier === "free") {
    const remaining = FREE_TIER_TRADE_LIMIT - (profile.trade_count_this_month || 0);
    if (remaining <= 0) {
      return NextResponse.json({
        error: "Free tier limit reached. Upgrade to import more trades.",
        limit_reached: true,
      }, { status: 403 });
    }
    if (trades.length > remaining) {
      return NextResponse.json({
        error: `Free tier: only ${remaining} trades remaining this month.`,
        limit_reached: true,
        remaining,
      }, { status: 403 });
    }
  }

  // Batch insert, skip duplicates via ON CONFLICT
  const toInsert = trades.map((t: any) => ({
    ...t,
    user_id: user.id,
    account_id,
    import_source: "csv",
  }));

  let imported = 0;
  let duplicates = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("trades")
      .upsert(batch, { onConflict: "account_id,ticket_number", ignoreDuplicates: true })
      .select("id");

    if (error) {
      errors += batch.length;
    } else {
      imported += data?.length || 0;
      duplicates += batch.length - (data?.length || 0);
    }
  }

  // Update trade count for free tier
  if (profile?.subscription_tier === "free" && imported > 0) {
    await supabase
      .from("profiles")
      .update({ trade_count_this_month: (profile.trade_count_this_month || 0) + imported })
      .eq("id", user.id);
  }

  return NextResponse.json({ imported, duplicates, errors, total: trades.length });
}
