"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Clé publique VAPID — publique par nature (le pendant privé reste côté
// Edge Function, jamais exposé ici). Générée pour ce projet uniquement.
const VAPID_PUBLIC_KEY = "BP0Xgju09Dq-P9SssJLWE9f_fw2EqYSDRxsCr1fI-itFhz5JjVKO_6AlVVrbbRExg4OwSaQM5a28o4dU1z8xLZo";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Etat = "indisponible" | "inactif" | "actif" | "en_cours" | "refuse";

export default function NotificationsPush() {
  const supabase = createClient();
  const [etat, setEtat] = useState<Etat>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEtat("indisponible");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const abonnementExistant = await registration.pushManager.getSubscription();
      setEtat(abonnementExistant ? "actif" : "inactif");
    });
  }, []);

  async function activer() {
    setErreur(null);
    setEtat("en_cours");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          utilisateur_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;

      setEtat("actif");
    } catch (e: any) {
      setErreur(e?.message ?? "Impossible d'activer les notifications.");
      setEtat("inactif");
    }
  }

  async function desactiver() {
    setErreur(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEtat("inactif");
    } catch (e: any) {
      setErreur(e?.message ?? "Impossible de désactiver les notifications.");
    }
  }

  if (etat === "indisponible") return null;

  return (
    <div className="bg-white border border-argent/25 rounded-lg shadow-[0_1px_2px_rgba(8,48,120,0.05)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {etat === "actif" ? (
            <BellRing size={16} className="text-lime-deep" />
          ) : (
            <Bell size={16} className="text-ink/55" />
          )}
          <div>
            <p className="text-sm font-display font-semibold">Alertes de caisse</p>
            <p className="text-xs text-ink/55">
              {etat === "actif"
                ? "Actives — tu reçois une notification à l'ouverture/fermeture de session, surtout si l'écart est négatif."
                : etat === "refuse"
                ? "Bloquées dans les réglages de ton navigateur/téléphone — réactive-les manuellement pour recevoir les alertes."
                : "Reçois une vraie notification (même app fermée) à l'ouverture/fermeture de session."}
            </p>
          </div>
        </div>
        {etat === "actif" ? (
          <button
            onClick={desactiver}
            className="flex items-center gap-1 text-xs text-ink/62 hover:text-signal font-semibold whitespace-nowrap"
          >
            <BellOff size={13} /> Désactiver
          </button>
        ) : etat === "refuse" ? null : (
          <button
            onClick={activer}
            disabled={etat === "en_cours"}
            className="flex items-center gap-1 text-xs bg-lime-deep text-white px-3 py-1.5 rounded-md font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          >
            <Bell size={13} /> {etat === "en_cours" ? "..." : "Activer"}
          </button>
        )}
      </div>
      {erreur && <p className="text-xs text-signal mt-2">{erreur}</p>}
    </div>
  );
}
