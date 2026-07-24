# Lime-électronique — Système de gestion

Scaffold Next.js (App Router) + Supabase, correspondant au SRS, SSD, maquette et
schéma SQL déjà livrés. Instance indépendante — pas de couplage avec la
plateforme Kafora/ALPHA (architecture réutilisée, base de données propre).

## Mise en route

### 1. Créer le projet Supabase
1. Créer un nouveau projet sur [supabase.com](https://supabase.com).
2. Dans l'éditeur SQL du projet, exécuter le contenu de `supabase/schema.sql`
   (tables, triggers, RLS, vues, données d'exemple).
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

## Ce qui est déjà fonctionnel

- Authentification (Supabase Auth) + redirection selon session (`middleware.ts`)
- Layout applicatif avec navigation qui s'adapte au rôle (`propriétaire` voit
  tout, `caisse` ne voit que Caisse/Vente et Session de caisse)
- **Tableau de bord** : KPIs réels (ventes du jour, créances, stock faible),
  et alerte des ventes en conflit de synchronisation (BR-08)
- **Catalogue** : liste des articles + historique des mouvements de stock (lecture)
- **Clients & créances** : liste avec solde dû (lecture)
- **Approvisionnement** : historique des arrivages (lecture)
- **Utilisateurs** : liste avec rôle et statut (lecture)
- **Caisse** : formulaire complet et fonctionnel — recherche d'article,
  ajout de lignes, sélection du client, paiements multiples (espèces / Mobile
  Money / virement / crédit), validation qui insère réellement la vente dans
  Supabase et remonte les erreurs du serveur (ex. stock insuffisant, FR-08)
- **Ventes récentes (écran Caisse)** : liste des dernières ventes avec badges
  de statut (payée/partielle/impayée/**annulée**) et badge "en conflit"
  (BR-08) ; le propriétaire peut **annuler une vente** avec motif obligatoire
  (FR-30/UC-09) — la réincrémentation du stock est gérée par le trigger SQL
- **Session de caisse** (nouveau, FR-31/32/UC-11) : ouverture avec fonds
  initial déclaré, fermeture avec calcul automatique du montant théorique et
  de l'écart, historique des sessions fermées

## Ce qu'il reste à faire (TODO explicitement marqués dans le code)

Cherchez `TODO` dans le code pour la liste précise. En résumé :

| Zone | Fichier | Ce qui manque |
|---|---|---|
| Mode hors-ligne | `src/lib/offline/queue.ts` | File d'attente IndexedDB, détection connexion, rejeu au retour réseau (FR-25/26/27, SSD UC-08/UC-08bis/UC-10). Le rejeu doit passer par une Route Handler/RPC serveur qui positionne `set local app.sync_mode = 'true'` (cf. commentaire dans le fichier et `supabase/schema.sql`) |
| Facture PDF | `src/app/(app)/caisse/CaisseForm.tsx` | Génération réelle du PDF (FR-14), ex. avec `@react-pdf/renderer` |
| Création/édition d'articles | `src/app/(app)/catalogue/page.tsx` | Formulaire (FR-01/02) |
| Formulaire d'arrivage | `src/app/(app)/approvisionnement/page.tsx` | Saisie réelle (FR-19/20), lecture de `vue_prix_revient` (FR-21) |
| Paiement sur créance | `src/app/(app)/clients/page.tsx` | Formulaire d'enregistrement (FR-17) -> insert dans `remboursements_credit` |
| Gestion des comptes | `src/app/(app)/utilisateurs/page.tsx` | Créer/modifier/désactiver/réinitialiser (FR-22 à FR-22quater) — nécessite l'API Admin de Supabase Auth (à appeler depuis une Route Handler serveur, jamais depuis le client) |
| Graphique ventes 7 jours | `src/app/(app)/dashboard/page.tsx` | FR-29, ex. avec `recharts` |
| PWA / Service Worker | `public/manifest.json` | Actuellement un manifest minimal ; ajouter un service worker (ex. `next-pwa`) pour le vrai fonctionnement hors-ligne |

## Décisions techniques déjà actées (voir SRS/SSD pour le détail)

- **FR-08** : blocage systématique (pas juste un avertissement), en ligne
  comme hors-ligne — implémenté côté base via le trigger
  `fn_ventes_lignes_stock` (`supabase/schema.sql`).
- **FR-10/FR-27bis** : le numéro de facture n'est **jamais** généré côté
  client — uniquement par la séquence Postgres au moment de l'insertion
  réelle en base, ce qui élimine tout risque de collision multi-appareils.
- **FR-30/BR-07** : annulation de vente réservée au propriétaire (policy RLS
  `proprietaire_annule_ventes`), immuable ensuite, réincrémente le stock.
- **FR-31/FR-32** : session de caisse — un seul index unique partiel empêche
  qu'un même utilisateur ait deux sessions ouvertes simultanément.
- **BR-08/UC-08bis** : en mode synchronisation (`app.sync_mode = 'true'`), un
  stock insuffisant marque la vente `conflit_sync = true` au lieu de bloquer
  l'insertion — à ne jamais activer hors de ce contexte précis.
- **Mobile Money** : saisie déclarative uniquement, aucune intégration API prévue.
- **BR-06** : le mode crédit est refusé côté base (et vérifié côté formulaire)
  si aucun client n'est sélectionné.
