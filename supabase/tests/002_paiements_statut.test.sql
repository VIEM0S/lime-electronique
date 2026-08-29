-- Tests pgTAP : fn_apres_paiement
-- Voir supabase/tests/README.md avant de lancer ce fichier.

begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'test-caisse@lime.test', 'x',
  now(), now(), now(), '{}', '{}', false
);

insert into public.profils (id, nom, role, actif)
values ('11111111-1111-1111-1111-111111111111', 'Caissier Test', 'caisse', true);

insert into public.articles (id, code_article, nom, prix_vente, quantite_stock)
values ('22222222-2222-2222-2222-222222222222', 'TST-001', 'Article Test', 1000, 100);

insert into public.clients (id, nom, telephone)
values ('55555555-5555-5555-5555-555555555555', 'Client Test', '+22300000000');

-- ----------------------------------------------------------------------------
-- 1. Seuils de statut (BR-03bis) : impayée / partielle / payée
-- ----------------------------------------------------------------------------
insert into public.ventes (id, utilisateur_id)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');
insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 10, 1000);
-- montant_total = 10000, aucun paiement encore

select is(
  (select statut from public.ventes where id = '33333333-3333-3333-3333-333333333333'),
  'impayee',
  'Une vente sans paiement est "impayee"'
);

insert into public.paiements (vente_id, mode, montant)
values ('33333333-3333-3333-3333-333333333333', 'especes', 4000);

select is(
  (select statut from public.ventes where id = '33333333-3333-3333-3333-333333333333'),
  'partielle',
  'Un paiement partiel (4000/10000) passe le statut à "partielle"'
);

insert into public.paiements (vente_id, mode, montant)
values ('33333333-3333-3333-3333-333333333333', 'especes', 6000);

select is(
  (select statut from public.ventes where id = '33333333-3333-3333-3333-333333333333'),
  'payee',
  'Le solde du paiement complet (4000+6000=10000) passe le statut à "payee"'
);

-- ----------------------------------------------------------------------------
-- 2. Un paiement en mode crédit sans client rattaché à la vente est refusé
--    (BR-06 / audit pré-lancement point #2 — pas de crédit orphelin).
-- ----------------------------------------------------------------------------
insert into public.ventes (id, utilisateur_id)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');
insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 1, 1000);

select throws_ok(
  $$insert into public.paiements (vente_id, mode, montant)
    values ('44444444-4444-4444-4444-444444444444', 'credit', 1000)$$,
  'P0001',
  null,
  'Un paiement à crédit sans client sur la vente est refusé (BR-06)'
);

-- ----------------------------------------------------------------------------
-- 3. Un paiement en mode crédit avec client augmente bien son solde dû.
-- ----------------------------------------------------------------------------
insert into public.ventes (id, client_id, utilisateur_id)
values ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111');
insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 2, 1000);
insert into public.paiements (vente_id, mode, montant)
values ('66666666-6666-6666-6666-666666666666', 'credit', 2000);

select is(
  (select solde_du from public.clients where id = '55555555-5555-5555-5555-555555555555'),
  2000::numeric,
  'Un paiement à crédit avec client augmente son solde dû'
);

select * from finish();
rollback;
