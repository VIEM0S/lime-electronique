import { createClient } from "@/lib/supabase/server";
import FacturesClient from "./FacturesClient";

export default async function FacturesPage() {
  const supabase = await createClient();

  const [{ data: ventes }, { data: remboursements }] = await Promise.all([
    supabase
      .from("ventes")
      .select("id, numero_facture, date, montant_total, statut, clients(nom), paiements(mode)")
      .neq("statut", "annulee")
      .order("date", { ascending: false }),
    supabase
      .from("remboursements_credit")
      .select("id, date, montant, mode, clients(nom)")
      .order("date", { ascending: false }),
  ]);

  type Ligne = {
    id: string;
    type: "vente" | "remboursement";
    reference: string;
    date: string;
    clientNom: string;
    paiement: string;
    total: number;
  };

  const LABEL_MODE: Record<string, string> = {
    especes: "Espèces",
    mobile_money: "Mobile Money",
    virement: "Virement",
    credit: "Crédit",
  };

  function libellePaiement(modes: string[]): string {
    const uniques = Array.from(new Set(modes));
    if (uniques.length === 0) return "—";
    if (uniques.length === 1) return LABEL_MODE[uniques[0]] ?? uniques[0];
    return "Mixte";
  }

  const lignesVentes: Ligne[] = (ventes ?? []).map((v: any) => ({
    id: v.id,
    type: "vente",
    reference: v.numero_facture,
    date: v.date,
    clientNom: v.clients?.nom ?? "Client comptoir",
    paiement: libellePaiement((v.paiements ?? []).map((p: any) => p.mode)),
    total: Number(v.montant_total),
  }));

  const lignesRemboursements: Ligne[] = (remboursements ?? []).map((r: any) => ({
    id: r.id,
    type: "remboursement",
    reference: `REC-${r.id.slice(0, 8).toUpperCase()}`,
    date: r.date,
    clientNom: r.clients?.nom ?? "—",
    paiement: LABEL_MODE[r.mode] ?? r.mode,
    total: Number(r.montant),
  }));

  const toutes = [...lignesVentes, ...lignesRemboursements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return <FacturesClient lignes={toutes} />;
}
