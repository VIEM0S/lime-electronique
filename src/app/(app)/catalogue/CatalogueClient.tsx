"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Search, EyeOff, Eye } from "lucide-react";
import ArticleModal from "./ArticleModal";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Article } from "@/types/database.types";

type Mouvement = {
  id: string;
  date: string;
  type: "entree" | "sortie";
  quantite: number;
  motif: string | null;
  articles: { nom: string; code_article: string } | null;
};

export default function CatalogueClient({
  articles,
  mouvements,
}: {
  articles: Article[];
  mouvements: Mouvement[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [modalOuverte, setModalOuverte] = useState(false);
  const [articleEdite, setArticleEdite] = useState<Article | null>(null);
  const [afficherDesactives, setAfficherDesactives] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  const filtres = useMemo(() => {
    const base = afficherDesactives ? articles : articles.filter((a) => a.actif);
    if (!recherche) return base;
    const q = recherche.toLowerCase();
    return base.filter((a) => a.nom.toLowerCase().includes(q) || a.code_article.toLowerCase().includes(q));
  }, [articles, recherche, afficherDesactives]);

  async function basculerActif(a: Article) {
    const { error } = await supabase.from("articles").update({ actif: !a.actif }).eq("id", a.id);
    if (error) {
      setToast({ type: "error", text: error.message });
      return;
    }
    setToast({
      type: "success",
      text: a.actif ? `"${a.nom}" désactivé.` : `"${a.nom}" réactivé.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-display font-semibold text-ink">Catalogue — Articles</h1>
        <Button
          size="sm"
          onClick={() => {
            setArticleEdite(null);
            setModalOuverte(true);
          }}
        >
          <Plus size={14} /> Nouvel article
        </Button>
      </div>
      <p className="text-xs text-ink/40 italic -mt-4">
        Un numéro = un article (chaque variante est distincte)
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un article..."
            className="w-full border border-ink/15 rounded-md pl-8 pr-3 py-1.5 text-xs bg-white
              focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink/50 whitespace-nowrap">
          <input
            type="checkbox"
            checked={afficherDesactives}
            onChange={(e) => setAfficherDesactives(e.target.checked)}
            className="rounded accent-lime-deep"
          />
          Afficher les articles désactivés
        </label>
      </div>

      <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] overflow-hidden">
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
<table className="w-full text-xs">
          <thead className="bg-argent/10 text-ink/40 text-left">
            <tr>
              <th className="p-2.5">Code</th>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Prix vente</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtres.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-ink/30 italic">
                  Aucun article. Commence par en créer un.
                </td>
              </tr>
            )}
            {filtres.map((a) => (
              <tr
                key={a.id}
                className={`border-t border-ink/5 hover:bg-lime/5 transition-colors ${!a.actif ? "opacity-50" : ""}`}
              >
                <td className="p-2.5 num">{a.code_article}</td>
                <td>
                  {a.nom}
                  {!a.actif && (
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-ink/10 text-ink/50">
                      Désactivé
                    </span>
                  )}
                </td>
                <td className="text-ink/50">{a.categorie}</td>
                <td className="num">{Number(a.prix_vente).toLocaleString("fr-FR")} FCFA</td>
                <td className={`num ${a.quantite_stock < 5 ? "text-ember font-semibold" : ""}`}>
                  {a.quantite_stock}
                </td>
                <td className="pr-2.5 text-right space-x-1 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setArticleEdite(a);
                      setModalOuverte(true);
                    }}
                    className="text-ink/40 hover:text-lime-deep p-1 rounded hover:bg-lime/10 transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => basculerActif(a)}
                    className="text-ink/40 hover:text-ember p-1 rounded hover:bg-ember/10 transition-colors"
                    title={a.actif ? "Désactiver" : "Réactiver"}
                  >
                    {a.actif ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>

      <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-4">
        <h2 className="text-sm font-display font-semibold mb-1">Mouvements de stock récents</h2>
        <p className="text-xs text-ink/40 italic mb-2">Historique des entrées/sorties</p>
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
<table className="w-full text-xs">
          <thead className="text-ink/40 text-left">
            <tr><th className="py-1">Date</th><th>Article</th><th>Type</th><th>Qté</th><th>Motif</th></tr>
          </thead>
          <tbody>
            {mouvements.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-center text-ink/30 italic">Aucun mouvement récent</td></tr>
            )}
            {mouvements.map((m) => (
              <tr key={m.id} className="border-t border-ink/5">
                <td className="py-1">{new Date(m.date).toLocaleString("fr-FR")}</td>
                <td>{m.articles?.code_article} — {m.articles?.nom}</td>
                <td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    m.type === "entree" ? "bg-ok/10 text-ok" : "bg-ink/5 text-ink/50"
                  }`}>
                    {m.type === "entree" ? "Entrée" : "Sortie"}
                  </span>
                </td>
                <td className={`num ${m.type === "entree" ? "text-ok" : "text-ink/60"}`}>
                  {m.type === "entree" ? "+" : "-"}{m.quantite}
                </td>
                <td className="text-ink/50">{m.motif}</td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
      </div>

      <ArticleModal
        open={modalOuverte}
        onClose={() => setModalOuverte(false)}
        article={articleEdite}
        onSaved={(msg) => setToast({ type: "success", text: msg })}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
