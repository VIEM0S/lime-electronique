"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, ShoppingBag } from "lucide-react";
import type { ModePaiement } from "@/types/database.types";
import { estEnLigne, mettreEnFileVente } from "@/lib/offline/queue";
import Button from "@/components/ui/Button";
import FactureApercu from "./FactureApercu";

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
  const [resultat, setResultat] = useState<{ numero_facture: string; statut: string; horsLigne: boolean } | null>(null);
  const [recu, setRecu] = useState<{ lignes: Ligne[]; total: number; clientNom: string | null } | null>(null);
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

  function reinitialiser() {
    setLignes([]);
    setMontants({ especes: 0, mobile_money: 0, virement: 0, credit: 0 });
  }

  async function validerVente() {
    setErreur(null);
    setResultat(null);

    if (lignes.length === 0) {
      setErreur("Ajoutez au moins un article.");
      return;
    }
    if (montants.credit > 0 && !clientId) {
      setErreur("Un client doit être sélectionné pour utiliser le mode crédit.");
      return;
    }
    if (Math.round(totalPaye) !== Math.round(total)) {
      setErreur(`Le total des paiements (${totalPaye.toLocaleString("fr-FR")} FCFA) doit être égal au total de la vente (${total.toLocaleString("fr-FR")} FCFA).`);
      return;
    }

    setEnvoi(true);

    // Mode hors-ligne (FR-25/SSD UC-08) : on ne tente même pas le réseau,
    // on met directement en file d'attente locale.
    if (!estEnLigne()) {
      const action = await mettreEnFileVente({
        client_id: clientId || null,
        lignes: lignes.map((l) => ({
          article_id: l.article.id,
          quantite: l.quantite,
          prix_unitaire: l.article.prix_vente,
        })),
        paiements: MODES.filter((m) => montants[m.key] > 0).map((m) => ({
          mode: m.key,
          montant: montants[m.key],
        })),
      });
      setEnvoi(false);
      setResultat({ numero_facture: action.numeroProvisoire, statut: "en attente de synchronisation", horsLigne: true });
      setRecu({ lignes, total, clientNom: clients.find((c) => c.id === clientId)?.nom ?? null });
      reinitialiser();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    for (const l of lignes) {
      const { error: erreurLigne } = await supabase.from("ventes_lignes").insert({
        vente_id: vente.id,
        article_id: l.article.id,
        quantite: l.quantite,
        prix_unitaire: l.article.prix_vente,
      });
      if (erreurLigne) {
        setEnvoi(false);
        setErreur(erreurLigne.message);
        return;
      }
    }

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
    setResultat({ ...(venteFinale ?? { numero_facture: vente.numero_facture, statut: "impayee" }), horsLigne: false });
    setRecu({ lignes, total, clientNom: clients.find((c) => c.id === clientId)?.nom ?? null });
    reinitialiser();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un article (code ou nom)..."
            className="w-full border border-ink/15 rounded-md pl-9 pr-3 py-2.5 text-sm bg-white
              focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
          {resultats.length > 0 && (
            <div className="absolute z-10 bg-white border border-ink/10 rounded-md mt-1 w-full shadow-lg max-h-64 overflow-y-auto">
              {resultats.map((a) => (
                <button
                  key={a.id}
                  onClick={() => ajouterArticle(a)}
                  className="flex justify-between w-full text-left px-3 py-2 text-xs hover:bg-lime/10 transition-colors"
                >
                  <span>{a.code_article} — {a.nom}</span>
                  <span className="num text-ink/40">{a.quantite_stock} en stock</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-ink/10 rounded-lg overflow-hidden">
          {lignes.length === 0 ? (
            <div className="p-8 text-center text-ink/30 text-xs italic flex flex-col items-center gap-2">
              <ShoppingBag size={22} className="text-ink/15" />
              Le panier est vide — recherchez un article ci-dessus
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-ink/[0.03] text-ink/40 text-left">
                <tr><th className="p-2.5">Article</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.article.id} className="border-t border-ink/5">
                    <td className="p-2.5">{l.article.code_article} — {l.article.nom}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={l.quantite}
                        onChange={(e) => majQuantite(l.article.id, Number(e.target.value))}
                        className="w-14 border border-ink/15 rounded px-1.5 py-0.5 num"
                      />
                    </td>
                    <td className="num">{l.article.prix_vente.toLocaleString("fr-FR")} FCFA</td>
                    <td className="num font-semibold">{(l.quantite * l.article.prix_vente).toLocaleString("fr-FR")} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white border border-ink/10 rounded-lg p-3">
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Client (optionnel — requis si crédit)
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-2 py-1.5 text-xs"
          >
            <option value="">— Aucun —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.nom} — {c.telephone}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-ink/10 rounded-lg p-3 space-y-2">
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 font-semibold">Mode(s) de paiement</label>
          {MODES.map((m) => (
            <div key={m.key} className="flex items-center justify-between text-xs">
              <span>{m.label}</span>
              <input
                type="number"
                min={0}
                value={montants[m.key] || ""}
                onChange={(e) => setMontants((prev) => ({ ...prev, [m.key]: Number(e.target.value) }))}
                className="w-24 border border-ink/15 rounded px-1.5 py-1 text-right num"
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className="bg-ink text-white rounded-lg p-3.5">
          <div className="text-[10px] uppercase tracking-wide text-white/50">Total à payer</div>
          <div className="text-lg font-display font-semibold num text-lime">{total.toLocaleString("fr-FR")} FCFA</div>
        </div>

        {erreur && <p className="text-xs text-signal">{erreur}</p>}

        <Button onClick={validerVente} disabled={envoi} className="w-full">
          {envoi ? "Enregistrement..." : "Valider la vente"}
        </Button>

        {resultat && (
          <div className="space-y-2">
            <div className={`rounded-lg p-3 text-xs ${resultat.horsLigne ? "bg-ember/10 text-ember" : "bg-ok/10 text-ok"}`}>
              Facture <b className="num">{resultat.numero_facture}</b> — {resultat.statut}
              {resultat.horsLigne && (
                <p className="mt-1 text-ember/80">
                  Enregistrée hors-ligne. Le numéro définitif sera attribué à la synchronisation.
                </p>
              )}
            </div>
            {!resultat.horsLigne && recu && (
              <FactureApercu
                numero={resultat.numero_facture}
                statut={resultat.statut}
                clientNom={recu.clientNom}
                lignes={recu.lignes.map((l) => ({ nom: l.article.nom, quantite: l.quantite, prix_unitaire: l.article.prix_vente }))}
                total={recu.total}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
