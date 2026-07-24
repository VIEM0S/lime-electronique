"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Article } from "@/types/database.types";

const CATEGORIES = [
  "Bureaux & mobilier de bureau",
  "Meubles maison",
  "Informatique",
  "Électroménager",
  "Autre",
];

const VIDE = {
  code_article: "",
  nom: "",
  description: "",
  categorie: CATEGORIES[0],
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
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (article) {
      setForm({
        code_article: article.code_article,
        nom: article.nom,
        description: article.description ?? "",
        categorie: article.categorie ?? CATEGORIES[0],
        prix_achat: article.prix_achat != null ? String(article.prix_achat) : "",
        prix_vente: String(article.prix_vente),
        quantite_stock: String(article.quantite_stock),
      });
    } else {
      setForm(VIDE);
    }
    setErreur(null);
  }, [article, open]);

  async function enregistrer() {
    setErreur(null);
    if (!form.code_article.trim() || !form.nom.trim() || !form.prix_vente) {
      setErreur("Code, nom et prix de vente sont obligatoires.");
      return;
    }

    setEnvoi(true);
    const payload = {
      code_article: form.code_article.trim(),
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      categorie: form.categorie,
      prix_achat: form.prix_achat ? Number(form.prix_achat) : null,
      prix_vente: Number(form.prix_vente),
      quantite_stock: Number(form.quantite_stock) || 0,
    };

    const { error } = article
      ? await supabase.from("articles").update(payload).eq("id", article.id)
      : await supabase.from("articles").insert(payload);

    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }

    onSaved(article ? "Article mis à jour." : "Article créé.");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={article ? "Modifier l'article" : "Nouvel article"}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code article">
            <input
              value={form.code_article}
              onChange={(e) => setForm((f) => ({ ...f, code_article: e.target.value }))}
              className="input"
              placeholder="ART-0142"
            />
          </Field>
          <Field label="Catégorie">
            <select
              value={form.categorie}
              onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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

        <div className="grid grid-cols-3 gap-3">
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
          <Field label="Stock initial">
            <input
              type="number"
              value={form.quantite_stock}
              onChange={(e) => setForm((f) => ({ ...f, quantite_stock: e.target.value }))}
              className="input num"
              placeholder="0"
              disabled={!!article}
              title={article ? "Utilisez Approvisionnement ou un mouvement de stock pour ajuster" : undefined}
            />
          </Field>
        </div>

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
      <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
