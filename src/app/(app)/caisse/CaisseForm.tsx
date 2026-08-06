"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, ShoppingBag } from "lucide-react";
import type { ModePaiement } from "@/types/database.types";
import { estEnLigne, mettreEnFileVente } from "@/lib/offline/queue";
import Button from "@/components/ui/Button";
import FactureApercu from "./FactureApercu";

type ArticleLite = { id: string; code_article: string; nom: string; prix_vente: number; quantite_stock: number };
type ClientLite = { id: string; nom: string; telephone: string | null; quartier: string | null; solde_du: number; limite_credit: number | null };

type Ligne = { article: ArticleLite; quantite: number };

// `navigator.onLine` ment souvent (il dit "en ligne" dès qu'une interface
// réseau existe, même sans accès réel à internet) — donc on ne peut pas
// s'y fier seul. Ce détecteur repère les erreurs réseau réelles (requête
// qui n'a même pas atteint le serveur), pour distinguer "vraiment hors
// ligne, il faut mettre en file d'attente" de "le serveur a refusé pour
// une vraie raison métier (stock insuffisant, etc.), il faut le dire".
function estErreurReseau(err: unknown): boolean {
  // Un échec de fetch (vraie coupure réseau, DNS, etc.) remonte quasiment
  // toujours comme un TypeError, quel que soit le navigateur — c'est un
  // signal bien plus fiable que d'essayer de reconnaître le texte exact du
  // message, qui varie beaucucoup entre Chrome/Safari/Firefox/Android.
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /failed to fetch|networkerror|load failed|network request failed|internet|offline|ERR_NETWORK|ERR_CONNECTION|timeout|timed out/i.test(
    msg
  );
}

function attendre(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const [nomClientComptant, setNomClientComptant] = useState<string>("");
  const [montants, setMontants] = useState<Record<ModePaiement, number>>({
    especes: 0,
    mobile_money: 0,
    virement: 0,
    credit: 0,
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ numero_facture: string; statut: string; horsLigne: boolean } | null>(null);
  const [recu, setRecu] = useState<{
    lignes: Ligne[];
    total: number;
    clientNom: string | null;
    clientTelephone: string | null;
    clientQuartier: string | null;
    paiements: { mode: ModePaiement; montant: number }[];
  } | null>(null);
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
    setClientId("");
    setNomClientComptant("");
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
    if (montants.credit > 0 && clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client?.limite_credit != null) {
        const soldeApres = Number(client.solde_du) + montants.credit;
        if (soldeApres > Number(client.limite_credit)) {
          setErreur(
            `Limite de crédit dépassée pour ${client.nom} : solde actuel ${Number(client.solde_du).toLocaleString("fr-FR")} FCFA, ` +
              `limite ${Number(client.limite_credit).toLocaleString("fr-FR")} FCFA. Cette vente porterait le solde à ` +
              `${soldeApres.toLocaleString("fr-FR")} FCFA (dépassement de ${(soldeApres - Number(client.limite_credit)).toLocaleString("fr-FR")} FCFA).`
          );
          return;
        }
      }
    }

    setEnvoi(true);

    const clientTrouve = clients.find((c) => c.id === clientId);
    const nomAffiche = clientTrouve?.nom ?? (nomClientComptant.trim() || null);
    const telephoneAffiche = clientTrouve?.telephone ?? null;
    const quartierAffiche = clientTrouve?.quartier ?? null;

    const paiementsAEnvoyer = MODES.filter((m) => montants[m.key] > 0).map((m) => ({
      mode: m.key,
      montant: montants[m.key],
    }));

    async function basculerHorsLigne() {
      const action = await mettreEnFileVente({
        client_id: clientId || null,
        nom_client_comptant: clientId ? null : nomClientComptant.trim() || null,
        lignes: lignes.map((l) => ({
          article_id: l.article.id,
          quantite: l.quantite,
          prix_unitaire: l.article.prix_vente,
        })),
        paiements: paiementsAEnvoyer,
      });
      setEnvoi(false);
      setResultat({ numero_facture: action.numeroProvisoire, statut: "en attente de synchronisation", horsLigne: true });
      setRecu({
        lignes,
        total,
        clientNom: nomAffiche,
        clientTelephone: telephoneAffiche,
        clientQuartier: quartierAffiche,
        paiements: paiementsAEnvoyer,
      });
      reinitialiser();
    }

    // Mode hors-ligne (FR-25/SSD UC-08) : on ne tente même pas le réseau,
    // on met directement en file d'attente locale.
    if (!estEnLigne()) {
      await basculerHorsLigne();
      return;
    }

    let venteId: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: vente, error: erreurVente } = await supabase
        .from("ventes")
        .insert({
          client_id: clientId || null,
          nom_client_comptant: clientId ? null : nomClientComptant.trim() || null,
          utilisateur_id: user?.id ?? null,
        })
        .select()
        .single();

      if (erreurVente || !vente) {
        // Rien n'a encore été créé : si c'est une vraie panne réseau (et pas
        // un refus métier du serveur), on peut basculer sans rien perdre.
        if (erreurVente && estErreurReseau(erreurVente)) {
          await basculerHorsLigne();
          return;
        }
        setEnvoi(false);
        setErreur(erreurVente?.message ?? "Erreur lors de la création de la vente.");
        return;
      }
      venteId = vente.id;

      for (const l of lignes) {
        const { error: erreurLigne } = await inserer(() =>
          supabase.from("ventes_lignes").insert({
            vente_id: venteId,
            article_id: l.article.id,
            quantite: l.quantite,
            prix_unitaire: l.article.prix_vente,
          })
        );
        if (erreurLigne) throw new Error(erreurLigne.message, { cause: erreurLigne });
      }

      for (const p of paiementsAEnvoyer) {
        const { error: erreurPaiement } = await inserer(() =>
          supabase.from("paiements").insert({ vente_id: venteId, mode: p.mode, montant: p.montant })
        );
        if (erreurPaiement) throw new Error(erreurPaiement.message, { cause: erreurPaiement });
      }

      const { data: venteFinale } = await supabase
        .from("ventes")
        .select("numero_facture, statut")
        .eq("id", venteId)
        .single();

      setEnvoi(false);
      setResultat({ ...(venteFinale ?? { numero_facture: vente.numero_facture, statut: "impayee" }), horsLigne: false });
      setRecu({ lignes, total, clientNom: nomAffiche, clientTelephone: telephoneAffiche, clientQuartier: quartierAffiche, paiements: paiementsAEnvoyer });
      reinitialiser();
    } catch (err) {
      setEnvoi(false);
      if (venteId && estErreurReseau(err)) {
        // La vente existe déjà côté serveur (son numéro de facture est réel) —
        // on ne la remet PAS en file d'attente hors-ligne pour éviter de la
        // dupliquer à la prochaine synchronisation. On informe clairement.
        setErreur(
          `Panne réseau après création partielle de la vente (déjà enregistrée côté serveur). ` +
            `Vérifie "Ventes récentes" avant de ressaisir — ne recommence pas à zéro sans vérifier.`
        );
      } else if (venteId) {
        // Refus métier (ex: limite de crédit dépassée), pas une panne réseau.
        // Des lignes ont pu être insérées avant l'échec (stock déjà
        // décrémenté) — on annule proprement plutôt que de supprimer à cru,
        // pour que le stock (et un éventuel crédit déjà enregistré) soit
        // correctement restauré par fn_annuler_vente().
        const {
          data: { user: utilisateurCourant },
        } = await supabase.auth.getUser();
        await supabase
          .from("ventes")
          .update({ statut: "annulee", motif_annulation: "Refusée automatiquement (échec de validation)", annule_par: utilisateurCourant?.id ?? null })
          .eq("id", venteId);
        setErreur(err instanceof Error ? err.message : "Vente refusée.");
      } else if (estErreurReseau(err)) {
        await basculerHorsLigne();
      } else {
        setErreur(err instanceof Error ? err.message : "Erreur inattendue lors de la vente.");
      }
    }

    // Retente une insertion 2 fois de plus avant d'abandonner (une coupure
    // réseau très brève ne doit pas faire échouer toute la vente).
    async function inserer<T>(fn: () => PromiseLike<T>): Promise<T> {
      let derniereErreur: any;
      for (let tentative = 0; tentative < 3; tentative++) {
        try {
          const res = await fn();
          return res;
        } catch (e) {
          derniereErreur = e;
          if (!estErreurReseau(e)) throw e;
          await attendre(600);
        }
      }
      throw derniereErreur;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un article (code ou nom)..."
            className="w-full border border-ink/15 rounded-md pl-9 pr-3 py-2.5 text-sm bg-white
              focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
          {resultats.length > 0 && (
            <div className="absolute z-10 bg-white border border-argent/25 rounded-md mt-1 w-full shadow-lg max-h-64 overflow-y-auto">
              {resultats.map((a) => (
                <button
                  key={a.id}
                  onClick={() => ajouterArticle(a)}
                  className="flex justify-between w-full text-left px-3 py-2 text-xs hover:bg-lime/10 transition-colors"
                >
                  <span>{a.code_article} — {a.nom}</span>
                  <span className="num text-ink/55">{a.quantite_stock} en stock</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] overflow-hidden">
          {lignes.length === 0 ? (
            <div className="p-8 text-center text-ink/45 text-xs italic flex flex-col items-center gap-2">
              <ShoppingBag size={22} className="text-ink/15" />
              Le panier est vide — recherchez un article ci-dessus
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full text-xs">
                <thead className="bg-argent/10 text-ink/55 text-left">
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
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-3">
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
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

          {!clientId && montants.credit === 0 && (
            <div className="mt-2">
              <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
                Nom du client (optionnel, juste pour la facture)
              </label>
              <input
                value={nomClientComptant}
                onChange={(e) => setNomClientComptant(e.target.value)}
                placeholder="Ex : Aminata Koné"
                className="w-full border border-ink/15 rounded-md px-2 py-1.5 text-xs"
              />
              <p className="text-[10px] text-ink/45 mt-1">
                Juste pour la facture — ne crée pas de fiche client, pas de suivi de créance.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-3 space-y-2">
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 font-semibold">Mode(s) de paiement</label>
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
          <div className="text-[10px] uppercase tracking-wide text-white/64">Total à payer</div>
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
                clientTelephone={recu.clientTelephone}
                clientQuartier={recu.clientQuartier}
                lignes={recu.lignes.map((l) => ({ nom: l.article.nom, quantite: l.quantite, prix_unitaire: l.article.prix_vente }))}
                total={recu.total}
                paiements={recu.paiements}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
