"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  estEnLigne,
  flushQueue,
  getVentesEnAttente,
  type VenteOffline,
} from "./queue";

export function useSyncStatus() {
  const [enLigne, setEnLigne] = useState(true);
  const [pending, setPending] = useState(0);
  const [synchronisation, setSynchronisation] = useState(false);

  const rafraichir = useCallback(async () => {
    const liste = await getVentesEnAttente();
    setPending(liste.length);
  }, []);

  const synchroniser = useCallback(async () => {
    if (!estEnLigne()) return;
    setSynchronisation(true);
    const supabase = createClient();

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

    await rafraichir();
    setSynchronisation(false);
  }, [rafraichir]);

  useEffect(() => {
    setEnLigne(estEnLigne());
    rafraichir();

    function onOnline() {
      setEnLigne(true);
      synchroniser();
    }
    function onOffline() {
      setEnLigne(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { enLigne, pending, synchronisation, rafraichir, synchroniser };
}
