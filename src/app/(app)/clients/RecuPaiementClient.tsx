"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Printer, Share2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { TELEPHONE_ENTREPRISE, partagerImageWhatsApp } from "@/lib/partage";

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
  const refRecu = useRef<HTMLDivElement>(null);
  const [partage, setPartage] = useState(false);

  const LABEL_MODE: Record<string, string> = {
    especes: "Espèces",
    mobile_money: "Mobile Money",
    virement: "Virement",
  };

  async function partager() {
    setPartage(true);
    try {
      await partagerImageWhatsApp(refRecu.current, `Recu-${clientNom}`, `Lime-électronique — Reçu de paiement`);
    } finally {
      setPartage(false);
    }
  }

  return (
    <div className="space-y-3">
      <div ref={refRecu} id="zone-impression" className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-5 text-xs font-mono">
        <div className="flex flex-col items-center mb-3">
          <Image src="/icons/icon-192.png" alt="Lime-électronique" width={48} height={48} className="rounded-md mb-1.5" />
          <div className="font-display font-bold text-sm text-lime-deep">Lime-électronique</div>
          <div className="text-ink/60">Reçu de paiement — {clientNom}</div>
          <div className="text-ink/60">{TELEPHONE_ENTREPRISE}</div>
        </div>
        <div className="border-t border-dashed border-ink/25 my-2.5" />
        <div className="flex justify-between">
          <span className="text-ink/55">Solde dû avant paiement</span>
          <span>{soldeAvant.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="flex justify-between font-semibold text-ok">
          <span>Payé maintenant ({LABEL_MODE[mode] ?? mode})</span>
          <span>- {montantPaye.toLocaleString("fr-FR")} FCFA</span>
        </div>
        <div className="border-t border-dashed border-ink/25 my-2.5" />
        <div className="flex justify-between font-bold text-sm">
          <span>Solde restant dû</span>
          <span className="text-lime-deep">{soldeApres.toLocaleString("fr-FR")} FCFA</span>
        </div>

        {factures.length > 0 && (
          <>
            <div className="border-t border-dashed border-ink/25 my-2.5" />
            <div className="text-ink/55 mb-1">Détail par facture à crédit</div>
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

        <div className="border-t border-dashed border-ink/25 my-2.5" />
        <div className="text-center text-ink/45">Merci pour votre confiance ! 🙏</div>
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
      <Button size="sm" onClick={onFermer} className="w-full">
        Fermer
      </Button>
    </div>
  );
}
