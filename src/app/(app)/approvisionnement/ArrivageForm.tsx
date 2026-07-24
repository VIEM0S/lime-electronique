"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Truck } from "lucide-react";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";

type ArticleLite = { id: string; code_article: string; nom: string };
type Ligne = { article_id: string; quantite: string; cout_unitaire: string };

const LIGNE_VIDE: Ligne = { article_id: "", quantite: "", cout_unitaire: "" };

export default function ArrivageForm({ articles }: { articles: ArticleLite[] }) {
  const supabase = createClient();
  const router = useRouter();

  const [source, setSource] = useState("");
  const [coutTransport, setCoutTransport] = useState("");
  const [fraisDouane, setFraisDouane] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<ToastMsg>(null);

  function majLigne(i: number, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, { ...LIGNE_VIDE }]);
  }

  function retirerLigne(i: number) {
    setLignes((prev) => prev.filter((_, idx) => idx !== i));
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
      .insert({
        source: source.trim() || null,
        cout_transport: Number(coutTransport) || 0,
        frais_douane: Number(fraisDouane) || 0,
        utilisateur_id: user?.id ?? null,
      })
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
    setSource("");
    setCoutTransport("");
    setFraisDouane("");
    setLignes([{ ...LIGNE_VIDE }]);
    router.refresh();
  }

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-4">
      <h2 className="flex items-center gap-1.5 text-sm font-display font-semibold">
        <Truck size={15} className="text-lime-deep" /> Nouvel arrivage
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Source / fournisseur
          </label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Guangzhou, fournisseur local..."
            className="w-full border border-ink/15 rounded-md px-2.5 py-1.5 text-xs focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Coût transport (FCFA)
          </label>
          <input
            type="number"
            value={coutTransport}
            onChange={(e) => setCoutTransport(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-2.5 py-1.5 text-xs num focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Frais de douane (FCFA)
          </label>
          <input
            type="number"
            value={fraisDouane}
            onChange={(e) => setFraisDouane(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-2.5 py-1.5 text-xs num focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
      </div>

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
    </div>
  );
}
