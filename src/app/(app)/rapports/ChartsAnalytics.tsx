"use client";

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COULEURS_MODES: Record<string, string> = {
  especes: "#2F4858",
  mobile_money: "#D97757",
  virement: "#8a8f94",
  credit: "#c2410c",
};
const LABEL_MODES: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  credit: "Crédit",
};

export function EvolutionCA({ data }: { data: { mois: string; ca: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="mois" fontSize={11} />
        <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v) => `${Number(v ?? 0).toLocaleString("fr-FR")} FCFA`} />
        <Line type="monotone" dataKey="ca" stroke="#2F4858" strokeWidth={2} dot={{ r: 3 }} name="CA" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ActiviteSemaine({ data }: { data: { jour: string; ca: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="jour" fontSize={11} />
        <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v) => `${Number(v ?? 0).toLocaleString("fr-FR")} FCFA`} />
        <Bar dataKey="ca" fill="#2F4858" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RepartitionModes({ data }: { data: { mode: string; montant: number }[] }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-10">Aucun paiement enregistré</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="montant" nameKey="mode" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((d) => (
            <Cell key={d.mode} fill={COULEURS_MODES[d.mode] ?? "#ccc"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, n) => [`${Number(v ?? 0).toLocaleString("fr-FR")} FCFA`, LABEL_MODES[String(n)] ?? String(n)]}
        />
        <Legend formatter={(n) => LABEL_MODES[String(n)] ?? String(n)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
