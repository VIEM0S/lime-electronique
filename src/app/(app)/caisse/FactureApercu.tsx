"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Printer, Share2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ModePaiement } from "@/types/database.types";
import { TELEPHONE_ENTREPRISE, partagerImageWhatsApp } from "@/lib/partage";

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
  clientTelephone,
  clientQuartier,
  lignes,
  total,
  paiements = [],
}: {
  numero: string;
  statut: string;
  clientNom: string | null;
  clientTelephone?: string | null;
  clientQuartier?: string | null;
  lignes: LigneRecu[];
  total: number;
  paiements?: PaiementRecu[];
}) {
  const aDuCredit = paiements.some((p) => p.mode === "credit" && p.montant > 0);
  const refFacture = useRef<HTMLDivElement>(null);
  const [partage, setPartage] = useState(false);

  async function partager() {
    setPartage(true);
    try {
      await partagerImageWhatsApp(
        refFacture.current,
        `Facture-${numero}`,
        `Lime-électronique — Facture ${numero}`
      );
    } finally {
      setPartage(false);
    }
  }

  return (
    <>
      <div
        ref={refFacture}
        id="zone-impression"
        className="bg-white border border-argent/25 rounded-lg shadow-card p-5 text-xs font-mono"
      >
        <div className="flex flex-col items-center mb-3">
          <Image src="/icons/icon-192.png" alt="Lime-électronique" width={48} height={48} className="rounded-md mb-1.5" />
          <div className="font-display font-bold text-sm text-lime-deep">Lime-électronique</div>
          <div className="text-ink/60">Bamako — Gabriel Touré</div>
          <div className="text-ink/60">{TELEPHONE_ENTREPRISE}</div>
        </div>
        <div className="border-t border-dashed border-ink/25 my-2.5" />

        <div className="flex justify-between"><span className="text-ink/55">Facture</span><span className="font-semibold">{numero}</span></div>
        <div className="flex justify-between"><span className="text-ink/55">Date</span><span>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span></div>
        {clientNom && (
          <div className="flex justify-between"><span className="text-ink/55">Client</span><span className="font-semibold">{clientNom}</span></div>
        )}
        {clientTelephone && (
          <div className="flex justify-between"><span className="text-ink/55">Tél</span><span>{clientTelephone}</span></div>
        )}
        {clientQuartier && (
          <div className="flex justify-between"><span className="text-ink/55">Quartier</span><span>{clientQuartier}</span></div>
        )}

        <div className="border-t border-dashed border-ink/25 my-2.5" />
        <div className="font-semibold mb-1">Produit(s)</div>
        {lignes.map((l, i) => (
          <div key={i} className={i > 0 ? "pt-2 mt-2 border-t border-dotted border-ink/15" : ""}>
            <div className="font-semibold">{l.nom}</div>
            <div className="flex justify-between text-ink/60">
              <span>{l.quantite} × {l.prix_unitaire.toLocaleString("fr-FR")} FCFA</span>
              <span>{(l.quantite * l.prix_unitaire).toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-ink/25 my-2.5" />
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span className="text-lime-deep">{total.toLocaleString("fr-FR")} FCFA</span>
        </div>

        {paiements.length > 0 && (
          <>
            <div className="border-t border-dashed border-ink/25 my-2.5" />
            <div className="text-ink/55 mb-1">Mode(s) de paiement</div>
            {paiements.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{LABEL_MODE[p.mode]}</span>
                <span>{p.montant.toLocaleString("fr-FR")} FCFA</span>
              </div>
            ))}
          </>
        )}

        <div className={`text-center mt-2.5 font-semibold ${aDuCredit ? "text-ember" : "text-ink/60"}`}>
          {libelleStatut(statut, aDuCredit)}
        </div>

        <div className="border-t border-dashed border-ink/25 my-2.5" />
        <div className="text-center text-ink/45">Merci pour votre achat ! 🙏</div>
        <div className="text-center font-display font-semibold text-lime-deep mt-0.5">Lime-électronique</div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.print()} className="flex-1">
          <Printer size={13} /> Imprimer / PDF
        </Button>
        <Button variant="secondary" size="sm" onClick={partager} disabled={partage} className="flex-1">
          <Share2 size={13} /> {partage ? "Préparation..." : "WhatsApp (image)"}
        </Button>
      </div>
    </>
  );
}
