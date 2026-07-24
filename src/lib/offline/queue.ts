"use client";

// File d'attente hors-ligne (FR-25/26/27, cf. SSD UC-08).
//
// Implémentation MVP : les ventes créées hors-ligne sont stockées dans
// IndexedDB (via idb-keyval) avec un id_local (uuid) et un numéro
// d'affichage provisoire "FACT-EN ATTENTE-xxxx" (jamais un numéro définitif
// — cf. FR-27bis / SSD UC-10, seul le serveur attribue le numéro final).
//
// Au retour réseau, flushQueue() rejoue les ventes dans l'ordre de création.
// Ce qui N'EST PAS encore couvert (à faire en phase suivante) :
//   - Résolution de conflit de stock (SSD UC-08bis) : si le stock serveur est
//     devenu insuffisant entre-temps, l'insert échoue et la vente reste dans
//     la file en erreur plutôt que d'être marquée "en conflit" en base —
//     il faut la RPC dédiée `synchroniser_ventes_en_attente` mentionnée dans
//     schema.sql pour aller plus loin.
//   - Paiements/remboursements/approvisionnements hors-ligne (le type
//     PendingAction les prévoit, mais seul le flux "vente" est câblé ici).

import { get, set, del, keys } from "idb-keyval";

const PREFIX = "lime:pending:";

export interface LigneVenteOffline {
  article_id: string;
  quantite: number;
  prix_unitaire: number;
}

export interface PaiementOffline {
  mode: "especes" | "mobile_money" | "virement" | "credit";
  montant: number;
}

export interface VenteOffline {
  id: string; // id local (uuid)
  type: "vente";
  client_id: string | null;
  lignes: LigneVenteOffline[];
  paiements: PaiementOffline[];
  createdAt: string;
  numeroProvisoire: string; // "FACT-EN ATTENTE-xxxx"
}

function numeroProvisoire(): string {
  return `FACT-EN ATTENTE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function estEnLigne(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export async function mettreEnFileVente(
  input: Omit<VenteOffline, "id" | "type" | "createdAt" | "numeroProvisoire">
): Promise<VenteOffline> {
  const action: VenteOffline = {
    ...input,
    id: crypto.randomUUID(),
    type: "vente",
    createdAt: new Date().toISOString(),
    numeroProvisoire: numeroProvisoire(),
  };
  await set(PREFIX + action.id, action);
  return action;
}

export async function getVentesEnAttente(): Promise<VenteOffline[]> {
  const all = await keys();
  const nosClefs = all.filter((k) => typeof k === "string" && k.startsWith(PREFIX));
  const actions = await Promise.all(nosClefs.map((k) => get(k as string)));
  return (actions.filter(Boolean) as VenteOffline[]).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

export async function retirerDeLaFile(id: string): Promise<void> {
  await del(PREFIX + id);
}

/**
 * Rejoue les ventes en attente vers Supabase, dans l'ordre de création.
 * S'arrête à la première erreur (ex. perte de connexion en cours de route)
 * pour ne pas désynchroniser l'ordre — sera relancé au prochain retour réseau.
 */
export async function flushQueue(
  envoyerVente: (v: VenteOffline) => Promise<{ ok: boolean; erreur?: string }>
): Promise<{ envoyees: number; restantes: number }> {
  const enAttente = await getVentesEnAttente();
  let envoyees = 0;

  for (const vente of enAttente) {
    const resultat = await envoyerVente(vente);
    if (!resultat.ok) break;
    await retirerDeLaFile(vente.id);
    envoyees++;
  }

  const restantes = (await getVentesEnAttente()).length;
  return { envoyees, restantes };
}
