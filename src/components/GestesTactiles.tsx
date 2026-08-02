"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Gestes tactiles globaux — nécessaires car en mode PWA installé (écran
// d'accueil), il n'y a plus de barre de navigateur du tout : ni le glissement
// de bord pour revenir en arrière, ni le tirer-pour-actualiser natif du
// navigateur ne sont disponibles. On les recrée nous-mêmes pour que l'app
// se comporte comme une vraie application mobile.

const ZONE_BORD = 24; // px depuis le bord gauche/droit pour déclencher retour/avance
const SEUIL_SWIPE = 80; // px de déplacement horizontal minimum
const SEUIL_TIRER = 70; // px de tirage vertical minimum pour actualiser
const LIMITE_TIRER = 120; // px — au-delà, on arrête de suivre visuellement le doigt

export default function GestesTactiles({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [tirage, setTirage] = useState(0);
  const [actualisation, setActualisation] = useState(false);
  const debut = useRef<{ x: number; y: number; scrollTop: number } | null>(null);
  const modeTirer = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      debut.current = { x: t.clientX, y: t.clientY, scrollTop: window.scrollY };
      modeTirer.current = window.scrollY === 0;
    }

    function onTouchMove(e: TouchEvent) {
      if (!debut.current) return;
      const t = e.touches[0];
      const deltaY = t.clientY - debut.current.y;
      const deltaX = t.clientX - debut.current.x;

      // Tirer vers le bas, uniquement si on est déjà tout en haut de la page
      // et que le geste est clairement vertical (pas une simple lecture).
      if (modeTirer.current && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        setTirage(Math.min(deltaY, LIMITE_TIRER));
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!debut.current) return;
      const t = e.changedTouches[0];
      const deltaX = t.clientX - debut.current.x;
      const deltaY = t.clientY - debut.current.y;
      const horizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

      // Tirer-pour-actualiser
      if (tirage > SEUIL_TIRER) {
        setActualisation(true);
        setTirage(0);
        router.refresh();
        setTimeout(() => setActualisation(false), 700);
        debut.current = null;
        return;
      }
      setTirage(0);

      // Glissement de bord — retour arrière (depuis le bord gauche, vers la droite)
      if (horizontal && Math.abs(deltaX) > SEUIL_SWIPE) {
        if (debut.current.x < ZONE_BORD && deltaX > 0) {
          router.back();
        } else if (debut.current.x > window.innerWidth - ZONE_BORD && deltaX < 0) {
          router.forward();
        }
      }

      debut.current = null;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [router, tirage]);

  return (
    <div style={{ transform: tirage ? `translateY(${tirage * 0.5}px)` : undefined, transition: tirage ? "none" : "transform 0.2s" }}>
      {(tirage > 0 || actualisation) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-md border border-argent/25"
          style={{ top: Math.max(8, (tirage || 40) * 0.5 - 20) }}
        >
          <RefreshCw
            size={16}
            className={`text-lime-deep ${actualisation ? "animate-spin" : ""}`}
            style={!actualisation ? { transform: `rotate(${Math.min(tirage * 3, 220)}deg)` } : undefined}
          />
        </div>
      )}
      {children}
    </div>
  );
}
