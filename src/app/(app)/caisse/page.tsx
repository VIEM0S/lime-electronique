import { createClient } from "@/lib/supabase/server";
import CaisseForm from "./CaisseForm";
import VentesRecentes from "./VentesRecentes";

export default async function CaissePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user?.id)
    .single();

  // Chargé une fois au rendu serveur ; la recherche fine se fait côté client
  // (cf. CaisseForm) via une requête filtrée sur code_article/nom.
  const { data: articles } = await supabase
    .from("articles")
    .select("id, code_article, nom, prix_vente, quantite_stock")
    .eq("actif", true)
    .order("nom");

  const { data: clients } = await supabase.from("clients").select("id, nom, telephone").order("nom");

  const { data: ventesRecentes } = await supabase
    .from("ventes")
    .select("id, numero_facture, date, montant_total, statut, conflit_sync")
    .order("date", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Caisse — Nouvelle vente</h1>
        <p className="text-xs text-ink/40 italic">Comptoir ou vente à distance (FR-09 à FR-14)</p>
      </div>
      <CaisseForm articles={articles ?? []} clients={clients ?? []} />

      <VentesRecentes
        ventes={ventesRecentes ?? []}
        peutAnnuler={profil?.role === "proprietaire"}
      />
    </div>
  );
}
