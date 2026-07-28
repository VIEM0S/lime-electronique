// Aide de performance : la vérification auth + profil se faisait une fois
// dans le layout ET une seconde fois dans plusieurs pages (caisse,
// session-caisse...), doublant inutilement les allers-retours réseau vers
// Supabase à chaque changement de page. `cache()` de React mémorise le
// résultat pour la durée d'UNE SEULE requête serveur : le layout et la page
// qui se rendent ensemble partagent le même résultat, sans requête en trop.
import { cache } from "react";
import { createClient } from "./server";
import type { Profil } from "@/types/database.types";

export const getProfilCourant = cache(async (): Promise<Profil | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profil } = await supabase
    .from("profils")
    .select("*")
    .eq("id", user.id)
    .single<Profil>();

  return profil ?? null;
});
