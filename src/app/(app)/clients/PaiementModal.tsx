"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import RecuPaiementClient from "./RecuPaiementClient";
import type { Client, ModeRemboursement } from "@/types/database.types";

const MODES: { key: ModeRemboursement; label: string }[] = [
  { key: "especes", label: "Espèces" },
  { key: "mobile_money", label: "Mobile Money" },
  { key: "virement", label: "Virement" },
];

export default function PaiementModal({
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
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState<ModeRemboursement>("especes");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [recu, setRecu] = useState<{
    soldeAvant: number;
    montantPaye: number;
    mode: string;
    soldeApres: number;
    factures: { numero_facture: string; montant_total: number; solde_restant: number; statut_credit: string }[];
  } | null>(null);

  async function enregistrer() {
    if (!client) return;
    setErreur(null);
    const m = Number(montant);
    if (!m || m <= 0) {
      setErreur("Le montant doit être supérieur à 0.");
      return;
    }
    if (m > Number(client.solde_du)) {
      setErreur(`Le montant dépasse le solde dû (${Number(client.solde_du).toLocaleString("fr-FR")} FCFA).`);
      return;
    }

    setEnvoi(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("remboursements_credit").insert({
      client_id: client.id,
      montant: m,
      mode,
      utilisateur_id: user?.id ?? null,
    });

    if (error) {
      setEnvoi(false);
      setErreur(error.message);
      return;
    }

    // Le solde et le détail par facture (recalcul FIFO via vue_credits_clients)
    // pour construire le reçu de paiement.
    const [{ data: clientMaj }, { data: factures }] = await Promise.all([
      supabase.from("clients").select("solde_du").eq("id", client.id).single(),
      supabase
        .from("vue_credits_clients")
        .select("numero_facture, montant_total, solde_restant, statut_credit")
        .eq("client_id", client.id)
        .order("numero_facture"),
    ]);

    setEnvoi(false);
    setRecu({
      soldeAvant: Number(client.solde_du),
      montantPaye: m,
      mode,
      soldeApres: Number(clientMaj?.solde_du ?? Number(client.solde_du) - m),
      factures: (factures ?? []) as any,
    });
    onSaved(`Paiement de ${m.toLocaleString("fr-FR")} FCFA enregistré pour ${client.nom}.`);
    setMontant("");
    router.refresh();
  }

  function fermer() {
    setRecu(null);
    onClose();
  }

  if (!client) return null;

  return (
    <Modal open={open} onClose={fermer} title={recu ? "Reçu de paiement" : `Paiement — ${client.nom}`}>
      {recu ? (
        <RecuPaiementClient
          clientNom={client.nom}
          soldeAvant={recu.soldeAvant}
          montantPaye={recu.montantPaye}
          mode={recu.mode}
          soldeApres={recu.soldeApres}
          factures={recu.factures}
          onFermer={fermer}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink/50">
            Solde dû actuel :{" "}
            <span className="num font-semibold text-ember">
              {Number(client.solde_du).toLocaleString("fr-FR")} FCFA
            </span>
          </p>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
              Montant reçu
            </label>
            <input
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm num focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
              placeholder="0"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink/40 mb-1 font-semibold">
              Mode de paiement
            </label>
            <div className="flex gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                    mode === m.key
                      ? "bg-lime/15 border-lime-deep text-lime-deep font-semibold"
                      : "border-ink/15 text-ink/50 hover:border-ink/30"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {erreur && <p className="text-xs text-signal">{erreur}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={fermer} className="flex-1">
              Annuler
            </Button>
            <Button onClick={enregistrer} disabled={envoi} className="flex-1">
              {envoi ? "Enregistrement..." : "Enregistrer le paiement"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
