"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Role } from "@/types/database.types";

export default function NouvelUtilisateurModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<Role>("caisse");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function creer() {
    setErreur(null);
    if (!nom.trim() || !email.trim() || motDePasse.length < 6) {
      setErreur("Nom, email requis, et mot de passe d'au moins 6 caractères.");
      return;
    }
    setEnvoi(true);
    const res = await fetch("/api/utilisateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nom.trim(), email: email.trim(), motDePasse, role }),
    });
    const data = await res.json();
    setEnvoi(false);

    if (!res.ok) {
      setErreur(data.error ?? "Erreur lors de la création.");
      return;
    }

    onSaved(`Compte créé pour ${nom.trim()}.`);
    setNom("");
    setEmail("");
    setMotDePasse("");
    setRole("caisse");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvel utilisateur">
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">Nom</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="Fatoumata Diarra" autoFocus />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">Email (identifiant)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="vendeur2@lime-electronique.ml" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">Mot de passe temporaire</label>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="Au moins 6 caractères" />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">Rôle</label>
          <div className="flex gap-1.5">
            {(["caisse", "proprietaire"] as Role[]).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`flex-1 text-xs py-1.5 rounded-md border capitalize transition-colors ${
                  role === r ? "bg-lime/15 border-lime-deep text-lime-deep font-semibold" : "border-ink/15 text-ink/50"
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        {erreur && <p className="text-xs text-signal">{erreur}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={creer} disabled={envoi} className="flex-1">
            {envoi ? "Création..." : "Créer le compte"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
