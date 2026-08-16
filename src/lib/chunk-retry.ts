// Après un redéploiement, un utilisateur resté ouvert (PWA gardée en arrière-
// plan toute la journée par un caissier) peut naviguer vers une page dont le
// chunk JS n'existe plus côté serveur (ancien hash de build supprimé) →
// erreur au lieu d'une navigation. Détecte ce cas précis et force un
// rechargement complet une fois — le flag sessionStorage évite une boucle
// infinie si le rechargement lui-même échoue pour une autre raison (panne
// réseau réelle, par exemple).
const CLE_SESSION = "lime:chunk-retry-tente";

export function estErreurChunkCasse(erreur: unknown): boolean {
  const message = erreur instanceof Error ? `${erreur.name} ${erreur.message}` : String(erreur ?? "");
  return /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
    message
  );
}

export function tenterRechargementUnique(): boolean {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(CLE_SESSION)) return false;
  sessionStorage.setItem(CLE_SESSION, "1");
  window.location.reload();
  return true;
}
