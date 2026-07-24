// STUB — file d'attente hors-ligne (FR-25/26/27, cf. SSD UC-08 et UC-08bis)
//
// À implémenter (phase "Mode hors-ligne & PWA" du plan de réalisation) :
//   - Détection de connexion (window.addEventListener('online'/'offline'))
//   - Stockage local des actions en attente (IndexedDB, ex. via idb-keyval)
//   - Une vente créée hors-ligne obtient un id_local (uuid) + libellé
//     provisoire "FACT-EN ATTENTE-xxxx" (JAMAIS un numero_facture définitif,
//     cf. FR-27bis et SSD UC-10 — le serveur seul attribue le numéro final)
//   - Au retour réseau : rejouer les actions en attente dans l'ordre,
//     gérer le cas de conflit de stock (cf. SSD UC-08bis) en marquant la
//     vente concernée "en conflit" plutôt qu'en forçant un stock négatif
//   - Exposer un hook React (ex. useSyncStatus()) consommé par <SyncBar />
//     pour piloter le bandeau de synchronisation de la maquette.

export interface PendingAction {
  id: string; // id local (uuid), généré côté client
  type: "vente" | "paiement" | "remboursement" | "approvisionnement";
  payload: unknown;
  createdAt: string;
}

export async function queueAction(_action: PendingAction): Promise<void> {
  throw new Error("TODO: queueAction — à implémenter avec IndexedDB (phase hors-ligne)");
}

export async function getPendingActions(): Promise<PendingAction[]> {
  return [];
}

export async function flushQueue(): Promise<void> {
  // IMPORTANT (cf. supabase/schema.sql, fn_ventes_lignes_stock, BR-08/UC-08bis) :
  // avant de rejouer les ventes en attente ici, positionner explicitement le
  // paramètre de session Postgres app.sync_mode à 'true' pour CETTE requête
  // uniquement — jamais en dehors de ce contexte de réconciliation, sinon
  // FR-08 (blocage strict en temps réel) ne s'appliquerait plus normalement.
  // Exemple (via une fonction RPC dédiée, pas directement depuis le client) :
  //   await supabase.rpc('synchroniser_ventes_en_attente', { ventes: [...] })
  //   -- côté SQL : set local app.sync_mode = 'true'; puis les inserts.
  // Sans RPC, chaque insert doit passer par une Route Handler serveur qui
  // exécute `set local app.sync_mode = 'true';` dans la même transaction.
  throw new Error("TODO: flushQueue — envoi séquentiel au serveur au retour réseau");
}
