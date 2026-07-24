"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionCaisse } from "@/types/database.types";

export default function SessionCaisseForm({ sessionOuverte }: { sessionOuverte: SessionCaisse | null }) {
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
      <div className="bg-white border border-gray-200 rounded p-4 text-sm space-y-1">
        <p>Session fermée.</p>
        <p>Montant théorique : <b>{Number(resultatFermeture.montant_theorique).toLocaleString("fr-FR")} FCFA</b></p>
        <p>Montant compté : <b>{Number(resultatFermeture.montant_fermeture_declare).toLocaleString("fr-FR")} FCFA</b></p>
        <p className={ecart === 0 ? "text-green-600" : "text-amber-600"}>
          Écart : <b>{ecart > 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")} FCFA</b>
          {ecart === 0 ? " (caisse juste)" : ecart > 0 ? " (excédent)" : " (manque)"}
        </p>
      </div>
    );
  }

  if (!sessionOuverte) {
    return (
      <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
        <label className="block text-[10px] uppercase tracking-wide text-gray-400">
          Fonds de caisse initial
        </label>
        <input
          type="number"
          value={fondsInitial}
          onChange={(e) => setFondsInitial(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          placeholder="15000"
        />
        {erreur && <p className="text-xs text-red-600">{erreur}</p>}
        <button
          onClick={ouvrir}
          disabled={envoi}
          className="bg-accent text-white rounded py-2 px-4 text-sm font-semibold disabled:opacity-50"
        >
          {envoi ? "Ouverture..." : "Ouvrir la session"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
      <p className="text-xs text-gray-500">
        Session ouverte le {new Date(sessionOuverte.date_ouverture).toLocaleString("fr-FR")} — fonds initial :{" "}
        {Number(sessionOuverte.montant_ouverture).toLocaleString("fr-FR")} FCFA
      </p>
      <label className="block text-[10px] uppercase tracking-wide text-gray-400">
        Montant compté physiquement (fermeture)
      </label>
      <input
        type="number"
        value={montantCompte}
        onChange={(e) => setMontantCompte(e.target.value)}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        placeholder="63000"
      />
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
      <button
        onClick={fermer}
        disabled={envoi}
        className="bg-accent text-white rounded py-2 px-4 text-sm font-semibold disabled:opacity-50"
      >
        {envoi ? "Fermeture..." : "Fermer la session"}
      </button>
    </div>
  );
}
