import { createClient } from "@/lib/supabase/server";
import { getProfilCourant } from "@/lib/supabase/current-user";
import SessionCaisseForm from "./SessionCaisseForm";

export default async function SessionCaissePage() {
  const supabase = await createClient();
  const profil = await getProfilCourant();

  const [{ data: sessionOuverte }, { data: historique }, { data: ecartsNegatifs }] = await Promise.all([
    supabase
      .from("sessions_caisse")
      .select("*")
      .eq("utilisateur_id", profil?.id)
      .eq("statut", "ouverte")
      .maybeSingle(),
    supabase
      .from("sessions_caisse")
      .select("*")
      .eq("statut", "fermee")
      .order("date_fermeture", { ascending: false })
      .limit(10),
    // Alerte propriétaire : sessions fermées récemment avec un écart négatif
    // (manque en caisse). Le propriétaire voit tout (RLS "gere_sessions_caisse").
    supabase
      .from("sessions_caisse")
      .select("*")
      .eq("statut", "fermee")
      .lt("ecart", 0)
      .order("date_fermeture", { ascending: false })
      .limit(5),
  ]);

  // Répartition par mode de paiement des ventes de CETTE session (donc de
  // CET utilisateur), pour servir de justificatif si l'écart de caisse à la
  // fermeture est négatif. Dépend du résultat ci-dessus (date d'ouverture),
  // ne peut donc pas être parallélisée avec le bloc précédent.
  let repartitionParMode: { mode: string; montant: number }[] = [];
  if (sessionOuverte) {
    const { data: paiementsSession } = await supabase
      .from("paiements")
      .select("mode, montant, ventes!inner(utilisateur_id)")
      .eq("ventes.utilisateur_id", sessionOuverte.utilisateur_id)
      .gte("date", sessionOuverte.date_ouverture);

    const parMode: Record<string, number> = {};
    (paiementsSession ?? []).forEach((p: any) => {
      parMode[p.mode] = (parMode[p.mode] ?? 0) + Number(p.montant);
    });
    repartitionParMode = Object.entries(parMode).map(([mode, montant]) => ({ mode, montant }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-display font-semibold text-ink">Session de caisse</h1>
      <p className="text-xs text-ink/40 italic">
        FR-31/FR-32 — ouverture avec fonds initial déclaré, fermeture avec calcul automatique de l&apos;écart
      </p>
      <SessionCaisseForm sessionOuverte={sessionOuverte ?? null} repartitionParMode={repartitionParMode} />

      {ecartsNegatifs && ecartsNegatifs.length > 0 && (
        <div className="bg-signal/5 border border-signal/20 rounded-lg p-4">
          <h2 className="text-sm font-display font-semibold mb-2 text-signal">
            ⚠ Écart(s) de caisse négatif(s) récent(s) — manque en caisse
          </h2>
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            <table className="w-full text-xs">
              <thead className="text-signal/60 text-left">
                <tr><th className="py-1">Fermeture</th><th>Théorique</th><th>Compté</th><th>Écart</th></tr>
              </thead>
              <tbody>
                {ecartsNegatifs.map((s) => (
                  <tr key={s.id} className="border-t border-signal/10">
                    <td className="py-1">{s.date_fermeture ? new Date(s.date_fermeture).toLocaleString("fr-FR") : "—"}</td>
                    <td>{Number(s.montant_theorique).toLocaleString("fr-FR")} FCFA</td>
                    <td>{Number(s.montant_fermeture_declare).toLocaleString("fr-FR")} FCFA</td>
                    <td className="text-signal font-semibold">{Number(s.ecart).toLocaleString("fr-FR")} FCFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white border border-ink/10 rounded-lg p-4">
        <h2 className="text-sm font-display font-semibold mb-2">Historique des écarts</h2>
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <table className="w-full text-xs">
            <thead className="text-ink/40 text-left">
              <tr><th className="py-1">Ouverture</th><th>Fermeture</th><th>Fonds initial</th><th>Théorique</th><th>Compté</th><th>Écart</th></tr>
            </thead>
            <tbody>
              {(historique ?? []).map((s) => (
                <tr key={s.id} className="border-t border-ink/5">
                  <td className="py-1">{new Date(s.date_ouverture).toLocaleString("fr-FR")}</td>
                  <td>{s.date_fermeture ? new Date(s.date_fermeture).toLocaleString("fr-FR") : "—"}</td>
                  <td>{Number(s.montant_ouverture).toLocaleString("fr-FR")} FCFA</td>
                  <td>{s.montant_theorique !== null ? Number(s.montant_theorique).toLocaleString("fr-FR") + " FCFA" : "—"}</td>
                  <td>{s.montant_fermeture_declare !== null ? Number(s.montant_fermeture_declare).toLocaleString("fr-FR") + " FCFA" : "—"}</td>
                  <td className={Number(s.ecart) !== 0 ? "text-ember font-semibold" : "text-ok"}>
                    {s.ecart !== null ? `${Number(s.ecart) > 0 ? "+" : ""}${Number(s.ecart).toLocaleString("fr-FR")} FCFA` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
