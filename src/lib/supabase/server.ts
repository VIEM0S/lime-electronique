// Client Supabase pour les Server Components / Route Handlers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cf. note dans client.ts : typage générique <Database> à reconnecter plus tard.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : ignoré si le middleware
            // rafraîchit déjà la session.
          }
        },
      },
    }
  );
}
