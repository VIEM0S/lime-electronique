// Aide de performance : la vérification auth + profil se faisait une fois
// dans le layout ET une seconde fois dans plusieurs pages (caisse,
// session-caisse...), doublant inutilement les allers-retours réseau vers
// Supabase à chaque changement de page. `cache()` de React mémorise le
// résultat pour la durée d'UNE SEULE requête serveur : le layout et la page
// qui se rendent ensemble partagent le même résultat, sans requête en trop.
//
// `getSession()` plutôt que `getUser()` : getUser() revalide le jeton en
// direct auprès du serveur d'authentification à CHAQUE appel — un aller-
// retour réseau de plus sur chaque changement de page, ce qui pèse lourd
// depuis le Mali. getSession() lit le jeton déjà présent dans les cookies
// sans ce round-trip. C'est sûr ici car la vraie barrière de sécurité n'est
// pas cette vérification mais les règles RLS sur la base — elles revalident
// indépendamment le jeton à chaque requête, quoi que fasse cette fonction.
// Ce choix affecte seulement la rapidité à détecter un compte désactivé
// dans l'interface (jusqu'à expiration du jeton), pas l'accès aux données.
import { cache } from "react";
import { createClient } from "./server";
import type { Profil } from "@/types/database.types";

export const getProfilCourant = cache(async (): Promise<Profil | null> => {
  const supabase = await createClient();

  // Même précaution que dans middleware.ts : un refresh token invalide/
  // expiré peut faire échouer cet appel au lieu de renvoyer une session
  // vide, ce qui ferait planter le rendu de la page entière plutôt que de
  // simplement traiter la personne comme non connectée.
  let session;
  try {
    ({
      data: { session },
    } = await supabase.auth.getSession());
  } catch {
    return null;
  }

  if (!session?.user) return null;

  const { data: profil } = await supabase
    .from("profils")
    .select("*")
    .eq("id", session.user.id)
    .single<Profil>();

  return profil ?? null;
});
