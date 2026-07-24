"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function VentesChart({ data }: { data: { jour: string; total: number }[] }) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4">
      <h2 className="text-sm font-display font-semibold mb-3">Évolution des ventes (7 derniers jours)</h2>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="limeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B7D12A" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#B7D12A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#16211F0F" vertical={false} />
          <XAxis
            dataKey="jour"
            tick={{ fontSize: 10, fill: "#16211F80" }}
            axisLine={{ stroke: "#16211F1A" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#16211F80" }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} FCFA`, "Ventes"]}
            contentStyle={{
              fontSize: 12,
              fontFamily: "var(--font-body)",
              border: "1px solid #16211F1A",
              borderRadius: 8,
            }}
          />
          <Area type="monotone" dataKey="total" stroke="#8FA916" strokeWidth={2} fill="url(#limeFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
