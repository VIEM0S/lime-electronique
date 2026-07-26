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
  }, []);

  return null;
}
