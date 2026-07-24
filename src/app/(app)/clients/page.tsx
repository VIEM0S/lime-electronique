import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("solde_du", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-accent">Clients & créances</h1>
      <p className="text-xs text-gray-400 italic">Suivi des ventes à crédit (FR-15 à FR-18)</p>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="p-2">Client</th>
              <th>Téléphone</th>
              <th>Solde dû</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="p-2">{c.nom}</td>
                <td>{c.telephone}</td>
                <td className={Number(c.solde_du) > 0 ? "text-amber-600 font-semibold" : ""}>
                  {Number(c.solde_du).toLocaleString("fr-FR")} FCFA
                </td>
                <td>
                  {/* TODO FR-17 : ouvrir un formulaire d'enregistrement de paiement
                      -> insert dans remboursements_credit (cf. schema.sql) */}
                  {Number(c.solde_du) > 0 && (
                    <button className="text-accent underline">Enregistrer un paiement</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
