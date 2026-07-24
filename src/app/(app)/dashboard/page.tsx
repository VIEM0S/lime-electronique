import { createClient } from "@/lib/supabase/server";

const SEUIL_STOCK_FAIBLE = 5; // FR-28

export default async function DashboardPage() {
  const supabase = await createClient();

  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);

  const [{ data: ventesJour }, { data: creances }, { data: stockFaible }, { data: ventesEnConflit }] = await Promise.all([
    supabase
      .from("ventes")
      .select("montant_total")
      .gte("date", debutJournee.toISOString()),
    supabase.from("vue_creances_clients").select("*"),
    supabase
      .from("articles")
      .select("code_article, nom, quantite_stock")
      .lt("quantite_stock", SEUIL_STOCK_FAIBLE)
      .eq("actif", true),
    supabase
      .from("ventes")
      .select("numero_facture, date, montant_total")
      .eq("conflit_sync", true),
  ]);

  const totalVentesJour = (ventesJour ?? []).reduce((s, v) => s + Number(v.montant_total), 0);
  const totalCreances = (creances ?? []).reduce((s, c: any) => s + Number(c.solde_du), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-accent">Tableau de bord</h1>

      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Ventes du jour" value={`${totalVentesJour.toLocaleString("fr-FR")} FCFA`} sub={`${ventesJour?.length ?? 0} vente(s)`} />
        <Kpi label="Créances en cours" value={`${totalCreances.toLocaleString("fr-FR")} FCFA`} sub={`${creances?.length ?? 0} client(s)`} />
        <Kpi label="Articles en stock faible" value={`${stockFaible?.length ?? 0}`} sub={`< ${SEUIL_STOCK_FAIBLE} unités`} />
      </div>

      {ventesEnConflit && ventesEnConflit.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-4">
          <h2 className="text-sm font-semibold mb-2 text-orange-700">
            ⚠ {ventesEnConflit.length} vente(s) en conflit de synchronisation (BR-08)
          </h2>
          <p className="text-xs text-orange-600 mb-2">
            Stock devenu insuffisant entre l&apos;enregistrement hors-ligne et la synchronisation —
            arbitrage manuel requis (cf. Caisse → Ventes récentes).
          </p>
          <table className="w-full text-xs">
            <thead className="text-orange-400 text-left">
              <tr><th className="py-1">Facture</th><th>Date</th><th>Montant</th></tr>
            </thead>
            <tbody>
              {ventesEnConflit.map((v) => (
                <tr key={v.numero_facture} className="border-t border-orange-100">
                  <td className="py-1">{v.numero_facture}</td>
                  <td>{new Date(v.date).toLocaleString("fr-FR")}</td>
                  <td>{Number(v.montant_total).toLocaleString("fr-FR")} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stockFaible && stockFaible.length > 0 && (
        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold mb-2">Articles en stock faible</h2>
          <table className="w-full text-xs">
            <thead className="text-gray-400 text-left">
              <tr><th className="py-1">Code</th><th>Nom</th><th>Stock</th></tr>
            </thead>
            <tbody>
              {stockFaible.map((a) => (
                <tr key={a.code_article} className="border-t border-gray-100">
                  <td className="py-1">{a.code_article}</td>
                  <td>{a.nom}</td>
                  <td>{a.quantite_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TODO FR-29 : graphique évolution des ventes 7 derniers jours (ex. avec recharts) */}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}
