"use client";

import { useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { telechargerCSV } from "@/lib/csv";
import Button from "@/components/ui/Button";

type Onglet = "ensemble" | "top-produits" | "par-mois";

export default function RapportsOnglets({
  vueEnsemble,
  vueTopProduits,
  vueParMois,
  kpisEnsemble,
  topProduits,
  evolutionCA12Mois,
}: {
  vueEnsemble: ReactNode;
  vueTopProduits: ReactNode;
  vueParMois: ReactNode;
  kpisEnsemble: { label: string; valeur: string | number }[];
  topProduits: { code: string; nom: string; unites: number; ca: number }[];
  evolutionCA12Mois: { mois: string; ca: number }[];
}) {
  const [onglet, setOnglet] = useState<Onglet>("ensemble");

  function exporter() {
    const horodatage = new Date().toISOString().slice(0, 10);
    if (onglet === "ensemble") {
      telechargerCSV(`lime-rapport-ensemble-${horodatage}.csv`, [
        ["Indicateur", "Valeur"],
        ...kpisEnsemble.map((k) => [k.label, k.valeur]),
      ]);
    } else if (onglet === "top-produits") {
      telechargerCSV(`lime-top-produits-${horodatage}.csv`, [
        ["Rang", "Code article", "Article", "Unités vendues", "Chiffre d'affaires (FCFA)"],
        ...topProduits.map((p, i) => [i + 1, p.code, p.nom, p.unites, p.ca]),
      ]);
    } else {
      telechargerCSV(`lime-ca-par-mois-${horodatage}.csv`, [
        ["Mois", "Chiffre d'affaires (FCFA)"],
        ...evolutionCA12Mois.map((m) => [m.mois, m.ca]),
      ]);
    }
  }

  const ONGLETS: { key: Onglet; label: string }[] = [
    { key: "ensemble", label: "Vue d'ensemble" },
    { key: "top-produits", label: "Top produits" },
    { key: "par-mois", label: "Par mois" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-display font-semibold text-ink">Rapports &amp; Analytics</h1>
          <p className="text-xs text-ink/55 italic">Vue d&apos;ensemble des performances</p>
        </div>
        <Button size="sm" variant="secondary" onClick={exporter}>
          <Download size={13} /> Export CSV
        </Button>
      </div>

      <div className="flex gap-1 border-b border-argent/25">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            onClick={() => setOnglet(o.key)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
              onglet === o.key ? "border-lime text-lime-deep" : "border-transparent text-ink/55 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === "ensemble" && vueEnsemble}
      {onglet === "top-produits" && vueTopProduits}
      {onglet === "par-mois" && vueParMois}
    </div>
  );
}
