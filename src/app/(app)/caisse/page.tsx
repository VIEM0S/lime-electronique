import { createClient } from "@/lib/supabase/server";
import { getProfilCourant } from "@/lib/supabase/current-user";
import CaisseForm from "./CaisseForm";
import VentesRecentes from "./VentesRecentes";

export default async function CaissePage() {
  const supabase = await createClient();
  const profil = await getProfilCourant();

  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);

  // Chargé une fois au rendu serveur ; la recherche fine se fait côté client
  // (cf. CaisseForm) via une requête filtrée sur code_article/nom.
  const [{ data: articles }, { data: clients }, { data: ventesRecentes }] = await Promise.all([
    supabase
      .from("articles")
      .select("id, code_article, nom, prix_vente, quantite_stock")
      .eq("actif", true)
      .order("nom"),
    supabase.from("clients").select("id, nom, telephone, solde_du, limite_credit").order("nom"),
    supabase
      .from("ventes")
      .select("id, numero_facture, date, montant_total, statut, conflit_sync")
      .gte("date", debutJournee.toISOString())
      .order("date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Caisse — Nouvelle vente</h1>
        <p className="text-xs text-ink/55 italic">Comptoir ou vente à distance</p>
      </div>
      <CaisseForm articles={articles ?? []} clients={clients ?? []} />

      <VentesRecentes
        ventes={ventesRecentes ?? []}
        peutAnnuler={profil?.role === "proprietaire"}
      />
    </div>
  );
}
