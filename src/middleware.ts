import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // sw.js doit rester exclu comme manifest.json/favicon.ico : c'est un
  // script statique nécessaire à TOUTE page (y compris /login, avant même
  // la connexion) — sans cette exclusion, un navigateur sans session valide
  // (première visite, session expirée) qui appelle
  // navigator.serviceWorker.register("/sw.js") reçoit la redirection vers
  // /login à la place du vrai script, ce qui casse l'enregistrement/la mise
  // à jour du service worker silencieusement (trouvé le 30/08/2026 en
  // vérifiant la propagation du fix precedent sur sw.js).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
