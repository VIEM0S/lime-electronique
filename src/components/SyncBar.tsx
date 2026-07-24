"use client";

// Bandeau de synchronisation (FR-27, NFR-02) — cf. maquette.
// Pour l'instant affichage statique ; à brancher sur src/lib/offline/queue.ts
// (getPendingActions) une fois la file d'attente hors-ligne implémentée.
import { useState } from "react";

export default function SyncBar() {
  const [pending, setPending] = useState(0); // TODO: brancher sur la vraie file d'attente

  if (pending === 0) {
    return (
      <div className="flex items-center gap-2 bg-gray-200 text-gray-600 text-xs px-6 py-1.5">
        <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
        Toutes les données sont synchronisées
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-amber-50 text-amber-800 text-xs px-6 py-1.5">
      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
      {pending} élément(s) en attente de synchronisation
      <button className="ml-auto underline" onClick={() => setPending(0)}>
        simuler la sync
      </button>
    </div>
  );
}
