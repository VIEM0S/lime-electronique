"use client";

import { useState } from "react";
import { PackageMinus, PackagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Article } from "@/types/database.types";

export default function AjusterStockModal({
  open,
  onClose,
  article,
  onAjuste,
}: {
  open: boolean;
  onClose: () => void;
  article: Article;
  onAjuste: (nouvelleQuantite: number) => void;
}) {
  const supabase = createClient();
  const [nouvelleQuantite, setNouvelleQuantite] = useState(String(article.quantite_stock));
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const delta = Number(nouvelleQuantite) - article.quantite_stock;

  async function ajuster() {
    setErreur(null);
    const valeur = Number(nouvelleQuantite);
    if (!Number.isFinite(valeur) || valeur < 0) {
      setErreur("Entre une quantité valide (0 ou plus).");
      return;
    }
    if (valeur === article.quantite_stock) {
      onClose();
      return;
    }

    setEnvoi(true);
    const { error } = await supabase.rpc("fn_ajuster_stock", {
      p_article_id: article.id,
      p_nouvelle_quantite: valeur,
      p_motif: motif.trim() || null,
    });
    setEnvoi(false);

    if (error) {
      setErreur(error.message);
      return;
    }
    setMotif("");
    onAjuste(valeur);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Ajuster le stock — ${article.nom}`}>
      <div className="space-y-3">
        <p className="text-xs text-ink/60">
          Stock actuel : <span className="font-semibold num">{article.quantite_stock}</span>. Corrige une erreur de
          quantité (arrivage mal saisi, casse, inventaire...) — ça reste tracé dans l&apos;historique des mouvements,
          contrairement à une modification directe.
        </p>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
            Nouvelle quantité en stock
          </label>
          <input
            type="number"
            min={0}
            value={nouvelleQuantite}
            onChange={(e) => setNouvelleQuantite(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm num focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            autoFocus
          />
          {delta !== 0 && !Number.isNaN(delta) && (
            <p className={`text-[11px] mt-1 flex items-center gap-1 ${delta > 0 ? "text-ok" : "text-signal"}`}>
              {delta > 0 ? <PackagePlus size={12} /> : <PackageMinus size={12} />}
              {delta > 0 ? `+${delta}` : delta} par rapport au stock actuel
            </p>
          )}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
            Motif (optionnel)
          </label>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="Ex : erreur de saisie sur l'arrivage du 03/08"
          />
        </div>

        {erreur && <p className="text-xs text-signal">{erreur}</p>}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={ajuster} disabled={envoi} className="flex-1">
            {envoi ? "Enregistrement..." : "Corriger le stock"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
