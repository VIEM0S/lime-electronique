import { createClient } from "@/lib/supabase/server";
import { getProfilCourant } from "@/lib/supabase/current-user";
import { redirect } from "next/navigation";
import { Wallet, AlertTriangle, PackageX, AlertOctagon, type LucideIcon } from "lucide-react";
import VentesChart from "./VentesChart";
import NotificationsPush from "@/components/NotificationsPush";

const SEUIL_STOCK_FAIBLE = 5; // FR-28

export default async function DashboardPage() {
  const supabase = await createClient();
  const profilCourant = await getProfilCourant();

  // Le tableau de bord est réservé au propriétaire (cf. Nav) — on l'applique
  // aussi côté serveur pour empêcher un accès direct par URL (FR-23).
  if (profilCourant?.role === "caisse") {
    redirect("/caisse");
  }

  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);

  const sept_jours = new Date();
  sept_jours.setDate(sept_jours.getDate() - 6);
  sept_jours.setHours(0, 0, 0, 0);

  const [{ data: ventesJour }, { data: creances }, { data: stockFaible }, { data: ventesEnConflit }, { data: ventes7j }, { data: paiementsJour }] =
    await Promise.all([
      supabase.from("ventes").select("montant_total").gte("date", debutJournee.toISOString()),
      supabase.from("vue_creances_clients").select("*"),
      supabase
        .from("articles")
        .select("code_article, nom, quantite_stock")
        .lt("quantite_stock", SEUIL_STOCK_FAIBLE)
        .eq("actif", true),
      supabase
        .from("ventes")
        .select("numero_facture, date, montant_total")
        .eq("conflit_sync", true),
      supabase
        .from("ventes")
        .select("date, montant_total")
        .gte("date", sept_jours.toISOString())
        .neq("statut", "annulee"),
      // Encaissements réels du jour par mode (exclut 'credit', qui n'est pas
      // de l'argent en caisse) — répond à "combien j'ai encaissé et par quel mode".
      supabase.from("paiements").select("mode, montant").gte("date", debutJournee.toISOString()),
    ]);

  const totalVentesJour = (ventesJour ?? []).reduce((s, v) => s + Number(v.montant_total), 0);
  const totalCreances = (creances ?? []).reduce((s, c: any) => s + Number(c.solde_du), 0);

  const LABEL_MODE: Record<string, string> = {
    especes: "Espèces",
    mobile_money: "Mobile Money",
    virement: "Virement",
    credit: "Crédit (non encaissé)",
  };
  const parMode: Record<string, number> = {};
  (paiementsJour ?? []).forEach((p) => {
    parMode[p.mode] = (parMode[p.mode] ?? 0) + Number(p.montant);
  });
  const totalEncaisseReel = Object.entries(parMode)
    .filter(([mode]) => mode !== "credit")
    .reduce((s, [, m]) => s + m, 0);

  // FR-29 : agrégation par jour (libellé court fr-FR) pour les 7 derniers jours
  const jours: { jour: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const cle = d.toLocaleDateString("fr-FR", { weekday: "short" });
    const totalJour = (ventes7j ?? [])
      .filter((v) => new Date(v.date).toDateString() === d.toDateString())
      .reduce((s, v) => s + Number(v.montant_total), 0);
    jours.push({ jour: cle, total: totalJour });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-display font-semibold text-ink">Tableau de bord</h1>

      <NotificationsPush />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi
          icon={Wallet}
          label="Ventes du jour"
          value={`${totalVentesJour.toLocaleString("fr-FR")} FCFA`}
          sub={`${ventesJour?.length ?? 0} vente(s)`}
          tone="lime"
        />
        <Kpi
          icon={AlertTriangle}
          label="Créances en cours"
          value={`${totalCreances.toLocaleString("fr-FR")} FCFA`}
          sub={`${creances?.length ?? 0} client(s)`}
          tone={totalCreances > 0 ? "ember" : "neutral"}
        />
        <Kpi
          icon={PackageX}
          label="Articles en stock faible"
          value={`${stockFaible?.length ?? 0}`}
          sub={`< ${SEUIL_STOCK_FAIBLE} unités`}
          tone={stockFaible && stockFaible.length > 0 ? "ember" : "neutral"}
        />
      </div>

      {Object.keys(parMode).length > 0 && (
        <div className="bg-white border border-ink/10 rounded-lg p-4">
          <h2 className="text-sm font-display font-semibold mb-1">Encaissé aujourd&apos;hui</h2>
          <p className="text-xs text-ink/40 italic mb-2">Par mode de paiement — le crédit n&apos;est pas de l&apos;argent en caisse</p>
          <div className="text-lg font-display font-semibold num mb-2">
            {totalEncaisseReel.toLocaleString("fr-FR")} FCFA <span className="text-xs font-normal text-ink/40">réellement en caisse</span>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {Object.entries(parMode).map(([mode, montant]) => (
                <tr key={mode} className="border-t border-ink/5">
                  <td className={`py-1 ${mode === "credit" ? "text-ink/40 italic" : ""}`}>{LABEL_MODE[mode] ?? mode}</td>
                  <td className={`py-1 text-right num ${mode === "credit" ? "text-ink/40 italic" : "font-semibold"}`}>
                    {montant.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VentesChart data={jours} />

      {ventesEnConflit && ventesEnConflit.length > 0 && (
        <div className="bg-signal/5 border border-signal/20 rounded-lg p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-display font-semibold mb-2 text-signal">
            <AlertOctagon size={15} />
            {ventesEnConflit.length} vente(s) en conflit de synchronisation (BR-08)
          </h2>
          <p className="text-xs text-signal/80 mb-2">
            Stock devenu insuffisant entre l&apos;enregistrement hors-ligne et la synchronisation —
            arbitrage manuel requis (cf. Caisse → Ventes récentes).
          </p>
          <table className="w-full text-xs">
            <thead className="text-signal/60 text-left">
              <tr><th className="py-1">Facture</th><th>Date</th><th>Montant</th></tr>
            </thead>
            <tbody>
              {ventesEnConflit.map((v) => (
                <tr key={v.numero_facture} className="border-t border-signal/10">
                  <td className="py-1">{v.numero_facture}</td>
                  <td>{new Date(v.date).toLocaleString("fr-FR")}</td>
                  <td className="num">{Number(v.montant_total).toLocaleString("fr-FR")} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stockFaible && stockFaible.length > 0 && (
        <div className="bg-white border border-ink/10 rounded-lg p-4">
          <h2 className="text-sm font-display font-semibold mb-2">Articles en stock faible</h2>
          <table className="w-full text-xs">
            <thead className="text-ink/40 text-left">
              <tr><th className="py-1">Code</th><th>Nom</th><th>Stock</th></tr>
            </thead>
            <tbody>
              {stockFaible.map((a) => (
                <tr key={a.code_article} className="border-t border-ink/5">
                  <td className="py-1">{a.code_article}</td>
                  <td>{a.nom}</td>
                  <td className="num text-ember font-semibold">{a.quantite_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: "lime" | "ember" | "neutral";
}) {
  const toneClasses = {
    lime: "bg-lime/15 text-lime-deep",
    ember: "bg-ember/15 text-ember",
    neutral: "bg-ink/5 text-ink/40",
  }[tone];

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2.5 ${toneClasses}`}>
        <Icon size={16} />
      </div>
      <div className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold">{label}</div>
      <div className="text-lg font-display font-semibold num">{value}</div>
      <div className="text-xs text-ink/40">{sub}</div>
    </div>
  );
}
