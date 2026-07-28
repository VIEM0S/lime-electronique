"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SessionCaisse } from "@/types/database.types";

const LABEL_MODE: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile Money",
  virement: "Virement",
  credit: "Crédit",
};

export default function SessionCaisseForm({
  sessionOuverte,
  repartitionParMode,
}: {
  sessionOuverte: SessionCaisse | null;
  repartitionParMode: { mode: string; montant: number }[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [fondsInitial, setFondsInitial] = useState("");
  const [montantCompte, setMontantCompte] = useState("");
  const [commentaire, setCommentaire] = useState("");
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
        commentaire_fermeture: commentaire.trim() || null,
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
        {ecart < 0 && (
          <div className="flex items-start gap-2 bg-signal/5 border border-signal/20 rounded-md p-2.5 mt-2 text-signal">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              Écart négatif — signale-le au propriétaire. Compare avec la répartition par mode
              ci-dessus (une confusion espèces/Mobile Money est la cause la plus fréquente).
            </span>
          </div>
        )}
        {resultatFermeture.commentaire_fermeture && (
          <p className="text-ink/50 italic mt-1">
            Commentaire : « {resultatFermeture.commentaire_fermeture} »
          </p>
        )}
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
        <p className="text-[10px] text-ink/40">
          Chaque compte (propriétaire, caisse...) a sa propre session, indépendante des autres —
          ouvrir la tienne n&apos;ouvre pas celle d&apos;un collègue, et inversement.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-3">
      <p className="text-xs text-ink/50">
        Session ouverte le {new Date(sessionOuverte.date_ouverture).toLocaleString("fr-FR")} — fonds initial :{" "}
        {Number(sessionOuverte.montant_ouverture).toLocaleString("fr-FR")} FCFA
      </p>

      {repartitionParMode.length > 0 && (
        <div className="bg-ink/[0.03] rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wide text-ink/40 font-semibold mb-1.5">
            Ventes de cette session, par mode
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {repartitionParMode.map((r) => (
              <div key={r.mode} className="text-xs">
                <div className="text-ink/40">{LABEL_MODE[r.mode] ?? r.mode}</div>
                <div className="num font-semibold">{r.montant.toLocaleString("fr-FR")} FCFA</div>
              </div>
            ))}
          </div>
          <div className="border-t border-ink/10 mt-2 pt-2 flex justify-between text-xs font-semibold">
            <span>Espèces attendues en caisse</span>
            <span className="num">
              {(
                Number(sessionOuverte.montant_ouverture) +
                (repartitionParMode.find((r) => r.mode === "especes")?.montant ?? 0)
              ).toLocaleString("fr-FR")}{" "}
              FCFA
            </span>
          </div>
          <p className="text-[10px] text-ink/35 mt-1.5">
            Seules les espèces comptent dans le calcul de l&apos;écart théorique — les autres modes
            sont affichés ici à titre de justificatif seulement.
          </p>
        </div>
      )}

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

      <label className="block text-[10px] uppercase tracking-wide text-ink/40 font-semibold">
        Commentaire (optionnel) — utile si l&apos;écart est négatif, pour expliquer sur le moment
      </label>
      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        rows={2}
        className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm focus:border-lime-deep focus:ring-1 focus:ring-lime-deep"
        placeholder="Ex : un client a payé par Mobile Money mais j'ai coché Espèces par erreur"
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
