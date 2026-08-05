"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import AjusterStockModal from "./AjusterStockModal";
import type { Article } from "@/types/database.types";

const CATEGORIES_SUGGEREES = [
  "Bureaux & mobilier de bureau",
  "Meubles maison",
  "Informatique",
  "Électroménager",
  "Autre",
];

const NOUVELLE_CATEGORIE = "__nouvelle__";

const VIDE = {
  code_article: "",
  nom: "",
  description: "",
  categorie: CATEGORIES_SUGGEREES[0],
  prix_achat: "",
  prix_vente: "",
  quantite_stock: "",
};

export default function ArticleModal({
  open,
  onClose,
  article,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  article: Article | null; // null = création, sinon édition
  onSaved: (message: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState(VIDE);
  const [modaleAjustementOuverte, setModaleAjustementOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [categoriesExistantes, setCategoriesExistantes] = useState<string[]>([]);
  const [nouvelleCategorieTexte, setNouvelleCategorieTexte] = useState("");
  const [saisieNouvelleCategorie, setSaisieNouvelleCategorie] = useState(false);

  // Catégories réellement utilisées dans le catalogue + les suggestions de
  // base, pour proposer d'abord ce que l'utilisateur a déjà créé.
  useEffect(() => {
    if (!open) return;
    supabase
      .from("articles")
      .select("categorie")
      .not("categorie", "is", null)
      .then(({ data }) => {
        const existantes = Array.from(new Set((data ?? []).map((a) => a.categorie).filter(Boolean))) as string[];
        setCategoriesExistantes(existantes.sort((a, b) => a.localeCompare(b)));
      });
  }, [open]);

  const optionsCategorie = Array.from(
    new Set([...categoriesExistantes, ...CATEGORIES_SUGGEREES])
  );

  useEffect(() => {
    if (article) {
      setForm({
        code_article: article.code_article,
        nom: article.nom,
        description: article.description ?? "",
        categorie: article.categorie ?? CATEGORIES_SUGGEREES[0],
        prix_achat: article.prix_achat != null ? String(article.prix_achat) : "",
        prix_vente: String(article.prix_vente),
        quantite_stock: String(article.quantite_stock),
      });
    } else {
      setForm(VIDE);
    }
    setSaisieNouvelleCategorie(false);
    setNouvelleCategorieTexte("");
    setErreur(null);
  }, [article, open]);

  async function enregistrer() {
    setErreur(null);
    if (!form.nom.trim() || !form.prix_vente) {
      setErreur("Le nom et le prix de vente sont obligatoires (le code peut rester vide).");
      return;
    }
    if (saisieNouvelleCategorie && !nouvelleCategorieTexte.trim()) {
      setErreur("Donne un nom à la nouvelle catégorie, ou reviens à la liste existante.");
      return;
    }

    setEnvoi(true);

    let tentatives = 0;
    let derniereErreur: string | null = null;
    while (tentatives < 3) {
      const codeAEnvoyer = form.code_article.trim() || `ART-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        code_article: codeAEnvoyer,
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        categorie: saisieNouvelleCategorie ? nouvelleCategorieTexte.trim() : form.categorie,
        prix_achat: form.prix_achat ? Number(form.prix_achat) : null,
        prix_vente: Number(form.prix_vente),
        quantite_stock: Number(form.quantite_stock) || 0,
      };

      const { error } = article
        ? await supabase.from("articles").update(payload).eq("id", article.id)
        : await supabase.from("articles").insert(payload);

      if (!error) {
        setEnvoi(false);
        onSaved(article ? "Article mis à jour." : "Article créé.");
        router.refresh();
        onClose();
        return;
      }

      derniereErreur = error.message;
      // Ne retente que si c'est un conflit sur un code auto-généré — si
      // l'utilisateur avait tapé son propre code, on ne retente pas à sa place.
      if (form.code_article.trim() || !derniereErreur.toLowerCase().includes("duplicate")) break;
      tentatives++;
    }

    setEnvoi(false);
    setErreur(derniereErreur);
  }

  return (
    <Modal open={open} onClose={onClose} title={article ? "Modifier l'article" : "Nouvel article"}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Code article (optionnel)">
            <input
              value={form.code_article}
              onChange={(e) => setForm((f) => ({ ...f, code_article: e.target.value }))}
              className="input"
              placeholder="Généré automatiquement si vide"
            />
          </Field>
          <Field label="Catégorie">
            {saisieNouvelleCategorie ? (
              <div className="flex gap-1.5">
                <input
                  value={nouvelleCategorieTexte}
                  onChange={(e) => setNouvelleCategorieTexte(e.target.value)}
                  className="input"
                  placeholder="Ex: Quincaillerie"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setSaisieNouvelleCategorie(false);
                    setNouvelleCategorieTexte("");
                  }}
                  className="text-[11px] text-ink/55 hover:text-ink whitespace-nowrap px-1"
                  title="Revenir à la liste"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <select
                value={form.categorie}
                onChange={(e) => {
                  if (e.target.value === NOUVELLE_CATEGORIE) {
                    setSaisieNouvelleCategorie(true);
                  } else {
                    setForm((f) => ({ ...f, categorie: e.target.value }));
                  }
                }}
                className="input"
              >
                {optionsCategorie.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={NOUVELLE_CATEGORIE}>+ Nouvelle catégorie...</option>
              </select>
            )}
          </Field>
        </div>

        <Field label="Nom">
          <input
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            className="input"
            placeholder="Bureau en L 140cm"
          />
        </Field>

        <Field label="Description (optionnel)">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input"
            rows={2}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Prix achat">
            <input
              type="number"
              value={form.prix_achat}
              onChange={(e) => setForm((f) => ({ ...f, prix_achat: e.target.value }))}
              className="input num"
              placeholder="0"
            />
          </Field>
          <Field label="Prix vente *">
            <input
              type="number"
              value={form.prix_vente}
              onChange={(e) => setForm((f) => ({ ...f, prix_vente: e.target.value }))}
              className="input num"
              placeholder="0"
            />
          </Field>
          <Field label={article ? "Stock actuel" : "Stock initial"}>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={form.quantite_stock}
                onChange={(e) => setForm((f) => ({ ...f, quantite_stock: e.target.value }))}
                className="input num"
                placeholder="0"
                disabled={!!article}
                title={article ? "Utilise \"Ajuster\" pour corriger le stock, avec trace dans l'historique" : undefined}
              />
              {article && (
                <button
                  type="button"
                  onClick={() => setModaleAjustementOuverte(true)}
                  className="text-[11px] whitespace-nowrap px-2.5 rounded-md border border-lime-deep/40 text-lime-deep font-semibold hover:bg-lime/5"
                >
                  Ajuster
                </button>
              )}
            </div>
          </Field>
        </div>

        {article && (
          <AjusterStockModal
            open={modaleAjustementOuverte}
            onClose={() => setModaleAjustementOuverte(false)}
            article={article}
            onAjuste={(nouvelleQuantite) => {
              setForm((f) => ({ ...f, quantite_stock: String(nouvelleQuantite) }));
              setModaleAjustementOuverte(false);
              router.refresh();
            }}
          />
        )}

        {erreur && <p className="text-xs text-signal">{erreur}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={enregistrer} disabled={envoi} className="flex-1">
            {envoi ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgba(22, 33, 31, 0.15);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #8fa916;
          box-shadow: 0 0 0 1px #8fa916;
        }
      `}</style>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
