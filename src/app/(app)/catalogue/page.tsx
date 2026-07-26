import { createClient } from "@/lib/supabase/server";
import CatalogueClient from "./CatalogueClient";

export default async function CataloguePage() {
  const supabase = await createClient();

  // Charge aussi les articles désactivés : l'écran gère l'affichage/masquage
  // et permet de les réactiver (BR-01 — un code peut être réutilisé après
  // désactivation, encore faut-il pouvoir désactiver puis retrouver l'article).
  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .order("nom");

  const { data: mouvements } = await supabase
    .from("mouvements_stock")
    .select("*, articles(nom, code_article)")
    .order("date", { ascending: false })
    .limit(10);

  return <CatalogueClient articles={articles ?? []} mouvements={(mouvements as any) ?? []} />;
}
