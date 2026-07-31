"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Profil, Role } from "@/types/database.types";

export default function ModifierUtilisateurModal({
  open,
  onClose,
  utilisateur,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  utilisateur: Profil | null;
  onSaved: (message: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<Role>("caisse");
  const [actif, setActif] = useState(true);
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (utilisateur) {
      setNom(utilisateur.nom);
      setRole(utilisateur.role);
      setActif(utilisateur.actif);
      setNouveauMotDePasse("");
    }
  }, [utilisateur]);

  async function enregistrer() {
    if (!utilisateur) return;
    setErreur(null);

    if (nouveauMotDePasse && nouveauMotDePasse.length < 6) {
      setErreur("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setEnvoi(true);

    const { error } = await supabase
      .from("profils")
      .update({ nom: nom.trim(), role, actif })
      .eq("id", utilisateur.id);

    if (error) {
      setEnvoi(false);
      setErreur(error.message);
      return;
    }

    if (nouveauMotDePasse) {
      const res = await fetch(`/api/utilisateurs/${utilisateur.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse: nouveauMotDePasse }),
      });
      const json = await res.json();
      setEnvoi(false);
      if (!res.ok) {
        setErreur(json.error ?? "Échec du changement de mot de passe.");
        return;
      }
    } else {
      setEnvoi(false);
    }

    onSaved(
      nouveauMotDePasse
        ? `Compte de ${nom.trim()} mis à jour, mot de passe changé.`
        : `Compte de ${nom.trim()} mis à jour.`
    );
    router.refresh();
    onClose();
  }

  if (!utilisateur) return null;

  return (
    <Modal open={open} onClose={onClose} title="Modifier l'utilisateur">
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">Nom</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">Rôle</label>
          <div className="flex gap-1.5">
            {(["caisse", "proprietaire"] as Role[]).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 text-xs py-1.5 rounded-md border capitalize transition-colors ${
                  role === r ? "bg-lime/15 border-lime-deep text-lime-deep font-semibold" : "border-ink/15 text-ink/62"
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs pt-1">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)}
            className="rounded accent-lime-deep" />
          Compte actif (décocher pour désactiver l&apos;accès)
        </label>

        <div className="pt-2 border-t border-argent/25">
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
            Nouveau mot de passe (optionnel)
          </label>
          <input
            type="text"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
            placeholder="Laisser vide pour ne pas changer"
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
          <p className="text-[10px] text-ink/55 mt-1">
            Changé directement — aucun email n&apos;est envoyé. Communique-le à l&apos;utilisateur toi-même.
          </p>
        </div>

        {erreur && <p className="text-xs text-signal">{erreur}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={enregistrer} disabled={envoi} className="flex-1">
            {envoi ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
