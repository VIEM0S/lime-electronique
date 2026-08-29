# Tests SQL (pgTAP)

Tests unitaires des triggers PL/pgSQL les plus critiques (argent réel, stock
réel) : décrément/blocage de stock, annulation de vente, écart de caisse.

## ⚠️ Ne jamais exécuter sur la base de production

Ces tests insèrent des lignes dans `auth.users`, `profils`, `articles`,
`clients`, `ventes`... et font `rollback` à la fin, mais un test qui plante
avant le `rollback` peut laisser des données de test dans la base. À lancer
uniquement en local ou sur une branche de développement Supabase (nécessite
le plan Pro — pas disponible sur ce projet au moment de l'écriture, cf.
`supabase/fixes/`).

## Prérequis

- [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker (pour
  `supabase start` / `supabase test db` en local), **ou**
- une branche de développement Supabase (plan Pro).

## Lancer les tests en local

Le projet ne stocke pas ses changements de schéma en migrations Supabase
classiques (`supabase/migrations/`) — `supabase/schema.sql` est l'état
initial et `supabase/fixes/*.sql` sont les correctifs appliqués depuis, dans
l'ordre numéroté (cf. `supabase/fixes/`). Il faut donc les rejouer
manuellement dans une instance locale avant de lancer les tests :

```bash
supabase init     # une seule fois si le projet n'a pas encore de config.toml
supabase start    # démarre Postgres + services Supabase en local (Docker)

# Applique le schéma puis chaque correctif, dans l'ordre :
supabase db execute -f supabase/schema.sql
for f in supabase/fixes/*.sql; do supabase db execute -f "$f"; done

supabase test db  # exécute tous les *.test.sql de ce dossier via pgTAP
```

`supabase test db` exécute automatiquement tous les fichiers `*.test.sql` de
ce dossier via pgTAP et affiche un rapport TAP.

## Contenu

| Fichier | Couvre |
|---|---|
| `001_stock_ventes.test.sql` | `fn_ventes_lignes_stock` (décrément, blocage FR-08, conflit BR-08 en mode sync), `fn_annuler_vente` (réincrément stock + correction solde crédit, audit 006 point #2) |
| `002_paiements_statut.test.sql` | `fn_apres_paiement` (seuils impayée/partielle/payée, refus crédit sans client — BR-06/audit point #2) |
| `003_session_caisse_ecart.test.sql` | `fn_fermer_session_caisse` (calcul de l'écart, exclusion des ventes annulées — fix 007) |
