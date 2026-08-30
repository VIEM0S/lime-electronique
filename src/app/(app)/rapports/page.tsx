import { createClient } from "@/lib/supabase/server";
import { EvolutionCA, ActiviteSemaine, RepartitionModes, TopProduitsChart } from "./ChartsAnalytics";
import RapportsOnglets from "./RapportsOnglets";

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Août", "Sep", "Oct", "Nov", "Déc"];

export default async function RapportsPage() {
  const supabase = await createClient();

  const maintenant = new Date();

  const debut6Mois = new Date();
  debut6Mois.setMonth(debut6Mois.getMonth() - 5);
  debut6Mois.setDate(1);
  debut6Mois.setHours(0, 0, 0, 0);

  const debut12Mois = new Date();
  debut12Mois.setMonth(debut12Mois.getMonth() - 11);
  debut12Mois.setDate(1);
  debut12Mois.setHours(0, 0, 0, 0);

  const [{ data: ventes12Mois }, { data: paiements }, { data: clients }, { data: articlesStock }, { data: lignesVendues }] = await Promise.all([
    supabase
      .from("ventes")
      .select("id, date, montant_total, statut, client_id")
      .neq("statut", "annulee")
      .gte("date", debut12Mois.toISOString()),
    supabase
      .from("paiements")
      .select("mode, montant, date, ventes!inner(statut)")
      .gte("date", debut6Mois.toISOString())
      .neq("ventes.statut", "annulee"),
    supabase.from("clients").select("id"),
    // Valeur du stock actuel (au prix de vente) — demande explicite du
    // client : "chiffre d'affaires" dans sa bouche désigne en fait la
    // valeur de la totalité des articles qu'il a en stock aujourd'hui, pas
    // l'argent des ventes passées (déjà couvert par le CA ci-dessus). Prix
    // de vente choisi plutôt que prix d'achat : ce dernier est un champ
    // optionnel, souvent absent, alors que le prix de vente est toujours
    // renseigné.
    supabase.from("articles").select("quantite_stock, prix_vente").eq("actif", true),
    // Top produits (BR/FR n.a. — nouveau rapport, inspiré d'un autre projet) :
    // priorité au chiffre d'affaires généré, pas juste au nombre d'unités —
    // un article vendu en grande quantité mais bon marché n'est pas
    // forcément celui qui rapporte le plus.
    supabase
      .from("ventes_lignes")
      .select("article_id, quantite, prix_unitaire, articles(code_article, nom), ventes!inner(date, statut)")
      .gte("ventes.date", debut6Mois.toISOString())
      .neq("ventes.statut", "annulee"),
  ]);

  const toutesLesVentes12Mois = ventes12Mois ?? [];
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const toutesLesVentes6Mois = toutesLesVentes12Mois.filter((v) => new Date(v.date) >= debut6Mois);

  const caTotal = toutesLesVentes6Mois.reduce((s, v) => s + Number(v.montant_total), 0);
  const caCeMois = toutesLesVentes6Mois.filter((v) => new Date(v.date) >= debutMois).reduce((s, v) => s + Number(v.montant_total), 0);
  const ticketMoyen = toutesLesVentes6Mois.length > 0 ? caTotal / toutesLesVentes6Mois.length : 0;
  const clientsActifs = new Set(toutesLesVentes6Mois.map((v) => v.client_id).filter(Boolean)).size;

  // Évolution CA par mois (6 mois, pour l'onglet Vue d'ensemble)
  const parMois6: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    parMois6[`${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`] = 0;
  }
  toutesLesVentes6Mois.forEach((v) => {
    const d = new Date(v.date);
    const cle = `${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    if (cle in parMois6) parMois6[cle] += Number(v.montant_total);
  });
  const evolutionCA6Mois = Object.entries(parMois6).map(([mois, ca]) => ({ mois, ca }));

  // Évolution CA par mois (12 mois, pour l'onglet Par mois)
  const parMois12: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    parMois12[`${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`] = 0;
  }
  toutesLesVentes12Mois.forEach((v) => {
    const d = new Date(v.date);
    const cle = `${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    if (cle in parMois12) parMois12[cle] += Number(v.montant_total);
  });
  const evolutionCA12Mois = Object.entries(parMois12).map(([mois, ca]) => ({ mois, ca }));

  // Activité 7 derniers jours
  const parJour: Record<string, number> = {};
  const debut7Jours = new Date();
  debut7Jours.setDate(debut7Jours.getDate() - 6);
  debut7Jours.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(debut7Jours);
    d.setDate(d.getDate() + i);
    parJour[`${JOURS[d.getDay()]} ${d.getDate()}`] = 0;
  }
  toutesLesVentes12Mois
    .filter((v) => new Date(v.date) >= debut7Jours)
    .forEach((v) => {
      const d = new Date(v.date);
      const cle = `${JOURS[d.getDay()]} ${d.getDate()}`;
      if (cle in parJour) parJour[cle] += Number(v.montant_total);
    });
  const activiteSemaine = Object.entries(parJour).map(([jour, ca]) => ({ jour, ca }));

  // Répartition par mode de paiement
  const parMode: Record<string, number> = {};
  (paiements ?? []).forEach((p) => {
    parMode[p.mode] = (parMode[p.mode] ?? 0) + Number(p.montant);
  });
  const repartitionModes = Object.entries(parMode).map(([mode, montant]) => ({ mode, montant }));

  // Top produits — classé par chiffre d'affaires (pas juste par unités).
  type LigneJointe = {
    article_id: string;
    quantite: number;
    prix_unitaire: number;
    articles: { code_article: string; nom: string } | null;
  };
  const parArticle: Record<string, { code: string; nom: string; unites: number; ca: number }> = {};
  ((lignesVendues ?? []) as unknown as LigneJointe[]).forEach((l) => {
    const cle = l.article_id;
    if (!parArticle[cle]) {
      parArticle[cle] = {
        code: l.articles?.code_article ?? "?",
        nom: l.articles?.nom ?? "Article supprimé",
        unites: 0,
        ca: 0,
      };
    }
    parArticle[cle].unites += l.quantite;
    parArticle[cle].ca += l.quantite * Number(l.prix_unitaire);
  });
  const topProduits = Object.values(parArticle).sort((a, b) => b.ca - a.ca);
  const top7 = topProduits.slice(0, 7).map((p) => ({ nom: p.nom, ca: p.ca }));
  const maxCaTop = topProduits[0]?.ca ?? 0;

  const valeurStock = (articlesStock ?? []).reduce((s, a) => s + a.quantite_stock * Number(a.prix_vente), 0);
  const nbUnitesEnStock = (articlesStock ?? []).reduce((s, a) => s + a.quantite_stock, 0);

  const kpisEnsemble = [
    { label: "Valeur du stock actuel (prix de vente)", valeur: valeurStock },
    { label: "CA total (6 mois)", valeur: caTotal },
    { label: "Nombre de ventes (6 mois)", valeur: toutesLesVentes6Mois.length },
    { label: "CA ce mois", valeur: caCeMois },
    { label: "Ticket moyen", valeur: Math.round(ticketMoyen) },
    { label: "Clients actifs (6 mois)", valeur: clientsActifs },
    { label: "Clients au total", valeur: clients?.length ?? 0 },
  ];

  return (
    <RapportsOnglets
      kpisEnsemble={kpisEnsemble}
      topProduits={topProduits}
      evolutionCA12Mois={evolutionCA12Mois}
      vueEnsemble={
        <div className="space-y-6">
          <div className="bg-lime rounded-lg p-5 shadow-elevated text-white">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-white/70">
              Valeur du stock actuel (au prix de vente)
            </div>
            <div className="text-3xl font-display font-bold num mt-1">
              {valeurStock.toLocaleString("fr-FR")} <span className="text-lg font-normal text-white/70">FCFA</span>
            </div>
            <div className="text-xs text-white/60 mt-0.5">
              {nbUnitesEnStock.toLocaleString("fr-FR")} unité(s) sur {articlesStock?.length ?? 0} article(s) actif(s)
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink/55">CA total (6 mois)</div>
              <div className="text-lg font-display font-semibold num">{caTotal.toLocaleString("fr-FR")} FCFA</div>
              <div className="text-xs text-ink/55">{toutesLesVentes6Mois.length} vente(s)</div>
            </div>
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink/55">CA ce mois</div>
              <div className="text-lg font-display font-semibold num">{caCeMois.toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink/55">Ticket moyen</div>
              <div className="text-lg font-display font-semibold num">{Math.round(ticketMoyen).toLocaleString("fr-FR")} FCFA</div>
              <div className="text-xs text-ink/55">par vente</div>
            </div>
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink/55">Clients actifs</div>
              <div className="text-lg font-display font-semibold num">{clientsActifs}</div>
              <div className="text-xs text-ink/55">sur {clients?.length ?? 0} au total</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <h2 className="text-sm font-display font-semibold mb-2">Chiffre d&apos;affaires — 6 derniers mois</h2>
              <EvolutionCA data={evolutionCA6Mois} />
            </div>
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <h2 className="text-sm font-display font-semibold mb-2">Modes de paiement</h2>
              <RepartitionModes data={repartitionModes} />
            </div>
          </div>

          <div className="bg-white border border-argent/25 rounded-lg p-4">
            <h2 className="text-sm font-display font-semibold mb-2">Activité cette semaine</h2>
            <ActiviteSemaine data={activiteSemaine} />
          </div>
        </div>
      }
      vueTopProduits={
        <div className="space-y-4">
          <div className="bg-white border border-argent/25 rounded-lg p-4">
            <h2 className="text-sm font-display font-semibold mb-2">
              Chiffre d&apos;affaires — top {Math.min(7, top7.length)} produits (6 derniers mois)
            </h2>
            <TopProduitsChart data={top7} />
          </div>

          <div className="bg-white border border-argent/25 rounded-lg overflow-hidden">
            <div className="p-4 pb-2">
              <h2 className="text-sm font-display font-semibold">Classement complet</h2>
            </div>
            {topProduits.length === 0 ? (
              <p className="text-xs text-ink/55 text-center py-10">Aucune vente enregistrée sur la période</p>
            ) : (
              <div className="divide-y divide-ink/5">
                {topProduits.map((p, i) => (
                  <div key={p.code + i} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex-1 min-w-0 truncate">
                        <span className="text-ink/40 font-mono mr-1.5">{i + 1}.</span>
                        <span className="font-semibold">{p.nom}</span>
                        <span className="text-ink/45"> — {p.code}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="num font-semibold text-lime-deep">{p.ca.toLocaleString("fr-FR")} FCFA</span>
                        <span className="text-ink/45 num"> · {p.unites} unité(s)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-argent/15 overflow-hidden">
                      <div
                        className="h-full bg-lime rounded-full"
                        style={{ width: `${maxCaTop > 0 ? Math.max(4, (p.ca / maxCaTop) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      }
      vueParMois={
        <div className="space-y-4">
          <div className="bg-white border border-argent/25 rounded-lg p-4">
            <h2 className="text-sm font-display font-semibold mb-2">Chiffre d&apos;affaires — 12 derniers mois</h2>
            <EvolutionCA data={evolutionCA12Mois} />
          </div>

          <div className="bg-white border border-argent/25 rounded-lg overflow-hidden">
            <div className="p-4 pb-2">
              <h2 className="text-sm font-display font-semibold">Détail par mois</h2>
            </div>
            <div className="divide-y divide-ink/5">
              {[...evolutionCA12Mois].reverse().map((m) => {
                const maxMois = Math.max(...evolutionCA12Mois.map((x) => x.ca), 1);
                return (
                  <div key={m.mois} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold">{m.mois}</span>
                      <span className="num font-semibold text-lime-deep">{m.ca.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-argent/15 overflow-hidden">
                      <div className="h-full bg-lime rounded-full" style={{ width: `${Math.max(2, (m.ca / maxMois) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      }
    />
  );
}
