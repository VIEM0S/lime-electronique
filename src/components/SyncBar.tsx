"use client";

// Bandeau de synchronisation (FR-27, NFR-02) — branché sur useSyncStatus,
// lui-même adossé à la vraie file d'attente IndexedDB (src/lib/offline/queue.ts).
import { CloudOff, RefreshCw, CloudCheck } from "lucide-react";
import { useSyncStatus } from "@/lib/offline/useSyncStatus";

export default function SyncBar() {
  const { enLigne, pending, synchronisation, synchroniser } = useSyncStatus();

  if (!enLigne) {
    return (
      <div className="flex items-center gap-2 bg-signal/10 text-signal text-xs px-6 py-1.5 border-b border-signal/20">
        <CloudOff size={13} />
        Hors-ligne — les ventes sont enregistrées localement et seront synchronisées au retour du réseau
        {pending > 0 && <span className="ml-1 num font-semibold">({pending} en attente)</span>}
      </div>
    );
  }

  if (pending === 0 && !synchronisation) {
    return (
      <div className="flex items-center gap-2 bg-ok/10 text-ok text-xs px-6 py-1.5 border-b border-ok/20">
        <CloudCheck size={13} />
        Toutes les données sont synchronisées
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-ember/10 text-ember text-xs px-6 py-1.5 border-b border-ember/20">
      <RefreshCw size={13} className={synchronisation ? "animate-spin" : ""} />
      {synchronisation
        ? "Synchronisation en cours..."
        : `${pending} vente(s) en attente de synchronisation`}
      {!synchronisation && (
        <button onClick={synchroniser} className="ml-auto underline hover:no-underline font-medium">
          synchroniser maintenant
        </button>
      )}
    </div>
  );
}
