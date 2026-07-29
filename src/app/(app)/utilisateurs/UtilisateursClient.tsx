"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import ModifierUtilisateurModal from "./ModifierUtilisateurModal";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import type { Profil } from "@/types/database.types";

export default function UtilisateursClient({
  utilisateurs,
  emailsParId,
}: {
  utilisateurs: Profil[];
  emailsParId: Record<string, string>;
}) {
  const [utilisateurEdite, setUtilisateurEdite] = useState<Profil | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);
  const [recherche, setRecherche] = useState("");

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return utilisateurs;
    return utilisateurs.filter(
      (u) =>
        u.nom.toLowerCase().includes(q) ||
        (emailsParId[u.id] ?? "").toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [utilisateurs, emailsParId, recherche]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-display font-semibold text-ink">Gestion des utilisateurs</h1>
        <p className="text-xs text-ink/40 italic">
          FR-22 à FR-22quater — création des comptes réservée à Supabase (Authentication → Users)
        </p>
      </div>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom, email ou rôle..."
        className="w-full max-w-sm border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
      />

      <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-argent/10 text-ink/40 text-left">
              <tr><th className="p-2.5">Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {filtres.map((u) => (
                <tr key={u.id} className="border-t border-ink/5 hover:bg-lime/5 transition-colors">
                  <td className="p-2.5">{u.nom}</td>
                  <td className="text-ink/50">{emailsParId[u.id] ?? "—"}</td>
                  <td className="capitalize">{u.role}</td>
                  <td>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      u.actif ? "bg-ok/10 text-ok" : "bg-ink/10 text-ink/50"
                    }`}>
                      {u.actif ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td className="pr-2.5 text-right">
                    <button onClick={() => setUtilisateurEdite(u)}
                      className="inline-flex items-center gap-1 text-ink/40 hover:text-lime-deep text-[11px] font-semibold">
                      <Pencil size={12} /> Modifier / mot de passe
                    </button>
                  </td>
                </tr>
              ))}
              {filtres.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-ink/30">Aucun utilisateur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModifierUtilisateurModal
        open={!!utilisateurEdite}
        onClose={() => setUtilisateurEdite(null)}
        utilisateur={utilisateurEdite}
        onSaved={(msg) => setToast({ type: "success", text: msg })}
      />
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}
