"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Truck, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import SelecteurArticleLigne from "./SelecteurArticleLigne";

type ArticleLite = { id: string; code_article: string; nom: string };
type Ligne = { article_id: string; quantite: string; cout_unitaire: string };

const LIGNE_VIDE: Ligne = { article_id: "", quantite: "", cout_unitaire: "" };

export default function ArrivageForm({ articles }: { articles: ArticleLite[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [articlesLocaux, setArticlesLocaux] = useState<ArticleLite[]>(articles);
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  // Ligne en cours de création d'un nouvel article (index de la ligne, ou null)
  const [creationSurLigne, setCreationSurLigne] = useState<number | null>(null);
  const [nvCode, setNvCode] = useState("");
  const [nvNom, setNvNom] = useState("");
  const [nvPrixVente, setNvPrixVente] = useState("");
  const [nvQuantite, setNvQuantite] = useState("");
  const [nvErreur, setNvErreur] = useState<string | null>(null);
  const [nvEnvoi, setNvEnvoi] = useState(false);

  function majLigne(i: number, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, { ...LIGNE_VIDE }]);
  }

  function retirerLigne(i: number) {
    setLignes((prev) => prev.filter((_, idx) => idx !== i));
    if (creationSurLigne === i) setCreationSurLigne(null);
  }

  function ouvrirCreation(i: number) {
    setCreationSurLigne(i);
    setNvCode("");
    setNvNom("");
    setNvPrixVente("");
    setNvQuantite("");
    setNvErreur(null);
  }

  // Génère un code auto (ART-xxxx) quand le code est laissé vide — le code
  // article n'a pas besoin d'être choisi à la main pour créer un article.
  function genererCodeAuto() {
    const suffixe = Math.floor(1000 + Math.random() * 9000);
    return `ART-${suffixe}`;
  }

  async function creerArticle(i: number) {
    setNvErreur(null);
    if (!nvNom.trim() || !nvPrixVente) {
      setNvErreur("Le nom et le prix de vente sont obligatoires (le code peut rester vide).");
      return;
    }
    setNvEnvoi(true);

    let tentatives = 0;
    let derniereErreur: string | null = null;
    while (tentatives < 3) {
      const codeAEnvoyer = nvCode.trim() || genererCodeAuto();
      const { data, error } = await supabase
        .from("articles")
        .insert({
          code_article: codeAEnvoyer,
          nom: nvNom.trim(),
          prix_vente: Number(nvPrixVente),
          quantite_stock: 0,
        })
        .select("id, code_article, nom")
        .single();

      if (!error && data) {
        setNvEnvoi(false);
        setArticlesLocaux((prev) => [...prev, data]);
        // Pré-remplit aussi la quantité de cette ligne avec ce qui vient
        // d'être saisi, pour que ce soit visible immédiatement — pas besoin
        // de la ressaisir dans la ligne juste en dessous.
        majLigne(i, { article_id: data.id, quantite: nvQuantite });
        setCreationSurLigne(null);
        return;
      }

      // Si c'est un conflit sur un code auto-généré (déjà pris par hasard),
      // on retente avec un nouveau code plutôt que d'échouer directement —
      // mais si l'utilisateur avait tapé son propre code, on ne retente pas.
      derniereErreur = error?.message ?? "Erreur lors de la création.";
      if (nvCode.trim() || !derniereErreur.toLowerCase().includes("duplicate")) break;
      tentatives++;
    }

    setNvEnvoi(false);
    setNvErreur(derniereErreur);
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
    <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-4 space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-display font-semibold">
        <Truck size={15} className="text-lime-deep" /> Nouvel arrivage
      </h2>

      <div className="space-y-2">
        <label className="block text-[10px] uppercase tracking-wide text-ink/55 font-semibold">
          Lignes (article, quantité, coût d&apos;achat unitaire)
        </label>
        {lignes.map((l, i) =>
          creationSurLigne === i ? (
            <div key={i} className="border border-lime-deep/40 bg-lime/5 rounded-md p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-lime-deep">Nouvel article</span>
                <button onClick={() => setCreationSurLigne(null)} className="text-ink/45 hover:text-ink p-0.5">
                  <X size={13} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  placeholder="Code (optionnel — auto si vide)"
                  value={nvCode}
                  onChange={(e) => setNvCode(e.target.value)}
                  className="w-full sm:w-40 border border-ink/15 rounded-md px-2 py-1.5 text-xs"
                />
                <input
                  placeholder="Nom de l'article"
                  value={nvNom}
                  onChange={(e) => setNvNom(e.target.value)}
                  className="flex-1 min-w-0 border border-ink/15 rounded-md px-2 py-1.5 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="number"
                  placeholder="Prix vente"
                  value={nvPrixVente}
                  onChange={(e) => setNvPrixVente(e.target.value)}
                  className="flex-1 min-w-0 sm:flex-none sm:w-24 border border-ink/15 rounded-md px-2 py-1.5 text-xs num"
                />
                <input
                  type="number"
                  placeholder="Quantité reçue"
                  value={nvQuantite}
                  onChange={(e) => setNvQuantite(e.target.value)}
                  className="flex-1 min-w-0 sm:flex-none sm:w-28 border border-lime-deep/50 rounded-md px-2 py-1.5 text-xs num"
                />
              </div>
              {nvErreur && <p className="text-[11px] text-signal">{nvErreur}</p>}
              <button
                onClick={() => creerArticle(i)}
                disabled={nvEnvoi}
                className="text-[11px] bg-lime-deep text-white rounded-md px-3 py-1.5 font-semibold disabled:opacity-50"
              >
                {nvEnvoi ? "Création..." : "Créer et utiliser cet article"}
              </button>
            </div>
          ) : (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <SelecteurArticleLigne
                articles={articlesLocaux}
                valeurSelectionnee={l.article_id}
                onSelectionner={(id) => majLigne(i, { article_id: id })}
              />
              <button
                type="button"
                onClick={() => ouvrirCreation(i)}
                title="Créer un nouvel article"
                className="flex items-center gap-1 text-[11px] text-lime-deep hover:text-ink font-semibold whitespace-nowrap px-1.5 shrink-0"
              >
                <Plus size={12} /> Nouvel article
              </button>
              <input
                type="number"
                placeholder="Qté"
                value={l.quantite}
                onChange={(e) => majLigne(i, { quantite: e.target.value })}
                className="flex-1 min-w-0 sm:flex-none sm:w-20 border border-ink/15 rounded-md px-2 py-1.5 text-xs num"
              />
              <input
                type="number"
                placeholder="Coût unit."
                value={l.cout_unitaire}
                onChange={(e) => majLigne(i, { cout_unitaire: e.target.value })}
                className="flex-1 min-w-0 sm:flex-none sm:w-24 border border-ink/15 rounded-md px-2 py-1.5 text-xs num"
              />
              <button
                onClick={() => retirerLigne(i)}
                disabled={lignes.length === 1}
                className="text-ink/45 hover:text-signal disabled:opacity-30 p-1 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        )}
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
    </div>
  );
}
