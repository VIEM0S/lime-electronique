// Service worker minimal — PAS un vrai "offline-first" complet.
//
// Ce que ça fait : toute page/requête GET déjà visitée avec succès est mise
// en cache. Si le réseau tombe ensuite, un rechargement ou une navigation
// vers un écran déjà visité renvoie la version en cache au lieu d'un écran
// blanc. Les créations de vente hors-ligne restent gérées séparément par
// la file IndexedDB (src/lib/offline/queue.ts) — ça, c'est indépendant.
//
// Ce que ça NE fait PAS : précharger l'app entière à l'installation, ni
// garantir qu'un écran jamais visité soit disponible hors-ligne. Une vraie
// PWA offline-first avec Next.js App Router (Server Components) demande une
// architecture différente (routes client-only, précache du build) — à
// prévoir comme chantier séparé si le besoin devient critique.

const CACHE_NAME = "lime-electronique-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ne touche qu'aux GET same-origin ; le reste (API POST/PATCH, requêtes
  // Supabase vers un autre domaine) passe directement au réseau.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copie = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copie));
        return res;
      })
      .catch(async () => {
        const enCache = await caches.match(req);
        if (enCache) return enCache;
        // Dernier recours : rien en cache pour cette page précise.
        return new Response(
          "<html><body style='font-family:sans-serif;padding:2rem;text-align:center;'>" +
            "<h2>Pas de connexion</h2><p>Cette page n'a pas encore été visitée en ligne, " +
            "elle n'est donc pas disponible hors-ligne pour le moment.</p></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
        );
      })
  );
});

// ----------------------------------------------------------------------------
// Notifications push (alertes ouverture/fermeture de session de caisse).
// Le payload est du JSON envoyé par l'Edge Function `notifier-session-caisse` :
// { title, body, url, urgent }
// ----------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = { title: "Lime-électronique", body: "Nouvelle alerte.", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // payload non-JSON — on garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
      requireInteraction: !!data.urgent,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
