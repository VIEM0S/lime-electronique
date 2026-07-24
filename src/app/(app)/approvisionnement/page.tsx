import { createClient } from "@/lib/supabase/server";

export default async function ApprovisionnementPage() {
  const supabase = await createClient();

  const { data: historique } = await supabase
    .from("approvisionnements")
    .select("*, approvisionnements_lignes(quantite)")
    .order("date", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-accent">Approvisionnement</h1>
      <p className="text-xs text-gray-400 italic">
        Correspond au SSD UC-04 : créer arrivage → ajouter lignes → valider (met à jour le stock)
      </p>

      {/* TODO FR-19/20 : formulaire réel (date, source, lignes article/qté/coût)
          -> insert dans approvisionnements puis approvisionnements_lignes
          (le trigger fn_appro_lignes_stock met à jour le stock automatiquement) */}
      <div className="bg-white border border-gray-200 rounded p-4 text-xs text-gray-400 italic">
        Formulaire de nouvel arrivage — à implémenter (cf. maquette écran 6)
      </div>

      <div className="bg-white border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold mb-2">Arrivages précédents</h2>
        <table className="w-full text-xs">
          <thead className="text-gray-400 text-left">
            <tr><th className="py-1">Date</th><th>Source</th><th>Lignes</th><th>Coût transport</th><th>Frais douane</th></tr>
          </thead>
          <tbody>
            {(historique ?? []).map((a: any) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="py-1">{new Date(a.date).toLocaleDateString("fr-FR")}</td>
                <td>{a.source}</td>
                <td>{a.approvisionnements_lignes?.length ?? 0} réf.</td>
                <td>{Number(a.cout_transport).toLocaleString("fr-FR")} FCFA</td>
                <td>{Number(a.frais_douane).toLocaleString("fr-FR")} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
