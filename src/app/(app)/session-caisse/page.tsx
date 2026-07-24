import { createClient } from "@/lib/supabase/server";
import SessionCaisseForm from "./SessionCaisseForm";

export default async function SessionCaissePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessionOuverte } = await supabase
    .from("sessions_caisse")
    .select("*")
    .eq("utilisateur_id", user?.id)
    .eq("statut", "ouverte")
    .maybeSingle();

  const { data: historique } = await supabase
    .from("sessions_caisse")
    .select("*")
    .eq("statut", "fermee")
    .order("date_fermeture", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-display font-semibold text-ink">Session de caisse</h1>
      <p className="text-xs text-ink/40 italic">
        FR-31/FR-32 — ouverture avec fonds initial déclaré, fermeture avec calcul automatique de l&apos;écart
      </p>
      <SessionCaisseForm sessionOuverte={sessionOuverte ?? null} />

      <div className="bg-white border border-ink/10 rounded-lg p-4">
        <h2 className="text-sm font-display font-semibold mb-2">Historique des écarts</h2>
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
  );
}
