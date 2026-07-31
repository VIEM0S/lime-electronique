"use client";

import Pagination, { usePagination } from "@/components/ui/Pagination";
import type { VueCreditClient } from "@/types/database.types";

const LABEL_STATUT: Record<string, string> = {
  en_cours: "En cours",
  en_retard: "En retard",
  soldee: "Soldée",
};
const STYLE_STATUT: Record<string, string> = {
  en_cours: "bg-argent/15 text-argent-deep",
  en_retard: "bg-signal/10 text-signal",
  soldee: "bg-ok/10 text-ok",
};

export default function CreditsTable({ credits }: { credits: VueCreditClient[] }) {
  const { page, setPage, totalPages, itemsPage } = usePagination(credits);

  if (credits.length === 0) {
    return (
      <div className="text-center py-10 text-ink/55">
        <p className="text-sm">Aucun crédit en cours</p>
        <p className="text-xs">Les ventes payées (au moins en partie) à crédit apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <table className="w-full text-xs">
          <thead className="bg-argent/10 text-ink/55 text-left">
            <tr>
              <th className="p-2">Client</th>
              <th>Facture</th>
              <th>Montant total</th>
              <th>Solde restant</th>
              <th>Limite crédit</th>
              <th>Échéance</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {itemsPage.map((c) => {
              const depassementLimite =
                c.limite_credit !== null && Number(c.solde_restant) > Number(c.limite_credit);
              return (
                <tr key={c.vente_id} className="border-t border-argent/15">
                  <td className="p-2">
                    {c.client_nom}
                    {c.client_telephone && <span className="text-ink/55"> — {c.client_telephone}</span>}
                  </td>
                  <td>{c.numero_facture}</td>
                  <td>{Number(c.montant_total).toLocaleString("fr-FR")} FCFA</td>
                  <td className={depassementLimite ? "text-signal font-semibold" : ""}>
                    {Number(c.solde_restant).toLocaleString("fr-FR")} FCFA
                  </td>
                  <td>{c.limite_credit ? `${Number(c.limite_credit).toLocaleString("fr-FR")} FCFA` : "—"}</td>
                  <td>{c.echeance_credit ? new Date(c.echeance_credit).toLocaleDateString("fr-FR") : "—"}</td>
                  <td>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${STYLE_STATUT[c.statut_credit]}`}>
                      {LABEL_STATUT[c.statut_credit]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-2">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </>
  );
}
