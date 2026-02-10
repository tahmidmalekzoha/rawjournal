"use client";

import { useMemo } from "react";
import { format, parseISO, eachDayOfInterval, subMonths, startOfWeek, getDay } from "date-fns";

interface Props {
  data: { date: string; pnl: number; trades: number }[];
}

function getColor(pnl: number): string {
  if (pnl > 100) return "#16a34a";      // dark green
  if (pnl > 0) return "#22c55e40";      // light green
  if (pnl === 0) return "#1e1e2e";      // gray
  if (pnl > -100) return "#ef444440";   // light red
  return "#dc2626";                       // dark red
}

export default function CalendarHeatmap({ data }: Props) {
  const dailyMap = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>();
    for (const d of data) m.set(d.date, d);
    return m;
  }, [data]);

  const now = new Date();
  const start = subMonths(now, 6);
  const allDays = eachDayOfInterval({ start, end: now });

  // Group by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  for (const day of allDays) {
    if (getDay(day) === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const entry = dailyMap.get(key);
              return (
                <div
                  key={key}
                  title={entry ? `${key}: $${entry.pnl.toFixed(2)} (${entry.trades} trades)` : key}
                  className="h-3.5 w-3.5 rounded-sm"
                  style={{ backgroundColor: entry ? getColor(entry.pnl) : "#1e1e2e" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
        <span>Loss</span>
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#ef444440" }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#1e1e2e" }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#22c55e40" }} />
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#16a34a" }} />
        <span>Profit</span>
      </div>
    </div>
  );
}
