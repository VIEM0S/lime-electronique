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
    setEnLigne(estEnLigne());

    // Au chargement : si des ventes attendaient déjà (app rouverte après
    // coupure), on retente tout de suite plutôt que d'attendre un événement.
    rafraichir().then((count) => {
      if (count > 0) synchroniser();
    });

    function onOnline() {
      setEnLigne(true);
      synchroniser();
    }
    function onOffline() {
      setEnLigne(false);
    }
    function onVisible() {
      if (document.visibilityState === "visible") {
        setEnLigne(estEnLigne());
        synchroniser();
      }
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    // Filet de sécurité multiplateforme : retente périodiquement tant que
    // l'onglet est ouvert, indépendamment des événements online/visibility
    // (qui peuvent tous les deux manquer à l'appel, notamment sur iOS).
    const intervalle = setInterval(() => {
      synchroniser();
    }, INTERVALLE_RETRY_MS);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(intervalle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { enLigne, pending, synchronisation, rafraichir, synchroniser };
}
