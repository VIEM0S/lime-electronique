"use client";

// Bannière "nouvelle version disponible" — distincte de InstallBanner.tsx.
//
// Le service worker (public/sw.js) appelle self.skipWaiting() + clients.claim()
// dès l'installation : un redéploiement prend donc le contrôle immédiatement,
// sans écran "mise à jour en attente, clique pour activer" classique. Mais ça
// ne recharge PAS l'onglet déjà ouvert — son JS reste l'ancienne version tant
// qu'on ne recharge pas. C'est ce que ce bandeau signale : l'événement
// `controllerchange` du navigateur, qui se déclenche précisément quand un
// nouveau service worker vient de prendre le relais.
//
// Piège à éviter : `controllerchange` se déclenche aussi lors de la toute
// première installation (rien à signaler, l'app vient juste de démarrer) —
// on ne montre donc le bandeau que si un contrôleur existait déjà AVANT cet
// événement, preuve qu'il s'agit d'un vrai remplacement en cours de session.
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

export default function UpdateBanner() {
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const avaitDejaUnControleur = !!navigator.serviceWorker.controller;

    function onControllerChange() {
      if (avaitDejaUnControleur) setDisponible(true);
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!disponible) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:w-80 z-50 bg-ink text-white rounded-lg shadow-card-hover-lg p-3.5 flex items-center gap-3">
      <RefreshCw size={16} className="text-lime shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">Nouvelle version disponible</p>
        <p className="text-[11px] text-white/60 mt-0.5">Recharge pour appliquer la mise à jour.</p>
      </div>
      <Button size="sm" onClick={() => window.location.reload()}>
        Recharger
      </Button>
    </div>
  );
}
