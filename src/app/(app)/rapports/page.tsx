import { createClient } from "@/lib/supabase/server";
import { EvolutionCA, ActiviteSemaine, RepartitionModes } from "./ChartsAnalytics";

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Août", "Sep", "Oct", "Nov", "Déc"];

export default async function RapportsPage() {
  const supabase = await createClient();

  const debut6Mois = new Date();
  debut6Mois.setMonth(debut6Mois.getMonth() - 5);
  debut6Mois.setDate(1);
  debut6Mois.setHours(0, 0, 0, 0);

  const [{ data: ventes }, { data: paiements }, { data: clients }] = await Promise.all([
    supabase
      .from("ventes")
      .select("id, date, montant_total, statut, client_id")
      .neq("statut", "annulee")
      .gte("date", debut6Mois.toISOString()),
    supabase
      .from("paiements")
      .select("mode, montant, date")
      .gte("date", debut6Mois.toISOString()),
    supabase.from("clients").select("id"),
  ]);

  const toutesLesVentes = ventes ?? [];
  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const caTotal = toutesLesVentes.reduce((s, v) => s + Number(v.montant_total), 0);
  const caCeMois = toutesLesVentes.filter((v) => new Date(v.date) >= debutMois).reduce((s, v) => s + Number(v.montant_total), 0);
  const ticketMoyen = toutesLesVentes.length > 0 ? caTotal / toutesLesVentes.length : 0;
  const clientsActifs = new Set(toutesLesVentes.map((v) => v.client_id).filter(Boolean)).size;

  // Évolution CA par mois (6 derniers mois)
  const parMois: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
    parMois[`${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`] = 0;
  }
  toutesLesVentes.forEach((v) => {
    const d = new Date(v.date);
    const cle = `${MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    if (cle in parMois) parMois[cle] += Number(v.montant_total);
  });
  const evolutionCA = Object.entries(parMois).map(([mois, ca]) => ({ mois, ca }));

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
  toutesLesVentes
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

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-accent">Rapports &amp; Analytics</h1>
      <p className="text-xs text-gray-400 italic">FR-29 et au-delà — vue d&apos;ensemble des performances</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">CA total (6 mois)</div>
          <div className="text-lg font-semibold">{caTotal.toLocaleString("fr-FR")} FCFA</div>
          <div className="text-xs text-gray-400">{toutesLesVentes.length} vente(s)</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">CA ce mois</div>
          <div className="text-lg font-semibold">{caCeMois.toLocaleString("fr-FR")} FCFA</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Ticket moyen</div>
          <div className="text-lg font-semibold">{Math.round(ticketMoyen).toLocaleString("fr-FR")} FCFA</div>
          <div className="text-xs text-gray-400">par vente</div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Clients actifs</div>
          <div className="text-lg font-semibold">{clientsActifs}</div>
          <div className="text-xs text-gray-400">sur {clients?.length ?? 0} au total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold mb-2">Chiffre d&apos;affaires — 6 derniers mois</h2>
          <EvolutionCA data={evolutionCA} />
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <h2 className="text-sm font-semibold mb-2">Modes de paiement</h2>
          <RepartitionModes data={repartitionModes} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded p-4">
        <h2 className="text-sm font-semibold mb-2">Activité cette semaine</h2>
        <ActiviteSemaine data={activiteSemaine} />
      </div>
    </div>
  );
}
