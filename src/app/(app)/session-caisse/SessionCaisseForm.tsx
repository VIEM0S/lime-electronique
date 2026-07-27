"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionCaisse } from "@/types/database.types";

const LABEL_MODE: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  credit: "Crédit (non encaissé)",
};

export default function SessionCaisseForm({
  sessionOuverte,
  paiementsSession = [],
}: {
  sessionOuverte: SessionCaisse | null;
  paiementsSession?: { mode: string; montant: number }[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [fondsInitial, setFondsInitial] = useState("");
  const [montantCompte, setMontantCompte] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultatFermeture, setResultatFermeture] = useState<SessionCaisse | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function ouvrir() {
    setErreur(null);
    setEnvoi(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("sessions_caisse")
      .insert({ utilisateur_id: user?.id, montant_ouverture: Number(fondsInitial) || 0 });

    setEnvoi(false);
    if (error) {
      // ex. contrainte idx_sessions_caisse_une_ouverte si une session est déjà ouverte
      setErreur(error.message);
      return;
    }
    router.refresh();
  }

  async function fermer() {
    if (!sessionOuverte) return;
    setErreur(null);
    setEnvoi(true);

    const { data, error } = await supabase
      .from("sessions_caisse")
      .update({
        statut: "fermee",
        date_fermeture: new Date().toISOString(),
        montant_fermeture_declare: Number(montantCompte) || 0,
      })
      .eq("id", sessionOuverte.id)
      .select()
      .single();

    setEnvoi(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    setResultatFermeture(data);
    router.refresh();
  }

  if (resultatFermeture) {
    const ecart = Number(resultatFermeture.ecart);
    return (
      <div className="bg-white border border-ink/10 rounded-lg p-4 text-sm space-y-1">
        <p>Session fermée.</p>
        <p>Montant théorique : <b>{Number(resultatFermeture.montant_theorique).toLocaleString("fr-FR")} FCFA</b></p>
        <p>Montant compté : <b>{Number(resultatFermeture.montant_fermeture_declare).toLocaleString("fr-FR")} FCFA</b></p>
        <p className={ecart === 0 ? "text-ok" : "text-ember"}>
          Écart : <b>{ecart > 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")} FCFA</b>
          {ecart === 0 ? " (caisse juste)" : ecart > 0 ? " (excédent)" : " (manque)"}
        </p>
      </div>
    );
  }

  if (!sessionOuverte) {
    return (
      <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
        <label className="block text-[10px] uppercase tracking-wide text-ink/40 font-semibold">
          Fonds de caisse initial
        </label>
        <input
          type="number"
          value={fondsInitial}
          onChange={(e) => setFondsInitial(e.target.value)}
          className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm num focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
          placeholder="15000"
        />
        {erreur && <p className="text-xs text-signal">{erreur}</p>}
        <button
          onClick={ouvrir}
          disabled={envoi}
          className="bg-lime text-ink rounded-md py-2 px-4 text-sm font-semibold hover:bg-lime-deep transition-colors disabled:opacity-50"
        >
          {envoi ? "Ouverture..." : "Ouvrir la session"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
      <p className="text-xs text-ink/50">
        Session ouverte le {new Date(sessionOuverte.date_ouverture).toLocaleString("fr-FR")} — fonds initial :{" "}
        {Number(sessionOuverte.montant_ouverture).toLocaleString("fr-FR")} FCFA
      </p>

      {paiementsSession.length > 0 && (() => {
        const parMode: Record<string, number> = {};
        paiementsSession.forEach((p) => {
          parMode[p.mode] = (parMode[p.mode] ?? 0) + Number(p.montant);
        });
        const especesAttendu = Number(sessionOuverte.montant_ouverture) + (parMode.especes ?? 0);
        return (
          <div className="bg-ink/[0.03] rounded-md p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold mb-1">
              Ventes de cette session — pour justificatif de l&apos;écart
            </p>
            {Object.entries(parMode).map(([mode, montant]) => (
              <div key={mode} className="flex justify-between text-xs">
                <span className={mode === "credit" ? "text-ink/40 italic" : "text-ink/60"}>
                  {LABEL_MODE[mode] ?? mode}
                </span>
                <span className="num">{montant.toLocaleString("fr-FR")} FCFA</span>
              </div>
            ))}
            <div className="border-t border-ink/10 mt-1 pt-1 flex justify-between text-xs font-semibold">
              <span>Espèces attendues en caisse</span>
              <span className="num">{especesAttendu.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <p className="text-[10px] text-ink/40 italic">
              (fonds initial + espèces encaissées — le crédit et les paiements électroniques ne sont pas du liquide)
            </p>
          </div>
        );
      })()}

      <label className="block text-[10px] uppercase tracking-wide text-ink/40 font-semibold">
        Montant compté physiquement (fermeture)
      </label>
      <input
        type="number"
        value={montantCompte}
        onChange={(e) => setMontantCompte(e.target.value)}
        className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm num focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
        placeholder="63000"
      />
      {erreur && <p className="text-xs text-signal">{erreur}</p>}
      <button
        onClick={fermer}
        disabled={envoi}
        className="bg-lime text-ink rounded-md py-2 px-4 text-sm font-semibold hover:bg-lime-deep transition-colors disabled:opacity-50"
      >
        {envoi ? "Fermeture..." : "Fermer la session"}
      </button>
    </div>
  );
}
