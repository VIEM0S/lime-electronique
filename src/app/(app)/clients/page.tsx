import { createClient } from "@/lib/supabase/server";
import ClientsClient from "./ClientsClient";
import CreditsTable from "../credits/CreditsTable";
import ClientsCreditsOnglets from "./ClientsCreditsOnglets";
import type { VueCreditClient } from "@/types/database.types";

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: credits }] = await Promise.all([
    supabase.from("clients").select("*").order("solde_du", { ascending: false }),
    supabase.from("vue_credits_clients").select("*").returns<VueCreditClient[]>(),
  ]);

  const enCours = (credits ?? []).filter((c) => c.statut_credit !== "soldee");
  const enRetard = (credits ?? []).filter((c) => c.statut_credit === "en_retard");
  const totalEnCours = enCours.reduce((s, c) => s + Number(c.solde_restant), 0);

  return (
    <ClientsCreditsOnglets
      vueClients={<ClientsClient clients={clients ?? []} />}
      vueCredits={
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink/55">Total en cours</div>
              <div className="text-lg font-display font-semibold num">{totalEnCours.toLocaleString("fr-FR")} FCFA</div>
            </div>
            <div className="bg-white border border-argent/25 rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-wide text-ink/55">Crédits actifs</div>
              <div className="text-lg font-display font-semibold num">{enCours.length}</div>
            </div>
            <div className={`rounded-lg p-4 border ${enRetard.length > 0 ? "bg-signal/5 border-signal/25" : "bg-white border-argent/25"}`}>
              <div className="text-[10px] uppercase tracking-wide text-ink/55">En retard</div>
              <div className={`text-lg font-display font-semibold num ${enRetard.length > 0 ? "text-signal" : ""}`}>{enRetard.length}</div>
            </div>
          </div>
          <div className="bg-white border border-argent/25 rounded-lg overflow-hidden">
            <CreditsTable credits={credits ?? []} />
          </div>
        </div>
      }
    />
  );
}
