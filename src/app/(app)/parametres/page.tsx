import { createClient } from "@/lib/supabase/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import UtilisateursClient from "../utilisateurs/UtilisateursClient";

export default async function ParametresPage() {
  const supabase = await createClient();

  // Les emails vivent dans auth.users, pas dans profils — il faut la clé
  // service_role pour les lister (cf. src/app/api/utilisateurs/route.ts).
  // Si la variable n'est pas encore configurée, on affiche simplement "—"
  // au lieu de planter la page.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = serviceKey
    ? createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  const [{ data: utilisateurs }, listUsersResult] = await Promise.all([
    supabase.from("profils").select("*").order("created_at"),
    admin ? admin.auth.admin.listUsers() : Promise.resolve(null),
  ]);

  const emailsParId: Record<string, string> = listUsersResult
    ? Object.fromEntries((listUsersResult.data?.users ?? []).map((u) => [u.id, u.email ?? ""]))
    : {};

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-display font-semibold text-ink">Paramètres</h1>
      <UtilisateursClient utilisateurs={utilisateurs ?? []} emailsParId={emailsParId} />
    </div>
  );
}
