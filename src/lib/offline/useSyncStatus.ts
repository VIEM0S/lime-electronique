"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  estEnLigne,
  flushQueue,
  getVentesEnAttente,
  type VenteOffline,
} from "./queue";

// Safari iOS ne déclenche quasiment jamais l'événement "online" de façon
// fiable (pas d'API de Background Sync sur iOS, et le navigateur peut
// suspendre l'onglet). On ne peut donc pas se contenter d'écouter cet
// événement : on retente aussi (a) quand l'app redevient visible/active,
// et (b) à intervalle régulier tant qu'il y a des ventes en attente —
// c'est la seule approche fiable multiplateforme pour ce cas d'usage.
const INTERVALLE_RETRY_MS = 20_000;

// `navigator.onLine` dit seulement "une interface réseau existe" (WiFi
// connecté), pas "le serveur est vraiment joignable" — au Mali une connexion
// instable peut rester "en ligne" pour le téléphone tout en ne menant nulle
// part. On vérifie donc activement en tentant une requête réseau, avec un
// délai court pour ne jamais bloquer l'interface.
//
// NB : on ping notre propre domaine (favicon.ico) plutôt que Supabase
// directement. Un fetch brut vers l'API Supabase (ex: /auth/v1/health)
// sans header `apikey` renvoie un 401 — inoffensif ici puisqu'on ne teste
// que la réussite du fetch, pas le status code, mais ça polluait inutilement
// la console et l'onglet Réseau, et faisait dépendre la détection réseau
// d'un service tiers qu'on n'a pas besoin d'interroger juste pour savoir si
// le téléphone a une connexion qui aboutit.
async function verifierConnexionReelle(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    await fetch("/favicon.ico", {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export function useSyncStatus() {
  const [enLigne, setEnLigne] = useState(true);
  const [pending, setPending] = useState(0);
  const [synchronisation, setSynchronisation] = useState(false);
  const synchronisationEnCours = useRef(false);

  const rafraichir = useCallback(async () => {
    const liste = await getVentesEnAttente();
    setPending(liste.length);
    return liste.length;
  }, []);

  const synchroniser = useCallback(async () => {
    if (!estEnLigne() || synchronisationEnCours.current) return;
    synchronisationEnCours.current = true;
    setSynchronisation(true);
    const supabase = createClient();

    try {
      await flushQueue(async (vente: VenteOffline) => {
        // RPC serveur dédiée (plutôt que les 3 inserts directs utilisés en
        // ligne) : elle positionne `app.sync_mode = 'true'` pour toute la
        // transaction, ce qui permet à fn_ventes_lignes_stock de marquer la
        // vente `conflit_sync = true` (BR-08) si le stock est devenu
        // insuffisant entre-temps, au lieu de faire échouer toute la
        // synchronisation et de bloquer la vente indéfiniment dans la file.
        const { error } = await supabase.rpc("synchroniser_vente_hors_ligne", {
          p_client_id: vente.client_id,
          p_nom_client_comptant: vente.nom_client_comptant,
          p_lignes: vente.lignes,
          p_paiements: vente.paiements,
        });
        if (error) return { ok: false, erreur: error.message };

        return { ok: true };
      });
    } finally {
      await rafraichir();
      setSynchronisation(false);
      synchronisationEnCours.current = false;
    }
  }, [rafraichir]);

  useEffect(() => {
    let annule = false;

    async function verifierEtMettreAJour() {
      const reel = await verifierConnexionReelle();
      if (!annule) setEnLigne(reel);
      return reel;
    }

    // Au chargement : vérifie vraiment (pas juste navigator.onLine), et si
    // des ventes attendaient déjà (app rouverte après coupure), retente
    // tout de suite plutôt que d'attendre un événement.
    verifierEtMettreAJour().then((enLigneReel) => {
      rafraichir().then((count) => {
        if (count > 0 && enLigneReel) synchroniser();
      });
    });

    function onOnline() {
      verifierEtMettreAJour().then((reel) => {
        if (reel) synchroniser();
      });
    }
    function onOffline() {
      setEnLigne(false);
    }
    function onVisible() {
      if (document.visibilityState === "visible") {
        verifierEtMettreAJour().then((reel) => {
          if (reel) synchroniser();
        });
      }
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    // Filet de sécurité multiplateforme : revérifie vraiment la connexion à
    // intervalle régulier, indépendamment des événements online/visibility
    // (qui peuvent tous les deux manquer à l'appel, notamment sur iOS) —
    // et retente la synchronisation si on est réellement en ligne.
    const intervalle = setInterval(() => {
      verifierEtMettreAJour().then((reel) => {
        if (reel) synchroniser();
      });
    }, INTERVALLE_RETRY_MS);

    return () => {
      annule = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(intervalle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { enLigne, pending, synchronisation, rafraichir, synchroniser };
}
