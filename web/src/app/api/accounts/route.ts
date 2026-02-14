import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function encryptPassword(plaintext: string): string {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) throw new Error("ENCRYPTION_KEY not set");
  const key = Buffer.from(keyHex, "hex");
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(nonce + ciphertext + tag) — compatible with Python AESGCM
  return Buffer.concat([nonce, encrypted, tag]).toString("base64");
}

// GET /api/accounts — list user's MT5 accounts
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("accounts")
    .select("id, label, broker, mt5_server, mt5_login, account_currency, initial_balance, current_balance, current_equity, sync_enabled, last_sync_at, last_sync_status, last_sync_error, sync_fail_count, created_at")
    .eq("user_id", user.id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/accounts — connect a new MT5 account
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { label, broker, mt5_server, mt5_login, investor_password, account_currency, initial_balance } = body;

  if (!broker || !mt5_server || !mt5_login || !investor_password) {
    return NextResponse.json({ error: "Missing required fields: broker, mt5_server, mt5_login, investor_password" }, { status: 400 });
  }

  // Check account limits based on subscription
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = profile?.subscription_tier || "free";

  if (tier === "free") {
    return NextResponse.json({ error: "MT5 sync is not available on the Free plan. Upgrade to Pro or Elite." }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);

  const maxAccounts = tier === "elite" ? 5 : 1;
  if ((existing?.length || 0) >= maxAccounts) {
    return NextResponse.json({
      error: `Account limit reached. ${tier === "pro" ? "Pro plan allows 1 MT5 account. Upgrade to Elite for up to 5." : "Elite plan allows up to 5 MT5 accounts."}`,
    }, { status: 403 });
  }

  // Encrypt investor password
  let encrypted: string;
  try {
    encrypted = encryptPassword(investor_password);
  } catch {
    return NextResponse.json({ error: "Server encryption error" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      label: label || "My Account",
      broker,
      mt5_server,
      mt5_login,
      mt5_investor_password_encrypted: encrypted,
      account_currency: account_currency || "USD",
      initial_balance: initial_balance || 0,
    })
    .select("id, label, broker, mt5_server, mt5_login, account_currency, initial_balance, sync_enabled, last_sync_status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "This MT5 account is already connected." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/accounts?id=xxx — disconnect an MT5 account
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing account id" }, { status: 400 });

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
