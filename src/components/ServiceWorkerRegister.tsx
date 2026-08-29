"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux — l'app continue de fonctionner normalement en ligne,
        // seule la résilience hors-ligne ne sera pas active.
      });
    }

    // Une page qui monte avec succès prouve que le rechargement forcé après
    // un chunk cassé (cf. src/lib/chunk-retry.ts) a fonctionné — on peut
    // réarmer le filet de sécurité pour un futur redéploiement.
    sessionStorage.removeItem("lime:chunk-retry-tente");
  }, []);

  return null;
}
