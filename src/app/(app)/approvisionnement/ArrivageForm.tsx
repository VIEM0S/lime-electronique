"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Truck } from "lucide-react";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import ArticleModal from "../catalogue/ArticleModal";

type ArticleLite = { id: string; code_article: string; nom: string };
type Ligne = { article_id: string; quantite: string; cout_unitaire: string };

const LIGNE_VIDE: Ligne = { article_id: "", quantite: "", cout_unitaire: "" };

export default function ArrivageForm({ articles }: { articles: ArticleLite[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [nouvelArticleOuvert, setNouvelArticleOuvert] = useState(false);
  // index de la ligne pour laquelle on a ouvert "+ Nouvel article",
  // pour pouvoir la présélectionner une fois créée
  const [ligneCiblee, setLigneCiblee] = useState<number | null>(null);

  function majLigne(i: number, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, { ...LIGNE_VIDE }]);
  }

  function retirerLigne(i: number) {
    setLignes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function ouvrirNouvelArticle(i: number) {
    setLigneCiblee(i);
    setNouvelArticleOuvert(true);
  }

  async function valider() {
    setErreur(null);
    const lignesValides = lignes.filter((l) => l.article_id && Number(l.quantite) > 0);
    if (lignesValides.length === 0) {
      setErreur("Ajoutez au moins une ligne (article + quantité).");
      return;
    }

    setEnvoi(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: arrivage, error: erreurArrivage } = await supabase
      .from("approvisionnements")
      .insert({ utilisateur_id: user?.id ?? null })
      .select()
      .single();

    if (erreurArrivage || !arrivage) {
      setEnvoi(false);
      setErreur(erreurArrivage?.message ?? "Erreur lors de la création de l'arrivage.");
      return;
    }

    for (const l of lignesValides) {
      const { error } = await supabase.from("approvisionnements_lignes").insert({
        approvisionnement_id: arrivage.id,
        article_id: l.article_id,
        quantite: Number(l.quantite),
        cout_unitaire: Number(l.cout_unitaire) || 0,
      });
      if (error) {
        setEnvoi(false);
        setErreur(error.message);
        return;
      }
    }

    setEnvoi(false);
    setToast({ type: "success", text: `Arrivage enregistré — ${lignesValides.length} référence(s), stock mis à jour.` });
    setLignes([{ ...LIGNE_VIDE }]);
    router.refresh();
  }

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-display font-semibold">
        <Truck size={15} className="text-lime-deep" /> Nouvel arrivage
      </h2>

      <div className="space-y-2">
        <label className="block text-[10px] uppercase tracking-wide text-ink/40 font-semibold">
          Lignes (article, quantité, coût d&apos;achat unitaire)
        </label>
        {lignes.map((l, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select
              value={l.article_id}
              onChange={(e) => majLigne(i, { article_id: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-2 py-1.5 text-xs"
            >
              <option value="">— Sélectionner un article —</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.code_article} — {a.nom}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => ouvrirNouvelArticle(i)}
              className="flex items-center gap-1 text-[11px] text-lime-deep hover:text-ink font-semibold whitespace-nowrap px-1.5"
              title="Créer un nouvel article et l'ajouter à cette ligne"
            >
              <Plus size={12} /> Nouvel article
            </button>
            <input
              type="number"
              placeholder="Qté"
              value={l.quantite}
              onChange={(e) => majLigne(i, { quantite: e.target.value })}
              className="w-20 border border-ink/15 rounded-md px-2 py-1.5 text-xs num"
            />
            <input
              type="number"
              placeholder="Coût unit."
              value={l.cout_unitaire}
              onChange={(e) => majLigne(i, { cout_unitaire: e.target.value })}
              className="w-24 border border-ink/15 rounded-md px-2 py-1.5 text-xs num"
            />
            <button
              onClick={() => retirerLigne(i)}
              disabled={lignes.length === 1}
              className="text-ink/30 hover:text-signal disabled:opacity-30 p-1"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={ajouterLigne}
          className="flex items-center gap-1 text-[11px] text-lime-deep hover:text-ink font-semibold"
        >
          <Plus size={12} /> Ajouter une ligne
        </button>
      </div>

      {erreur && <p className="text-xs text-signal">{erreur}</p>}

      <Button onClick={valider} disabled={envoi}>
        {envoi ? "Enregistrement..." : "Valider l'arrivage"}
      </Button>

      <Toast toast={toast} onDone={() => setToast(null)} />

      {/* Création rapide d'un nouvel article directement depuis l'appro,
          sans devoir passer par le Catalogue au préalable. */}
      <ArticleModal
        open={nouvelArticleOuvert}
        onClose={() => setNouvelArticleOuvert(false)}
        article={null}
        onSaved={() => {
          setToast({ type: "success", text: "Article créé — sélectionnez-le dans la ligne." });
          // La liste `articles` vient du parent (server component) et sera
          // rafraîchie par ArticleModal via router.refresh(); on referme juste.
          if (ligneCiblee !== null) setLigneCiblee(null);
        }}
      />
    </div>
  );
}
