"use client";

import { Printer } from "lucide-react";
import Button from "@/components/ui/Button";

type LigneRecu = { nom: string; quantite: number; prix_unitaire: number };

export default function FactureApercu({
  numero,
  statut,
  clientNom,
  lignes,
  total,
}: {
  numero: string;
  statut: string;
  clientNom: string | null;
  lignes: LigneRecu[];
  total: number;
}) {
  return (
    <>
      <div id="zone-impression" className="bg-white border border-ink/10 rounded-lg p-4 text-xs font-mono">
        <div className="text-center mb-3">
          <div className="font-display font-semibold text-sm">Lime-électronique</div>
          <div className="text-ink/50">Bamako — Gabriel Touré</div>
        </div>
        <div className="border-t border-dashed border-ink/20 my-2" />
        <div>Facture : {numero}</div>
        <div>Client : {clientNom ?? "Comptant"}</div>
        <div className="border-t border-dashed border-ink/20 my-2" />
        {lignes.map((l, i) => (
          <div key={i} className="flex justify-between">
            <span>{l.quantite}× {l.nom}</span>
            <span>{(l.quantite * l.prix_unitaire).toLocaleString("fr-FR")}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-ink/20 my-2" />
        <div className="flex justify-between font-semibold">
          <span>TOTAL</span>
          <span>{total.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="text-center text-ink/40 mt-3">Statut : {statut}</div>
      </div>
      <Button variant="secondary" size="sm" onClick={() => window.print()} className="w-full">
        <Printer size={13} /> Imprimer / Enregistrer en PDF
      </Button>
    </>
  );
}
