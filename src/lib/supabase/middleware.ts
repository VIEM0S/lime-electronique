// Rafraîchit la session Supabase à chaque requête (nécessaire avec @supabase/ssr)
//
// getSession() plutôt que getUser() : ce middleware s'exécute avant même
// l'affichage de CHAQUE page, donc un aller-retour réseau ici pèse sur
// absolument toute navigation. getSession() lit le jeton depuis les cookies
// sans revalider en direct auprès du serveur — sûr ici, car la vraie
// barrière de sécurité reste les règles RLS sur la base, qui revalident le
// jeton indépendamment à chaque requête de données, quoi que fasse ce
// middleware (qui ne sert qu'à rediriger vers /login si absent).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { pathname } = request.nextUrl;
  // Pages accessibles sans être connecté. Important : /reinitialiser-mot-de-passe
  // doit rester ici même si une session "recovery" temporaire existe déjà —
  // sinon la règle "déjà connecté → /dashboard" empêcherait de finir de
  // choisir le nouveau mot de passe avant d'y arriver.
  const routesPubliques = ["/login", "/mot-de-passe-oublie", "/reinitialiser-mot-de-passe"];
  const estRoutePublique = routesPubliques.some((r) => pathname.startsWith(r));

  if (!user && !estRoutePublique) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
