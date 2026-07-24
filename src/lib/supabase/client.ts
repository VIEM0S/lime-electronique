// Client Supabase pour les Client Components ("use client")
import { createBrowserClient } from "@supabase/ssr";

// NB : le typage générique <Database> n'est pas branché pour l'instant —
// le fichier database.types.ts est écrit à la main et pas encore garanti
// 100% compatible avec l'inférence stricte de @supabase/ssr. À reconnecter
// avec `supabase gen types typescript --project-id <id> > src/types/database.types.ts`
// dès que le projet Supabase existe réellement.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
