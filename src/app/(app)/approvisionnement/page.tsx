import { createClient } from "@/lib/supabase/server";
import ArrivageForm from "./ArrivageForm";

export default async function ApprovisionnementPage() {
  const supabase = await createClient();

  const { data: historique } = await supabase
    .from("approvisionnements")
    .select("*, approvisionnements_lignes(quantite)")
    .order("date", { ascending: false })
    .limit(10);

  const { data: articles } = await supabase
    .from("articles")
    .select("id, code_article, nom")
    .eq("actif", true)
    .order("nom");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Approvisionnement</h1>
        <p className="text-xs text-ink/40 italic">
          SSD UC-04 : créer arrivage → ajouter lignes → valider (met à jour le stock automatiquement)
        </p>
      </div>

      <ArrivageForm articles={articles ?? []} />

      <div className="bg-white border border-ink/10 rounded-lg p-4">
        <h2 className="text-sm font-display font-semibold mb-2">Arrivages précédents</h2>
        <table className="w-full text-xs">
          <thead className="text-ink/40 text-left">
            <tr><th className="py-1">Date</th><th>Lignes</th></tr>
          </thead>
          <tbody>
            {(historique ?? []).length === 0 && (
              <tr><td colSpan={2} className="py-3 text-center text-ink/30 italic">Aucun arrivage enregistré</td></tr>
            )}
            {(historique ?? []).map((a: any) => (
              <tr key={a.id} className="border-t border-ink/5">
                <td className="py-1">{new Date(a.date).toLocaleDateString("fr-FR")}</td>
                <td className="num">{a.approvisionnements_lignes?.length ?? 0} réf.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
