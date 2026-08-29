"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Pagination, { usePagination } from "@/components/ui/Pagination";
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
  payee: "bg-ok/10 text-ok",
  partielle: "bg-ember/10 text-ember",
  impayee: "bg-ink/10 text-ink/62",
  annulee: "bg-signal/10 text-signal",
};

export default function VentesRecentes({ ventes, peutAnnuler }: { ventes: VenteLite[]; peutAnnuler: boolean }) {
  const supabase = createClient();
  const router = useRouter();
  const [venteEnCours, setVenteEnCours] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const { page, setPage, totalPages, itemsPage: ventesPage } = usePagination(ventes);

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
    <div className="bg-white border border-argent/25 rounded-lg shadow-card p-4">
      <h2 className="text-sm font-display font-semibold mb-2">
        Ventes d&apos;aujourd&apos;hui <span className="text-ink/55 font-normal">({ventes.length})</span>
      </h2>
      <div className="overflow-x-auto table-scroll-fade -mx-2 px-2 sm:mx-0 sm:px-0">
<table className="w-full text-xs">
        <thead className="text-ink/55 text-left">
          <tr><th className="py-1">Facture</th><th>Date</th><th>Montant</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          {ventes.length === 0 && (
            <tr><td colSpan={5} className="py-3 text-center text-ink/45 italic">Aucune vente aujourd&apos;hui</td></tr>
          )}
          {ventesPage.map((v) => (
            <tr key={v.id} className="border-t border-ink/5">
              <td className="py-1.5 num">{v.numero_facture}</td>
              <td className="text-ink/62">{new Date(v.date).toLocaleString("fr-FR")}</td>
              <td className="num">{Number(v.montant_total).toLocaleString("fr-FR")} FCFA</td>
              <td className="space-x-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${BADGE[v.statut]}`}>{v.statut}</span>
                {v.conflit_sync && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-signal/10 text-signal">
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
                        className="border border-ink/15 rounded px-1.5 py-0.5 text-xs w-32"
                      />
                      <button onClick={() => confirmerAnnulation(v.id)} className="text-signal underline text-[11px]">
                        Confirmer
                      </button>
                      <button onClick={() => setVenteEnCours(null)} className="text-ink/45 underline text-[11px]">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setVenteEnCours(v.id)} className="text-lime-deep hover:text-ink underline text-[11px]">
                      Annuler
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
</div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      {erreur && <p className="text-xs text-signal mt-2">{erreur}</p>}
    </div>
  );
}
