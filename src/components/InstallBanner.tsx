"use client";

// Bannière "installer l'app" — distincte de UpdateBanner.tsx (deux moments
// différents : proposer l'installation la première fois vs signaler une
// nouvelle version disponible plus tard). Ne s'affiche que si le navigateur
// a réellement proposé l'installation (`beforeinstallprompt`, Chrome/Edge/
// Android — pas Safari iOS, qui n'a pas cette API) et si l'app ne tourne pas
// déjà en mode standalone (déjà installée).
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import Button from "@/components/ui/Button";

const CLE_REPORT = "lime:install-banner-masque-jusqu-a";
const DELAI_AFFICHAGE_MS = 4000;
const REPORT_JOURS = 14;

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function dejaEnModeStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari iOS (pas de beforeinstallprompt, mais expose ce flag une fois
    // l'app ajoutée à l'écran d'accueil).
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export default function InstallBanner() {
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (dejaEnModeStandalone()) return;

    const masqueJusqua = Number(localStorage.getItem(CLE_REPORT) ?? 0);
    if (Date.now() < masqueJusqua) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setEvenement(e as EvenementInstallation);
      const timeoutId = setTimeout(() => setVisible(true), DELAI_AFFICHAGE_MS);
      return () => clearTimeout(timeoutId);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    await evenement.userChoice;
    setVisible(false);
    setEvenement(null);
  }

  function plusTard() {
    localStorage.setItem(CLE_REPORT, String(Date.now() + REPORT_JOURS * 24 * 60 * 60 * 1000));
    setVisible(false);
  }

  if (!visible || !evenement) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-80 z-50 bg-white border border-argent/25 rounded-lg shadow-card-hover-lg p-3.5 flex items-start gap-3">
      <div className="w-9 h-9 rounded-md bg-lime/10 text-lime-deep flex items-center justify-center shrink-0">
        <Download size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-semibold text-ink">Installer Lime-électronique</p>
        <p className="text-[11px] text-ink/55 mt-0.5">
          {"Accès plus rapide depuis l'écran d'accueil, comme une vraie application."}
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={installer}>
            Installer
          </Button>
          <Button size="sm" variant="ghost" onClick={plusTard}>
            Plus tard
          </Button>
        </div>
      </div>
      <button onClick={plusTard} aria-label="Fermer" className="text-ink/40 hover:text-ink/70 shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
