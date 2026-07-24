import { createClient } from "@/lib/supabase/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import UtilisateursClient from "./UtilisateursClient";

export default async function UtilisateursPage() {
  const supabase = await createClient();

  const { data: utilisateurs } = await supabase
    .from("profils")
    .select("*")
    .order("created_at");

  // Les emails vivent dans auth.users, pas dans profils — il faut la clé
  // service_role pour les lister (cf. src/app/api/utilisateurs/route.ts).
  // Si la variable n'est pas encore configurée, on affiche simplement "—"
  // au lieu de planter la page.
  let emailsParId: Record<string, string> = {};
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await admin.auth.admin.listUsers();
    emailsParId = Object.fromEntries((data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  }

  return <UtilisateursClient utilisateurs={utilisateurs ?? []} emailsParId={emailsParId} />;
}
