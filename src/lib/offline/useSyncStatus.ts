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
// part. On vérifie donc activement en tentant de joindre Supabase, avec un
// délai court pour ne jamais bloquer l'interface.
async function verifierConnexionReelle(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return navigator.onLine;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    await fetch(`${url}/auth/v1/health`, {
      method: "GET",
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
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: venteCreee, error: erreurVente } = await supabase
          .from("ventes")
          .insert({ client_id: vente.client_id, utilisateur_id: user?.id ?? null })
          .select()
          .single();
        if (erreurVente || !venteCreee) return { ok: false, erreur: erreurVente?.message };

        for (const l of vente.lignes) {
          const { error } = await supabase.from("ventes_lignes").insert({
            vente_id: venteCreee.id,
            article_id: l.article_id,
            quantite: l.quantite,
            prix_unitaire: l.prix_unitaire,
          });
          if (error) return { ok: false, erreur: error.message };
        }

        for (const p of vente.paiements) {
          if (p.montant > 0) {
            const { error } = await supabase
              .from("paiements")
              .insert({ vente_id: venteCreee.id, mode: p.mode, montant: p.montant });
            if (error) return { ok: false, erreur: error.message };
          }
        }

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
