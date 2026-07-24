"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ModePaiement } from "@/types/database.types";

type ArticleLite = { id: string; code_article: string; nom: string; prix_vente: number; quantite_stock: number };
type ClientLite = { id: string; nom: string; telephone: string | null };

type Ligne = { article: ArticleLite; quantite: number };

const MODES: { key: ModePaiement; label: string }[] = [
  { key: "especes", label: "Espèces" },
  { key: "mobile_money", label: "Mobile Money" },
  { key: "virement", label: "Virement" },
  { key: "credit", label: "Crédit" },
];

export default function CaisseForm({ articles, clients }: { articles: ArticleLite[]; clients: ClientLite[] }) {
  const supabase = createClient();

  const [recherche, setRecherche] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [montants, setMontants] = useState<Record<ModePaiement, number>>({
    especes: 0,
    mobile_money: 0,
    virement: 0,
    credit: 0,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ numero_facture: string; statut: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const total = useMemo(
    () => lignes.reduce((s, l) => s + l.quantite * l.article.prix_vente, 0),
    [lignes]
  );
  const totalPaye = useMemo(
    () => Object.values(montants).reduce((s, m) => s + (m || 0), 0),
    [montants]
  );

  const resultats = recherche.length
    ? articles.filter(
        (a) =>
          a.code_article.toLowerCase().includes(recherche.toLowerCase()) ||
          a.nom.toLowerCase().includes(recherche.toLowerCase())
      )
    : [];

  function ajouterArticle(a: ArticleLite) {
    setRecherche("");
    setLignes((prev) => {
      const existant = prev.find((l) => l.article.id === a.id);
      if (existant) {
        return prev.map((l) => (l.article.id === a.id ? { ...l, quantite: l.quantite + 1 } : l));
      }
      return [...prev, { article: a, quantite: 1 }];
    });
  }

  function majQuantite(articleId: string, quantite: number) {
    setLignes((prev) => prev.map((l) => (l.article.id === articleId ? { ...l, quantite } : l)));
  }

  async function validerVente() {
    setErreur(null);
    setResultat(null);

    if (lignes.length === 0) {
      setErreur("Ajoutez au moins un article.");
      return;
    }
    if (montants.credit > 0 && !clientId) {
      // Reflète BR-06 côté interface (le serveur refuserait de toute façon)
      setErreur("Un client doit être sélectionné pour utiliser le mode crédit.");
      return;
    }
    if (Math.round(totalPaye) !== Math.round(total)) {
      setErreur(`Le total des paiements (${totalPaye.toLocaleString("fr-FR")} FCFA) doit être égal au total de la vente (${total.toLocaleString("fr-FR")} FCFA).`);
      return;
    }

    setEnvoi(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Créer la vente (numero_facture auto-généré côté serveur, cf. schema.sql)
    const { data: vente, error: erreurVente } = await supabase
      .from("ventes")
      .insert({ client_id: clientId || null, utilisateur_id: user?.id ?? null })
      .select()
      .single();

    if (erreurVente || !vente) {
      setEnvoi(false);
      setErreur(erreurVente?.message ?? "Erreur lors de la création de la vente.");
      return;
    }

    // 2. Ajouter les lignes (le trigger fn_ventes_lignes_stock décrémente le
    //    stock et bloque si insuffisant, cf. FR-08 — l'erreur remonte ici)
    for (const l of lignes) {
      const { error: erreurLigne } = await supabase.from("ventes_lignes").insert({
        vente_id: vente.id,
        article_id: l.article.id,
        quantite: l.quantite,
        prix_unitaire: l.article.prix_vente,
      });
      if (erreurLigne) {
        setEnvoi(false);
        setErreur(erreurLigne.message); // ex. "Stock insuffisant pour l'article ..."
        return;
      }
    }

    // 3. Enregistrer les paiements renseignés (mode "credit" -> incrémente
    //    clients.solde_du via trigger, refusé si client_id est vide, BR-06)
    for (const mode of MODES) {
      const montant = montants[mode.key];
      if (montant > 0) {
        const { error: erreurPaiement } = await supabase
          .from("paiements")
          .insert({ vente_id: vente.id, mode: mode.key, montant });
        if (erreurPaiement) {
          setEnvoi(false);
          setErreur(erreurPaiement.message);
          return;
        }
      }
    }

    const { data: venteFinale } = await supabase
      .from("ventes")
      .select("numero_facture, statut")
      .eq("id", vente.id)
      .single();

    setEnvoi(false);
    setResultat(venteFinale ?? { numero_facture: vente.numero_facture, statut: "impayee" });
    setLignes([]);
    setMontants({ especes: 0, mobile_money: 0, virement: 0, credit: 0 });
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-3">
        <div className="relative">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un article (code ou nom)..."
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {resultats.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-200 rounded mt-1 w-full shadow">
              {resultats.map((a) => (
                <button
                  key={a.id}
                  onClick={() => ajouterArticle(a)}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                >
                  {a.code_article} — {a.nom} ({a.quantite_stock} en stock)
                </button>
              ))}
            </div>
          )}
        </div>

        <table className="w-full text-xs bg-white border border-gray-200 rounded">
          <thead className="text-gray-400 text-left">
            <tr><th className="p-2">Article</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.article.id} className="border-t border-gray-100">
                <td className="p-2">{l.article.code_article} — {l.article.nom}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={l.quantite}
                    onChange={(e) => majQuantite(l.article.id, Number(e.target.value))}
                    className="w-14 border border-gray-200 rounded px-1"
                  />
                </td>
                <td>{l.article.prix_vente.toLocaleString("fr-FR")} FCFA</td>
                <td>{(l.quantite * l.article.prix_vente).toLocaleString("fr-FR")} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded p-3">
          <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">
            Client (optionnel — requis si crédit)
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
          >
            <option value="">— Aucun —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom} — {c.telephone}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded p-3 space-y-2">
          <label className="block text-[10px] uppercase tracking-wide text-gray-400">Mode(s) de paiement</label>
          {MODES.map((m) => (
            <div key={m.key} className="flex items-center justify-between text-xs">
              <span>{m.label}</span>
              <input
                type="number"
                min={0}
                value={montants[m.key] || ""}
                onChange={(e) => setMontants((prev) => ({ ...prev, [m.key]: Number(e.target.value) }))}
                className="w-24 border border-gray-200 rounded px-1 text-right"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded p-3 text-sm">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Total à payer</div>
          <div className="font-semibold">{total.toLocaleString("fr-FR")} FCFA</div>
        </div>

        {erreur && <p className="text-xs text-red-600">{erreur}</p>}

        <button
          onClick={validerVente}
          disabled={envoi}
          className="w-full bg-accent text-white rounded py-2 text-sm font-semibold disabled:opacity-50"
        >
          {envoi ? "Enregistrement..." : "Valider la vente"}
        </button>

        {resultat && (
          <div className="bg-white border border-gray-200 rounded p-3 text-xs space-y-2">
            <div>
              Facture <b>{resultat.numero_facture}</b> générée — statut : <b>{resultat.statut}</b>
            </div>
            {/* TODO FR-14 : génération réelle du PDF (ex. @react-pdf/renderer) */}
            <div className="flex gap-2">
              <button className="flex-1 border border-accent text-accent rounded py-1">Aperçu facture</button>
              <button className="flex-1 border border-accent text-accent rounded py-1">Télécharger PDF</button>
            </div>
            <p className="text-[10px] text-gray-400">
              Si la vente est hors-ligne, un identifiant provisoire est affiché en attendant la
              synchronisation (cf. SSD UC-10).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
