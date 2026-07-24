import { createClient } from "@/lib/supabase/server";

export default async function CataloguePage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("actif", true)
    .order("nom");

  const { data: mouvements } = await supabase
    .from("mouvements_stock")
    .select("*, articles(nom, code_article)")
    .order("date", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-accent">Catalogue — Articles</h1>
        {/* TODO FR-01/02 : formulaire de création/édition d'article */}
        <button className="text-xs font-semibold border border-accent text-accent rounded px-3 py-1.5">
          + Nouvel article
        </button>
      </div>
      <p className="text-xs text-gray-400 italic">Un numéro = un article (chaque variante est distincte)</p>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="p-2">Code</th>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Prix vente</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {(articles ?? []).map((a) => (
              <tr key={a.id} className="border-t border-gray-100">
                <td className="p-2">{a.code_article}</td>
                <td>{a.nom}</td>
                <td>{a.categorie}</td>
                <td>{Number(a.prix_vente).toLocaleString("fr-FR")} FCFA</td>
                <td className={a.quantite_stock < 5 ? "text-amber-600 font-semibold" : ""}>
                  {a.quantite_stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold mb-1">Mouvements de stock récents</h2>
        <p className="text-xs text-gray-400 italic mb-2">FR-07 — historique des entrées/sorties</p>
        <table className="w-full text-xs">
          <thead className="text-gray-400 text-left">
            <tr><th className="py-1">Date</th><th>Article</th><th>Type</th><th>Qté</th><th>Motif</th></tr>
          </thead>
          <tbody>
            {(mouvements ?? []).map((m: any) => (
              <tr key={m.id} className="border-t border-gray-100">
                <td className="py-1">{new Date(m.date).toLocaleString("fr-FR")}</td>
                <td>{m.articles?.code_article} — {m.articles?.nom}</td>
                <td>{m.type === "entree" ? "Entrée" : "Sortie"}</td>
                <td>{m.type === "entree" ? "+" : "-"}{m.quantite}</td>
                <td>{m.motif}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
