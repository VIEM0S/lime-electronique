"use client";

import { Printer, Share2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { TELEPHONE_ENTREPRISE, partagerWhatsApp } from "@/lib/partage";

type FactureCredit = {
  numero_facture: string;
  montant_total: number;
  solde_restant: number;
  statut_credit: string;
};

export default function RecuPaiementClient({
  clientNom,
  soldeAvant,
  montantPaye,
  mode,
  soldeApres,
  factures,
  onFermer,
}: {
  clientNom: string;
  soldeAvant: number;
  montantPaye: number;
  mode: string;
  soldeApres: number;
  factures: FactureCredit[];
  onFermer: () => void;
}) {
  const LABEL_MODE: Record<string, string> = {
    especes: "Espèces",
    mobile_money: "Mobile Money",
    virement: "Virement",
  };

  function texteWhatsApp() {
    const detailFactures = factures
      .map((f) => `${f.numero_facture} : ${f.solde_restant.toLocaleString("fr-FR")} / ${f.montant_total.toLocaleString("fr-FR")} FCFA`)
      .join("\n");
    return (
      `*Lime-électronique* — Reçu de paiement\n` +
      `Client : ${clientNom}\n\n` +
      `Solde dû avant : ${soldeAvant.toLocaleString("fr-FR")} FCFA\n` +
      `Payé (${LABEL_MODE[mode] ?? mode}) : ${montantPaye.toLocaleString("fr-FR")} FCFA\n` +
      `Solde restant : ${soldeApres.toLocaleString("fr-FR")} FCFA\n` +
      (detailFactures ? `\n${detailFactures}\n` : "") +
      `\nLime-électronique — ${TELEPHONE_ENTREPRISE}`
    );
  }

  return (
    <div className="space-y-3">
      <div id="zone-impression" className="bg-white border border-ink/10 rounded-lg p-4 text-xs font-mono">
        <div className="text-center mb-3">
          <div className="font-display font-semibold text-sm">Lime-électronique</div>
          <div className="text-ink/50">Reçu de paiement — {clientNom}</div>
          <div className="text-ink/50">{TELEPHONE_ENTREPRISE}</div>
        </div>
        <div className="border-t border-dashed border-ink/20 my-2" />
        <div className="flex justify-between">
          <span>Solde dû avant paiement</span>
          <span>{soldeAvant.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="flex justify-between font-semibold text-ok">
          <span>Payé maintenant ({LABEL_MODE[mode] ?? mode})</span>
          <span>- {montantPaye.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="border-t border-dashed border-ink/20 my-2" />
        <div className="flex justify-between font-semibold">
          <span>Solde restant dû</span>
          <span>{soldeApres.toLocaleString("fr-FR")} FCFA</span>
        </div>

        {factures.length > 0 && (
          <>
            <div className="border-t border-dashed border-ink/20 my-2" />
            <div className="text-ink/50 mb-1">Détail par facture à crédit :</div>
            {factures.map((f) => (
              <div key={f.numero_facture} className="flex justify-between mb-0.5">
                <span>
                  {f.numero_facture}
                  {f.statut_credit === "soldee" && <span className="text-ok"> (soldée)</span>}
                  {f.statut_credit === "en_retard" && <span className="text-signal"> (en retard)</span>}
                </span>
                <span>
                  {f.solde_restant.toLocaleString("fr-FR")} / {f.montant_total.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="flex-1">
          <Printer size={13} /> Imprimer / PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={() => partagerWhatsApp(texteWhatsApp())} className="flex-1">
          <Share2 size={13} /> WhatsApp
        </Button>
      </div>
      <Button size="sm" onClick={onFermer} className="w-full">
        Fermer
      </Button>
    </div>
  );
}
