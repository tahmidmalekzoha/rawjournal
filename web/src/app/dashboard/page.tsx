import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch recent trades
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .order("entry_timestamp", { ascending: false })
    .limit(10);

  // Fetch open positions
  const { data: positions } = await supabase.from("open_positions").select("*");

  const totalPnl = trades?.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) ?? 0;
  const winCount = trades?.filter((t: any) => t.pnl && t.pnl > 0).length ?? 0;
  const tradeCount = trades?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Accounts" value={accounts?.length ?? 0} />
        <StatCard label="Open Positions" value={positions?.length ?? 0} />
        <StatCard
          label="Recent P&L"
          value={`$${totalPnl.toFixed(2)}`}
          color={totalPnl >= 0 ? "text-profit" : "text-loss"}
        />
        <StatCard
          label="Win Rate"
          value={tradeCount > 0 ? `${((winCount / tradeCount) * 100).toFixed(0)}%` : "—"}
        />
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
        <h2 className="mb-3 text-lg font-semibold">Recent Trades</h2>
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
                    <td className="px-4 py-3 font-medium">{t.symbol}</td>
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
            No trades yet. Connect your MT5 account or add a trade manually.
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
