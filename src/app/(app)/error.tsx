"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { estErreurChunkCasse, tenterRechargementUnique } from "@/lib/chunk-retry";
import Button from "@/components/ui/Button";

export default function ErreurApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [rechargementEnCours, setRechargementEnCours] = useState(false);

  useEffect(() => {
    if (estErreurChunkCasse(error)) {
      const declenche = tenterRechargementUnique();
      if (declenche) setRechargementEnCours(true);
    }
  }, [error]);

  if (rechargementEnCours) {
    // Rien à afficher — le rechargement complet est déjà en cours.
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
      <AlertTriangle size={28} className="text-ember" />
      <p className="text-sm font-display font-semibold text-ink">Une erreur est survenue</p>
      <p className="text-xs text-ink/55 max-w-xs">
        {error.message || "Quelque chose s'est mal passé. Réessaie, ou recharge la page si le problème persiste."}
      </p>
      <div className="flex gap-2 mt-1">
        <Button size="sm" variant="secondary" onClick={() => reset()}>
          Réessayer
        </Button>
        <Button size="sm" onClick={() => window.location.reload()}>
          <RefreshCw size={13} /> Recharger la page
        </Button>
      </div>
    </div>
  );
}
