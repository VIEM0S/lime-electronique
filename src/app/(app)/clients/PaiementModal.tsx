"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Client, ModeRemboursement } from "@/types/database.types";

const MODES: { key: ModeRemboursement; label: string }[] = [
  { key: "especes", label: "Espèces" },
  { key: "mobile_money", label: "Mobile Money" },
  { key: "virement", label: "Virement" },
];

type ReleveAchat = { numero_facture: string; montant_total: number; statut: string };

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

  // Reçu affiché juste après l'enregistrement du paiement
  const [recu, setRecu] = useState<{
    clientNom: string;
    soldeAvant: number;
    montantPaye: number;
    soldeApres: number;
    mode: ModeRemboursement;
    date: string;
    achatsEnCours: ReleveAchat[];
  } | null>(null);

  function fermerEtReinitialiser() {
    setMontant("");
    setMode("especes");
    setErreur(null);
    setRecu(null);
    onClose();
  }

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

    // Détail des ventes à crédit encore ouvertes de ce client, pour rappeler
    // sur le reçu ce qu'il a acheté et qui reste (au moins partiellement) dû.
    const { data: achats } = await supabase
      .from("ventes")
      .select("numero_facture, montant_total, statut")
      .eq("client_id", client.id)
      .in("statut", ["impayee", "partielle"])
      .order("date", { ascending: false });

    setEnvoi(false);
    const soldeAvant = Number(client.solde_du);
    setRecu({
      clientNom: client.nom,
      soldeAvant,
      montantPaye: m,
      soldeApres: soldeAvant - m,
      mode,
      date: new Date().toISOString(),
      achatsEnCours: achats ?? [],
    });
    onSaved(`Paiement de ${m.toLocaleString("fr-FR")} FCFA enregistré pour ${client.nom}.`);
    router.refresh();
  }

  if (!client) return null;

  if (recu) {
    return (
      <Modal open={open} onClose={fermerEtReinitialiser} title={`Reçu de paiement — ${recu.clientNom}`}>
        <div className="space-y-3">
          <div id="zone-impression" className="bg-white border border-ink/10 rounded-lg p-4 text-xs font-mono">
            <div className="text-center mb-3">
              <div className="font-display font-semibold text-sm">Lime-électronique</div>
              <div className="text-ink/50">Reçu de paiement de créance</div>
            </div>
            <div className="border-t border-dashed border-ink/20 my-2" />
            <div>Client : {recu.clientNom}</div>
            <div>Date : {new Date(recu.date).toLocaleString("fr-FR")}</div>
            <div>Mode : {MODES.find((m) => m.key === recu.mode)?.label}</div>
            <div className="border-t border-dashed border-ink/20 my-2" />
            <div className="flex justify-between">
              <span>Solde dû avant paiement</span>
              <span>{recu.soldeAvant.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Montant payé aujourd&apos;hui</span>
              <span>- {recu.montantPaye.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="border-t border-dashed border-ink/20 my-2" />
            <div className="flex justify-between font-semibold">
              <span>Reste à payer</span>
              <span>{recu.soldeApres.toLocaleString("fr-FR")} FCFA</span>
            </div>

            {recu.achatsEnCours.length > 0 && (
              <>
                <div className="border-t border-dashed border-ink/20 my-2" />
                <div className="text-ink/50 mb-1">Achats à crédit encore en cours :</div>
                {recu.achatsEnCours.map((a) => (
                  <div key={a.numero_facture} className="flex justify-between">
                    <span>{a.numero_facture}</span>
                    <span>{Number(a.montant_total).toLocaleString("fr-FR")}</span>
                  </div>
                ))}
              </>
            )}

            <div className="text-center text-ink/40 mt-3">
              {recu.soldeApres <= 0 ? "Compte soldé — merci !" : "Solde restant à régler ultérieurement"}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fermerEtReinitialiser} className="flex-1">
              Fermer
            </Button>
            <Button onClick={() => window.print()} className="flex-1">
              <Printer size={13} /> Imprimer / Enregistrer en PDF
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={fermerEtReinitialiser} title={`Paiement — ${client.nom}`}>
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
          <Button variant="secondary" onClick={fermerEtReinitialiser} className="flex-1">
            Annuler
          </Button>
          <Button onClick={enregistrer} disabled={envoi} className="flex-1">
            {envoi ? "Enregistrement..." : "Enregistrer le paiement"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
