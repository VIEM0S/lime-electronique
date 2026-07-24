"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StatutVente } from "@/types/database.types";

type VenteLite = {
  id: string;
  numero_facture: string;
  date: string;
  montant_total: number;
  statut: StatutVente;
  conflit_sync: boolean;
};

const BADGE: Record<StatutVente, string> = {
  payee: "bg-green-100 text-green-700",
  partielle: "bg-amber-100 text-amber-700",
  impayee: "bg-gray-200 text-gray-600",
  annulee: "bg-red-100 text-red-700",
};

export default function VentesRecentes({ ventes, peutAnnuler }: { ventes: VenteLite[]; peutAnnuler: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [venteEnCours, setVenteEnCours] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  // FR-30/UC-09 : réservé au propriétaire — la policy RLS "proprietaire_annule_ventes"
  // refuserait de toute façon l'update pour un compte "caisse".
  async function confirmerAnnulation(venteId: string) {
    if (!motif.trim()) {
      setErreur("Le motif d'annulation est obligatoire.");
      return;
    }
    setErreur(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("ventes")
      .update({ statut: "annulee", motif_annulation: motif, annule_par: user?.id })
      .eq("id", venteId);

    if (error) {
      setErreur(error.message);
      return;
    }

    setVenteEnCours(null);
    setMotif("");
    router.refresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h2 className="text-sm font-semibold mb-2">Ventes récentes</h2>
      <table className="w-full text-xs">
        <thead className="text-gray-400 text-left">
          <tr><th className="py-1">Facture</th><th>Date</th><th>Montant</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {ventes.map((v) => (
            <tr key={v.id} className="border-t border-gray-100">
              <td className="py-1">{v.numero_facture}</td>
              <td>{new Date(v.date).toLocaleString("fr-FR")}</td>
              <td>{Number(v.montant_total).toLocaleString("fr-FR")} FCFA</td>
              <td className="space-x-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${BADGE[v.statut]}`}>{v.statut}</span>
                {v.conflit_sync && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    en conflit
                  </span>
                )}
              </td>
              <td>
                {peutAnnuler && v.statut !== "annulee" && (
                  venteEnCours === v.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder="Motif d'annulation"
                        className="border border-gray-300 rounded px-1 py-0.5 text-xs w-32"
                      />
                      <button onClick={() => confirmerAnnulation(v.id)} className="text-red-600 underline">
                        Confirmer
                      </button>
                      <button onClick={() => setVenteEnCours(null)} className="text-gray-400 underline">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setVenteEnCours(v.id)} className="text-accent underline">
                      Annuler
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {erreur && <p className="text-xs text-red-600 mt-2">{erreur}</p>}
    </div>
  );
}
