"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  data: { name: string; pnl: number }[];
}

export default function PnlBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} layout="vertical">
        <XAxis
          type="number"
          stroke="#8b8ba3"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: "#1e1e2e" }}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#8b8ba3"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#12121a", border: "1px solid #1e1e2e", borderRadius: 8, color: "#e4e4ef", fontSize: 12 }}
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "P&L"]}
        />
        <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
