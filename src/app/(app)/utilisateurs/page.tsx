import { createClient } from "@/lib/supabase/server";

export default async function UtilisateursPage() {
  const supabase = await createClient();

  const { data: utilisateurs } = await supabase
    .from("profils")
    .select("*")
    .order("created_at");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-accent">Gestion des utilisateurs</h1>
      <p className="text-xs text-gray-400 italic">FR-22 à FR-22quater — création, rôle, désactivation, réinitialisation</p>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr><th className="p-2">Nom</th><th>Rôle</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {(utilisateurs ?? []).map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="p-2">{u.nom}</td>
                <td className="capitalize">{u.role}</td>
                <td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.actif ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                    {u.actif ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="space-x-2">
                  {/* TODO FR-22bis/ter/quater : modifier / désactiver (update profils.actif)
                      / réinitialiser mot de passe (Supabase Auth Admin API) */}
                  <button className="text-accent underline">Modifier</button>
                  <button className="text-accent underline">Réinitialiser</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TODO FR-22 : formulaire de création -> supabase.auth.admin.createUser()
          côté serveur (Route Handler protégé), puis insert dans profils */}
    </div>
  );
}
