"use client";

// Filet de dernier recours : ne se déclenche que si l'erreur survient dans le
// root layout lui-même (avant tout providers/segments), donc doit fournir son
// propre <html>/<body> — cf. doc Next.js sur global-error.tsx. Les erreurs
// des pages authentifiées passent par src/app/(app)/error.tsx, plus haut dans
// l'arbre et donc prioritaire ; celui-ci ne couvre que le reste (login, etc.).
import { useEffect, useState } from "react";
import { estErreurChunkCasse, tenterRechargementUnique } from "@/lib/chunk-retry";

export default function ErreurGlobale({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [rechargementEnCours, setRechargementEnCours] = useState(false);

  useEffect(() => {
    if (estErreurChunkCasse(error)) {
      const declenche = tenterRechargementUnique();
      if (declenche) setRechargementEnCours(true);
    }
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        {!rechargementEnCours && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "64px 16px",
              textAlign: "center",
            }}
          >
            <p style={{ fontWeight: 600, fontSize: 14 }}>Une erreur est survenue</p>
            <p style={{ fontSize: 12, color: "#666", maxWidth: 320 }}>
              {error.message || "Quelque chose s'est mal passé. Recharge la page pour continuer."}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => reset()}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "1px solid #26262626", background: "white" }}
              >
                Réessayer
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, border: "none", background: "#0050B0", color: "white", fontWeight: 600 }}
              >
                Recharger la page
              </button>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
