-- Tests pgTAP : fn_fermer_session_caisse
-- Voir supabase/tests/README.md avant de lancer ce fichier.
--
-- Ce fichier suppose que supabase/fixes/007_fix_ecart_ventes_annulees.sql a
-- déjà été appliqué (la version de fn_fermer_session_caisse dans
-- schema.sql seul compte encore, à tort, l'argent des ventes annulées).

begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

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

-- Session ouverte avec 5000 de fonds initial.
insert into public.sessions_caisse (id, utilisateur_id, montant_ouverture, date_ouverture)
values ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 5000, now() - interval '2 hours');

-- Vente en espèces payée intégralement pendant la session : 3000.
insert into public.ventes (id, utilisateur_id)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');
insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 3, 1000);
insert into public.paiements (vente_id, mode, montant)
values ('33333333-3333-3333-3333-333333333333', 'especes', 3000);

-- Vente en espèces ANNULÉE pendant la session : 2000 — ne doit PAS compter
-- dans le montant théorique (fix 007, sinon on accuserait un faux manque de caisse).
insert into public.ventes (id, utilisateur_id)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');
insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 2, 1000);
insert into public.paiements (vente_id, mode, montant)
values ('44444444-4444-4444-4444-444444444444', 'especes', 2000);
update public.ventes set statut = 'annulee', annule_par = '11111111-1111-1111-1111-111111111111'
where id = '44444444-4444-4444-4444-444444444444';

-- Fermeture : le caissier compte 8000 dans le tiroir (5000 fonds + 3000 réel,
-- il n'a évidemment pas les 2000 de la vente annulée).
update public.sessions_caisse
set statut = 'fermee', montant_fermeture_declare = 8000, date_fermeture = now()
where id = '77777777-7777-7777-7777-777777777777';

select is(
  (select montant_theorique from public.sessions_caisse where id = '77777777-7777-7777-7777-777777777777'),
  8000::numeric,
  'montant_theorique exclut les espèces d''une vente annulée (5000 fonds + 3000 vente valide, pas +2000)'
);

select is(
  (select ecart from public.sessions_caisse where id = '77777777-7777-7777-7777-777777777777'),
  0::numeric,
  'La caisse est juste (écart = 0) une fois la vente annulée exclue du calcul'
);

-- ----------------------------------------------------------------------------
-- Cas d'écart réel : le caissier déclare moins que le théorique -> écart négatif.
-- ----------------------------------------------------------------------------
insert into public.sessions_caisse (id, utilisateur_id, montant_ouverture, date_ouverture)
values ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 5000, now() - interval '1 hour');

insert into public.ventes (id, utilisateur_id)
values ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111');
insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
values ('99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222', 1, 1000);
insert into public.paiements (vente_id, mode, montant)
values ('99999999-9999-9999-9999-999999999999', 'especes', 1000);

-- Théorique attendu : 5000 + 1000 = 6000. Le caissier ne déclare que 5800.
update public.sessions_caisse
set statut = 'fermee', montant_fermeture_declare = 5800, date_fermeture = now()
where id = '88888888-8888-8888-8888-888888888888';

select is(
  (select montant_theorique from public.sessions_caisse where id = '88888888-8888-8888-8888-888888888888'),
  6000::numeric,
  'montant_theorique = fonds initial + espèces encaissées pendant la session'
);

select is(
  (select ecart from public.sessions_caisse where id = '88888888-8888-8888-8888-888888888888'),
  -200::numeric,
  'Un manque en caisse (déclaré < théorique) donne un écart négatif'
);

select * from finish();
rollback;
