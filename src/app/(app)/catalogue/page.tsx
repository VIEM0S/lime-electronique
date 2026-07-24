import { createClient } from "@/lib/supabase/server";
import CatalogueClient from "./CatalogueClient";

export default async function CataloguePage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from("articles")
    .select("*")
    .eq("actif", true)
    .order("nom");

  const { data: mouvements } = await supabase
    .from("mouvements_stock")
    .select("*, articles(nom, code_article)")
    .order("date", { ascending: false })
    .limit(10);

  return <CatalogueClient articles={articles ?? []} mouvements={(mouvements as any) ?? []} />;
}
