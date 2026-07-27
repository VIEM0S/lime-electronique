"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function NouveauClientModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [quartier, setQuartier] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer() {
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    setEnvoi(true);
    const { error } = await supabase
      .from("clients")
      .insert({ nom: nom.trim(), telephone: telephone.trim() || null, quartier: quartier.trim() || null });
    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    onSaved(`Client "${nom.trim()}" créé.`);
    setNom("");
    setTelephone("");
    setQuartier("");
    router.refresh();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau client">
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Nom
          </label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="Awa Traoré"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Téléphone (optionnel)
          </label>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="+223 70 00 00 00"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
            Quartier (optionnel)
          </label>
          <input
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
            placeholder="Badalabougou"
          />
        </div>
        {erreur && <p className="text-xs text-signal">{erreur}</p>}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button onClick={enregistrer} disabled={envoi} className="flex-1">
            {envoi ? "Création..." : "Créer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
