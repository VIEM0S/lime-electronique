import { createClient } from "@/lib/supabase/server";
import type { VueCreditClient } from "@/types/database.types";

const LABEL_STATUT: Record<string, string> = {
  en_cours: "En cours",
  en_retard: "En retard",
  soldee: "Soldée",
};
const STYLE_STATUT: Record<string, string> = {
  en_cours: "bg-gray-200 text-gray-600",
  en_retard: "bg-red-100 text-red-700",
  soldee: "bg-green-100 text-green-700",
};

export default async function CreditsPage() {
  const supabase = await createClient();

  const { data: credits } = await supabase
    .from("vue_credits_clients")
    .select("*")
    .returns<VueCreditClient[]>();

  const enCours = (credits ?? []).filter((c) => c.statut_credit !== "soldee");
  const enRetard = (credits ?? []).filter((c) => c.statut_credit === "en_retard");
  const totalEnCours = enCours.reduce((s, c) => s + Number(c.solde_restant), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-accent">Crédits clients</h1>
      <p className="text-xs text-gray-400 italic">
        Détail par vente à crédit — limite, échéance et statut (cf. Clients &amp; créances pour le solde global)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Total en cours</div>
          <div className="text-lg font-semibold">{totalEnCours.toLocaleString("fr-FR")} FCFA</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Crédits actifs</div>
          <div className="text-lg font-semibold">{enCours.length}</div>
        </div>
        <div className={`rounded p-4 border ${enRetard.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400">En retard</div>
          <div className={`text-lg font-semibold ${enRetard.length > 0 ? "text-red-700" : ""}`}>{enRetard.length}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        {credits && credits.length > 0 ? (
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
<table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 text-left">
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
              {credits.map((c) => {
                const depassementLimite =
                  c.limite_credit !== null && Number(c.solde_restant) > Number(c.limite_credit);
                return (
                  <tr key={c.vente_id} className="border-t border-gray-100">
                    <td className="p-2">
                      {c.client_nom}
                      {c.client_telephone && <span className="text-gray-400"> — {c.client_telephone}</span>}
                    </td>
                    <td>{c.numero_facture}</td>
                    <td>{Number(c.montant_total).toLocaleString("fr-FR")} FCFA</td>
                    <td className={depassementLimite ? "text-red-600 font-semibold" : ""}>
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
        ) : (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">Aucun crédit en cours</p>
            <p className="text-xs">Les ventes payées (au moins en partie) à crédit apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}
