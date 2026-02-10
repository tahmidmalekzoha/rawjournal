"use client";

import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { SESSIONS } from "@/lib/constants";

interface SessionData {
  session: string;
  pnl: number;
  trades: number;
  win_rate: number;
}

interface Props {
  data: SessionData[];
}

export default function SessionBreakdown({ data }: Props) {
  const sorted = [...data].sort((a, b) => b.pnl - a.pnl);
  const best = sorted[0]?.session;
  const worst = sorted[sorted.length - 1]?.session;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {sorted.map((s) => {
        const sessionInfo = SESSIONS.find((ss) => ss.value === s.session);
        const isBest = s.session === best && s.pnl > 0;
        const isWorst = s.session === worst && s.pnl < 0;

        return (
          <div
            key={s.session}
            className={`rounded-lg border p-4 ${
              isBest ? "border-profit/30 bg-profit/5" : isWorst ? "border-loss/30 bg-loss/5" : "border-border bg-background"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium" style={{ color: sessionInfo?.color }}>
                {sessionInfo?.label || s.session}
              </span>
              {isBest && <span className="text-xs text-profit">BEST</span>}
              {isWorst && <span className="text-xs text-loss">WORST</span>}
            </div>
            <p className={`mt-1 text-xl font-bold ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
              {formatCurrency(s.pnl)}
            </p>
            <div className="mt-2 flex justify-between text-xs text-text-secondary">
              <span>{s.trades} trades</span>
              <span>{formatPercent(s.win_rate)} win</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
