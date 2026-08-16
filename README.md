# Lime-électronique — Système de gestion

Application de gestion pour un commerce d'électronique : caisse, stock,
clients/créances, approvisionnement. Next.js (App Router) + Supabase
(Postgres/Auth/RLS). **En production, utilisée par le client réel** depuis
fin juillet 2026. Instance indépendante — pas de couplage avec la
plateforme Kafora/ALPHA (architecture réutilisée, base de données propre).

## Mise en route

### 1. Créer le projet Supabase
1. Créer un nouveau projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter le contenu de `supabase/schema.sql`,
   puis chaque fichier de `supabase/fixes/`, **dans l'ordre numéroté**
   (001, 002, ... — chacun documente en tête de fichier ce qu'il corrige et
   pourquoi). `schema.sql` seul ne reflète que l'état initial du projet ;
   les fixes contiennent l'historique cumulé des correctifs appliqués en
   production depuis.
3. Créer les deux premiers comptes via **Authentication → Users → Add user**
   (email + mot de passe), un pour le propriétaire et un pour le vendeur/caisse.
4. Pour chacun, récupérer son `id` (colonne `id` de la table `auth.users`) et
   l'insérer dans `public.profils` :
   ```sql
   insert into public.profils (id, nom, role)
   values ('<uuid>', 'Propriétaire Lime-électronique', 'proprietaire');

   insert into public.profils (id, nom, role)
   values ('<uuid>', 'Vendeur caisse', 'caisse');
   ```

### 2. Configurer l'environnement local
```bash
cp .env.example .env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
# (Project Settings → API, dans Supabase)
```

### 3. Installer et lancer
```bash
npm install
npm run dev
```
Ouvrir http://localhost:3000/login et se connecter avec l'un des deux comptes créés.

## Fonctionnalités

- **Authentification** (Supabase Auth) + redirection selon session
  (`middleware.ts`), mot de passe oublié/réinitialisation par email.
- **Layout applicatif** avec navigation qui s'adapte au rôle (`propriétaire`
  voit tout, `caisse` ne voit que Caisse/Vente et Session de caisse).
- **Tableau de bord** : KPIs réels (ventes du jour, créances, stock faible),
  graphique des ventes sur 7 jours, alerte des ventes en conflit de
  synchronisation (BR-08).
- **Catalogue** : CRUD articles, historique des mouvements de stock,
  correction de stock tracée (motif + mouvement journalisé).
- **Clients & créances** : CRUD clients, solde dû, limite de crédit,
  enregistrement des remboursements.
- **Approvisionnement** : saisie des arrivages avec recherche d'article,
  historique, lecture du prix de revient.
- **Utilisateurs** (propriétaire uniquement) : création/modification/
  désactivation/réinitialisation de mot de passe — via Route Handlers
  serveur (`src/app/api/utilisateurs/`) qui utilisent l'API Admin Supabase
  (clé `service_role`, jamais exposée au navigateur).
- **Caisse** : recherche d'article, paiements multiples (espèces / Mobile
  Money / virement / crédit), client optionnel ou nom libre pour vente
  comptant, validation qui insère réellement la vente dans Supabase et
  remonte les erreurs serveur (ex. stock insuffisant, FR-08).
- **Ventes récentes / Factures** : liste avec badges de statut
  (payée/partielle/impayée/annulée) et badge "en conflit" (BR-08) ; le
  propriétaire peut annuler une vente avec motif obligatoire (FR-30/UC-09,
  réincrémente le stock via trigger). Facture/reçu exportables en image
  (partage WhatsApp).
- **Session de caisse** (FR-31/32/UC-11) : ouverture avec fonds initial
  déclaré, fermeture avec calcul automatique du montant théorique et de
  l'écart (espèces réellement encaissées pendant la session, ventes
  annulées exclues), historique des sessions fermées, commentaire optionnel
  à la fermeture, notifications push à l'ouverture/fermeture.
- **Mode hors-ligne** (FR-25/26/27, SSD UC-08) : file d'attente locale
  (IndexedDB) pour les ventes créées sans réseau, numéro de facture
  provisoire (jamais généré côté client), rejeu automatique au retour
  réseau via une RPC serveur dédiée qui gère aussi le conflit de stock
  (UC-08bis, BR-08 — cf. `src/lib/offline/`).
- **PWA** : manifest + service worker, gestes tactiles (retour/avance par
  les bords, tirer pour actualiser), notifications push.

## Décisions techniques actées (voir SRS/SSD pour le détail)

- **FR-08** : blocage systématique (pas juste un avertissement), en ligne
  comme hors-ligne — implémenté côté base via le trigger
  `fn_ventes_lignes_stock` (`supabase/schema.sql`).
- **FR-10/FR-27bis** : le numéro de facture n'est **jamais** généré côté
  client — uniquement par la séquence Postgres au moment de l'insertion
  réelle en base, ce qui élimine tout risque de collision multi-appareils.
- **FR-30/BR-07** : annulation de vente réservée au propriétaire (policy RLS
  `proprietaire_annule_ventes`), immuable ensuite, réincrémente le stock et
  corrige le solde crédit du client si applicable.
- **FR-31/FR-32** : session de caisse — un seul index unique partiel empêche
  qu'un même utilisateur ait deux sessions ouvertes simultanément.
- **BR-08/UC-08bis** : en mode synchronisation (`app.sync_mode = 'true'`,
  positionné uniquement par la RPC `synchroniser_vente_hors_ligne`), un
  stock insuffisant marque la vente `conflit_sync = true` au lieu de
  bloquer l'insertion — à ne jamais activer hors de ce contexte précis.
- **Mobile Money** : saisie déclarative uniquement, aucune intégration API prévue.
- **BR-06** : le mode crédit est refusé côté base (et vérifié côté formulaire)
  si aucun client n'est sélectionné.

## Sécurité

Un audit pré-lancement a été mené le 30/07/2026
(`supabase/fixes/006_audit_securite.sql`) et complété le 16/08/2026
(`supabase/fixes/008_lockdown_fonctions_ajout_stock.sql`). Deux points
restent à faire manuellement dans le Dashboard Supabase (pas de SQL
possible) :
- **Authentication → Policies/Password → activer "Leaked password
  protection"**.
- Déplacer l'extension `pg_net` hors du schéma `public` (cosmétique,
  volontairement laissé tel quel pour ne pas risquer de casser le trigger
  de notification de session de caisse qui l'utilise — voir le fix 006
  pour le détail du compromis).

## Tests

`supabase/tests/` contient des tests pgTAP pour les triggers SQL critiques
(stock, annulation de vente, écart de caisse) — voir
`supabase/tests/README.md` pour les lancer. Pas de tests automatisés côté
frontend pour l'instant.

## Ce qu'il reste à faire

- **Mode hors-ligne** : seul le flux "vente" est câblé (le type
  `PendingAction` prévoit aussi paiements/remboursements/arrivages hors
  ligne, mais ce n'est pas encore implémenté) — cf. commentaires dans
  `src/lib/offline/queue.ts`.
- Pas de tests automatisés côté frontend (composants React).
