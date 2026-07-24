"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, KeyRound } from "lucide-react";
import NouvelUtilisateurModal from "./NouvelUtilisateurModal";
import ModifierUtilisateurModal from "./ModifierUtilisateurModal";
import Button from "@/components/ui/Button";
import Toast, { type ToastMsg } from "@/components/ui/Toast";
import type { Profil } from "@/types/database.types";

export default function UtilisateursClient({
  utilisateurs,
  emailsParId,
}: {
  utilisateurs: Profil[];
  emailsParId: Record<string, string>;
}) {
  const supabase = createClient();
  const [modalNouveau, setModalNouveau] = useState(false);
  const [utilisateurEdite, setUtilisateurEdite] = useState<Profil | null>(null);
  const [toast, setToast] = useState<ToastMsg>(null);

  async function reinitialiser(u: Profil) {
    const email = emailsParId[u.id];
    if (!email) {
      setToast({ type: "error", text: "Email introuvable pour cet utilisateur." });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setToast({ type: "error", text: error.message });
      return;
    }
    setToast({ type: "success", text: `Email de réinitialisation envoyé à ${email}.` });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-semibold text-ink">Gestion des utilisateurs</h1>
          <p className="text-xs text-ink/40 italic">FR-22 à FR-22quater</p>
        </div>
        <Button size="sm" onClick={() => setModalNouveau(true)}>
          <Plus size={14} /> Nouvel utilisateur
        </Button>
      </div>

      <div className="bg-white border border-ink/10 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-ink/[0.03] text-ink/40 text-left">
            <tr><th className="p-2.5">Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th></th></tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
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
                <td className="pr-2.5 text-right space-x-2">
                  <button onClick={() => setUtilisateurEdite(u)}
                    className="inline-flex items-center gap-1 text-ink/40 hover:text-lime-deep text-[11px] font-semibold">
                    <Pencil size={12} /> Modifier
                  </button>
                  <button onClick={() => reinitialiser(u)}
                    className="inline-flex items-center gap-1 text-ink/40 hover:text-lime-deep text-[11px] font-semibold">
                    <KeyRound size={12} /> Réinitialiser
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NouvelUtilisateurModal
        open={modalNouveau}
        onClose={() => setModalNouveau(false)}
        onSaved={(msg) => setToast({ type: "success", text: msg })}
      />
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
