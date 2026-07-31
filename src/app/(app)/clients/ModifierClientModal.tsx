"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Client } from "@/types/database.types";

export default function ModifierClientModal({
  open,
  onClose,
  client,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onSaved: (message: string) => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [quartier, setQuartier] = useState("");
  const [limiteCredit, setLimiteCredit] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (client) {
      setNom(client.nom);
      setTelephone(client.telephone ?? "");
      setQuartier(client.quartier ?? "");
      setLimiteCredit(client.limite_credit != null ? String(client.limite_credit) : "");
    }
  }, [client]);

  async function enregistrer() {
    if (!client) return;
    setErreur(null);
    if (!nom.trim()) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    setEnvoi(true);
    const { error } = await supabase
      .from("clients")
      .update({
        nom: nom.trim(),
        telephone: telephone.trim() || null,
        quartier: quartier.trim() || null,
        limite_credit: limiteCredit.trim() ? Number(limiteCredit) : null,
      })
      .eq("id", client.id);
    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    onSaved(`Client "${nom.trim()}" mis à jour.`);
    router.refresh();
    onClose();
  }

  if (!client) return null;

  return (
    <Modal open={open} onClose={onClose} title="Modifier le client">
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">Nom</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">Téléphone</label>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">Quartier (optionnel)</label>
          <input
            value={quartier}
            onChange={(e) => setQuartier(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-ink/55 mb-1 font-semibold">
            Limite de crédit (FCFA, optionnel)
          </label>
          <input
            type="number"
            min={0}
            value={limiteCredit}
            onChange={(e) => setLimiteCredit(e.target.value)}
            placeholder="Aucune limite"
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          />
          <p className="text-[10px] text-ink/55 mt-1">
            Indicatif pour le moment — utilisé sur l&apos;écran Crédits pour repérer les dépassements.
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
