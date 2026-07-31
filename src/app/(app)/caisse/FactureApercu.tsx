"use client";

import { Printer, Share2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ModePaiement } from "@/types/database.types";
import { TELEPHONE_ENTREPRISE, partagerWhatsApp } from "@/lib/partage";

type LigneRecu = { nom: string; quantite: number; prix_unitaire: number };
type PaiementRecu = { mode: ModePaiement; montant: number };

const LABEL_MODE: Record<ModePaiement, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  credit: "Crédit (différé)",
};

// Le statut technique (payee/partielle/impayee) reflète uniquement l'argent
// réellement encaissé (cf. fix 001) — ici on l'habille pour l'affichage en
// tenant compte de la présence d'une part à crédit, pour ne jamais afficher
// "Payé" sur une facture qui inclut du crédit.
function libelleStatut(statut: string, aDuCredit: boolean): string {
  if (statut === "en attente de synchronisation") return statut;
  if (aDuCredit) {
    if (statut === "impayee") return "À crédit (rien d'encaissé)";
    if (statut === "partielle") return "Payé en partie — reste à crédit";
    return statut; // ne devrait pas arriver (payee + credit > 0 est incohérent)
  }
  return statut === "payee" ? "Payé" : statut === "partielle" ? "Payé en partie" : "Impayé";
}

export default function FactureApercu({
  numero,
  statut,
  clientNom,
  lignes,
  total,
  paiements = [],
}: {
  numero: string;
  statut: string;
  clientNom: string | null;
  lignes: LigneRecu[];
  total: number;
  paiements?: PaiementRecu[];
}) {
  const aDuCredit = paiements.some((p) => p.mode === "credit" && p.montant > 0);

  function texteWhatsApp() {
    const lignesTexte = lignes.map((l) => `${l.quantite}× ${l.nom} — ${(l.quantite * l.prix_unitaire).toLocaleString("fr-FR")} FCFA`).join("\n");
    return (
      `*Lime-électronique* — Facture ${numero}\n` +
      `Client : ${clientNom ?? "Comptant"}\n\n` +
      `${lignesTexte}\n\n` +
      `Total : ${total.toLocaleString("fr-FR")} FCFA\n` +
      `Statut : ${libelleStatut(statut, aDuCredit)}\n\n` +
      `Lime-électronique — ${TELEPHONE_ENTREPRISE}`
    );
  }

  return (
    <>
      <div id="zone-impression" className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-4 text-xs font-mono">
        <div className="text-center mb-3">
          <div className="font-display font-semibold text-sm">Lime-électronique</div>
          <div className="text-ink/62">Bamako — Gabriel Touré</div>
          <div className="text-ink/62">{TELEPHONE_ENTREPRISE}</div>
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

        {paiements.length > 0 && (
          <>
            <div className="border-t border-dashed border-ink/20 my-2" />
            <div className="text-ink/62 mb-1">Mode(s) de paiement :</div>
            {paiements.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{LABEL_MODE[p.mode]}</span>
                <span>{p.montant.toLocaleString("fr-FR")}</span>
              </div>
            ))}
          </>
        )}

        <div className={`text-center mt-3 ${aDuCredit ? "text-ember font-semibold" : "text-ink/55"}`}>
          Statut : {libelleStatut(statut, aDuCredit)}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="flex-1">
          <Printer size={13} /> Imprimer / PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={() => partagerWhatsApp(texteWhatsApp())} className="flex-1">
          <Share2 size={13} /> WhatsApp
        </Button>
      </div>
    </>
  );
}
