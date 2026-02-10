import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch recent closed trades
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("status", "closed")
    .order("exit_timestamp", { ascending: false })
    .limit(10);

  // Fetch open positions
  const { data: positions } = await supabase.from("open_positions").select("*");

  // Stats from all closed trades
  const { data: allTrades } = await supabase
    .from("trades")
    .select("pnl, direction, status")
    .eq("status", "closed");

  const totalPnl = allTrades?.reduce((s: number, t: any) => s + (t.pnl || 0), 0) ?? 0;
  const winCount = allTrades?.filter((t: any) => t.pnl && t.pnl > 0).length ?? 0;
  const lossCount = allTrades?.filter((t: any) => t.pnl && t.pnl < 0).length ?? 0;
  const totalCount = allTrades?.length ?? 0;
  const winRate = totalCount > 0 ? ((winCount / totalCount) * 100).toFixed(1) : "—";
  const grossWin = allTrades?.filter((t: any) => t.pnl > 0).reduce((s: number, t: any) => s + t.pnl, 0) ?? 0;
  const grossLoss = Math.abs(allTrades?.filter((t: any) => t.pnl < 0).reduce((s: number, t: any) => s + t.pnl, 0) ?? 0);
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? "∞" : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/trades/import"
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover"
          >
            Import CSV
          </Link>
          <Link
            href="/dashboard/trades/add"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            + Add Trade
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total P&L" value={`$${totalPnl.toFixed(2)}`} color={totalPnl >= 0 ? "text-profit" : "text-loss"} />
        <StatCard label="Win Rate" value={typeof winRate === "string" ? `${winRate}%` : "—"} color={parseFloat(winRate as string) >= 50 ? "text-profit" : "text-loss"} />
        <StatCard label="Profit Factor" value={profitFactor} />
        <StatCard label="Total Trades" value={totalCount} />
        <StatCard label="Wins" value={winCount} color="text-profit" />
        <StatCard label="Losses" value={lossCount} color="text-loss" />
      </div>

      {/* Open positions */}
      {positions && positions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Open Positions</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-text-secondary">
                <tr>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-right">Size</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3 font-medium">{p.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={p.direction === "buy" ? "text-profit" : "text-loss"}>
                        {p.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{p.position_size}</td>
                    <td className="px-4 py-3 text-right">{p.entry_price}</td>
                    <td className="px-4 py-3 text-right">{p.current_price}</td>
                    <td className={`px-4 py-3 text-right font-medium ${p.floating_pnl >= 0 ? "text-profit" : "text-loss"}`}>
                      ${p.floating_pnl?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent trades */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Trades</h2>
          <Link href="/dashboard/trades" className="text-sm text-accent hover:underline">View all</Link>
        </div>
        {trades && trades.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface text-text-secondary">
                <tr>
                  <th className="px-4 py-3 text-left">Symbol</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-right">Size</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Exit</th>
                  <th className="px-4 py-3 text-right">P&L</th>
                  <th className="px-4 py-3 text-left">Session</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t: any) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/trades/${t.id}`} className="hover:text-accent">{t.symbol}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={t.direction === "buy" ? "text-profit" : "text-loss"}>
                        {t.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{t.position_size}</td>
                    <td className="px-4 py-3 text-right">{t.entry_price}</td>
                    <td className="px-4 py-3 text-right">{t.exit_price ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${(t.pnl ?? 0) >= 0 ? "text-profit" : "text-loss"}`}>
                      {t.pnl != null ? `$${t.pnl.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{t.session_tag ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-8 text-center text-text-secondary">
            No trades yet.{" "}
            <Link href="/dashboard/trades/add" className="text-accent hover:underline">Add a trade manually</Link>
            {" "}or{" "}
            <Link href="/dashboard/trades/import" className="text-accent hover:underline">import from CSV</Link>.
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
