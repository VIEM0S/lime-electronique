-- Tests pgTAP : fn_ventes_lignes_stock + fn_annuler_vente
-- Voir supabase/tests/README.md avant de lancer ce fichier.

begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ----------------------------------------------------------------------------
-- Fixtures
-- ----------------------------------------------------------------------------
-- Un utilisateur "propriétaire" factice (profils.id référence auth.users).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'test-proprio@lime.test', 'x',
  now(), now(), now(), '{}', '{}', false
);

insert into public.profils (id, nom, role, actif)
values ('11111111-1111-1111-1111-111111111111', 'Propriétaire Test', 'proprietaire', true);

insert into public.articles (id, code_article, nom, prix_vente, quantite_stock)
values ('22222222-2222-2222-2222-222222222222', 'TST-001', 'Article Test', 1000, 5);

insert into public.clients (id, nom, telephone)
values ('55555555-5555-5555-5555-555555555555', 'Client Test', '+22300000000');

-- Ces tests portent sur les triggers eux-mêmes, exécutés ici en tant que
-- superutilisateur pgTAP (RLS bypassée) — les policies RLS ne sont pas
-- couvertes par ce fichier.

-- ----------------------------------------------------------------------------
-- 1. Une vente dans la limite du stock disponible le décrémente et journalise
--    le mouvement (FR-08, fonctionnement normal).
-- ----------------------------------------------------------------------------
insert into public.ventes (id, utilisateur_id)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');

insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 3, 1000);

select is(
  (select quantite_stock from public.articles where id = '22222222-2222-2222-2222-222222222222'),
  2,
  'Le stock est décrémenté de la quantité vendue'
);

select is(
  (select count(*)::int from public.mouvements_stock
    where article_id = '22222222-2222-2222-2222-222222222222' and type = 'sortie'),
  1,
  'Un mouvement de stock "sortie" est journalisé'
);

select is(
  (select montant_total from public.ventes where id = '33333333-3333-3333-3333-333333333333'),
  3000::numeric,
  'montant_total de la vente est recalculé (3 x 1000)'
);

-- ----------------------------------------------------------------------------
-- 2. Une vente qui dépasse le stock disponible est bloquée en mode normal
--    (FR-08 — décision produit : blocage systématique, jamais juste un avertissement).
-- ----------------------------------------------------------------------------
select throws_ok(
  $$insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
    values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 999, 1000)$$,
  'P0001',
  null,
  'Une vente qui dépasse le stock disponible est refusée en mode normal (FR-08)'
);

-- ----------------------------------------------------------------------------
-- 3. En mode synchronisation (app.sync_mode = 'true'), le même cas ne bloque
--    pas l'insertion mais marque la vente en conflit sans toucher au stock
--    (BR-08 / UC-08bis).
-- ----------------------------------------------------------------------------
insert into public.ventes (id, utilisateur_id)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');

select set_config('app.sync_mode', 'true', true);

select lives_ok(
  $$insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
    values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 999, 1000)$$,
  'En mode synchronisation, un conflit de stock ne fait pas échouer l''insertion'
);

select set_config('app.sync_mode', 'false', true);

select is(
  (select conflit_sync from public.ventes where id = '44444444-4444-4444-4444-444444444444'),
  true,
  'La vente est marquée conflit_sync = true'
);

select is(
  (select quantite_stock from public.articles where id = '22222222-2222-2222-2222-222222222222'),
  2,
  'Le stock n''est pas décrémenté pour la ligne en conflit'
);

-- ----------------------------------------------------------------------------
-- 4. Annulation de vente : le stock vendu est réincrémenté et tracé
--    (FR-30/BR-07).
-- ----------------------------------------------------------------------------
update public.ventes
set statut = 'annulee', annule_par = '11111111-1111-1111-1111-111111111111'
where id = '33333333-3333-3333-3333-333333333333';

select is(
  (select quantite_stock from public.articles where id = '22222222-2222-2222-2222-222222222222'),
  5,
  'Annuler la vente réincrémente le stock vendu'
);

select is(
  (select count(*)::int from public.mouvements_stock
    where article_id = '22222222-2222-2222-2222-222222222222'
      and type = 'entree' and motif like 'Annulation%'),
  1,
  'Un mouvement de stock "entree" trace l''annulation'
);

-- ----------------------------------------------------------------------------
-- 5. Annulation d'une vente à crédit : le solde du client est corrigé
--    (audit pré-lancement, point #2 — 006_audit_securite.sql).
-- ----------------------------------------------------------------------------
insert into public.ventes (id, client_id, utilisateur_id)
values ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111');

insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 1, 1000);

insert into public.paiements (vente_id, mode, montant)
values ('66666666-6666-6666-6666-666666666666', 'credit', 1000);

update public.ventes
set statut = 'annulee', annule_par = '11111111-1111-1111-1111-111111111111'
where id = '66666666-6666-6666-6666-666666666666';

select is(
  (select solde_du from public.clients where id = '55555555-5555-5555-5555-555555555555'),
  0::numeric,
  'Annuler une vente à crédit corrige le solde dû du client'
);

select * from finish();
rollback;
