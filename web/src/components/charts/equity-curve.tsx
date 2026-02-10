"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";

interface Props {
  data: { date: string; equity: number; trade_count: number }[];
}

export default function EquityCurve({ data }: Props) {
  const isPositive = data.length > 0 && data[data.length - 1].equity >= 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isPositive ? "#22c55e" : "#ef4444"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(parseISO(d), "MMM d")}
          stroke="#8b8ba3"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "#1e1e2e" }}
        />
        <YAxis
          stroke="#8b8ba3"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#12121a", border: "1px solid #1e1e2e", borderRadius: 8, color: "#e4e4ef", fontSize: 12 }}
          labelFormatter={(d) => format(parseISO(d as string), "MMM d, yyyy HH:mm")}
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Equity"]}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={isPositive ? "#22c55e" : "#ef4444"}
          strokeWidth={2}
          fill="url(#equityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
