"use client";

import { useState, type ReactNode } from "react";

export default function ClientsCreditsOnglets({
  vueClients,
  vueCredits,
}: {
  vueClients: ReactNode;
  vueCredits: ReactNode;
}) {
  const [onglet, setOnglet] = useState<"clients" | "credits">("clients");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Clients & créances</h1>
        <p className="text-xs text-ink/55 italic">Suivi des ventes à crédit</p>
      </div>

      <div className="flex gap-1 border-b border-argent/25">
        <button
          onClick={() => setOnglet("clients")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
            onglet === "clients" ? "border-lime text-lime-deep" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          Clients
        </button>
        <button
          onClick={() => setOnglet("credits")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
            onglet === "credits" ? "border-lime text-lime-deep" : "border-transparent text-ink/55 hover:text-ink"
          }`}
        >
          Détail par facture (crédits)
        </button>
      </div>

      {onglet === "clients" ? vueClients : vueCredits}
    </div>
  );
}
