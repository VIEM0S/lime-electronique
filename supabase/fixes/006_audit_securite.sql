-- ============================================================================
-- FIX 006 — Corrections de l'audit de sécurité pré-lancement (30/07/2026)
-- ============================================================================
-- Déjà appliqué en direct sur la base de production. Ce fichier documente
-- ce qui a été fait, pour que le repo reste la source de vérité.

-- ----------------------------------------------------------------------------
-- 1. BLOQUANT — vue_credits_clients accessible publiquement sans compte
-- ----------------------------------------------------------------------------
-- La vue était en SECURITY DEFINER (contourne les règles RLS des tables
-- sous-jacentes) et accessible par le rôle "anon" (n'importe qui sur
-- internet). Corrigé en security_invoker = true : la vue respecte
-- désormais les mêmes règles que les tables qu'elle interroge.
-- (Requête complète de recréation de la vue : voir 003_fix_vue_credits_clients.sql,
-- avec `with (security_invoker = true)` ajouté juste après le nom de la vue.)
revoke all on public.vue_credits_clients from anon;
grant select on public.vue_credits_clients to authenticated;

-- ----------------------------------------------------------------------------
-- 2. BLOQUANT — annuler une vente à crédit ne corrigeait pas le solde client
-- ----------------------------------------------------------------------------
create or replace function public.fn_annuler_vente()
returns trigger as $$
declare
  v_ligne record;
  v_stock_avant integer;
  v_montant_credit numeric(12,2);
begin
  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    for v_ligne in
      select article_id, quantite from public.ventes_lignes where vente_id = new.id
    loop
      select quantite_stock into v_stock_avant
      from public.articles where id = v_ligne.article_id for update;

      update public.articles
      set quantite_stock = quantite_stock + v_ligne.quantite
      where id = v_ligne.article_id;

      insert into public.mouvements_stock (article_id, type, quantite, stock_avant, stock_apres, motif, utilisateur_id)
      values (v_ligne.article_id, 'entree', v_ligne.quantite, v_stock_avant, v_stock_avant + v_ligne.quantite,
              'Annulation vente ' || new.numero_facture, new.annule_par);
    end loop;

    if new.client_id is not null then
      select coalesce(sum(montant), 0) into v_montant_credit
      from public.paiements
      where vente_id = new.id and mode = 'credit';

      if v_montant_credit > 0 then
        update public.clients
        set solde_du = greatest(solde_du - v_montant_credit, 0)
        where id = new.client_id;
      end if;
    end if;

    new.date_annulation := coalesce(new.date_annulation, now());
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 3. MAJEUR — la lecture des données n'exigeait pas un compte actif
-- ----------------------------------------------------------------------------
-- Un compte désactivé (profils.actif = false) pouvait continuer à lire et,
-- pour la caisse, écrire des données tant que son jeton de session restait
-- valide, car les policies RLS ne vérifiaient que "connecté", pas "actif".
create or replace function public.fn_utilisateur_actif()
returns boolean as $$
  select exists(select 1 from public.profils where id = auth.uid() and actif = true);
$$ language sql stable security definer set search_path = public, pg_temp;

alter policy "lecture_authentifie" on public.approvisionnements
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.approvisionnements_lignes
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.articles
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.clients
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.mouvements_stock
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.paiements
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.remboursements_credit
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.sessions_caisse
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.ventes
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "lecture_authentifie" on public.ventes_lignes
  using (auth.role() = 'authenticated' and public.fn_utilisateur_actif());

alter policy "caisse_cree_ventes" on public.ventes
  with check (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "caisse_cree_lignes" on public.ventes_lignes
  with check (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "caisse_cree_paiements" on public.paiements
  with check (auth.role() = 'authenticated' and public.fn_utilisateur_actif());
alter policy "caisse_cree_remboursements" on public.remboursements_credit
  with check (auth.role() = 'authenticated' and public.fn_utilisateur_actif());

-- ----------------------------------------------------------------------------
-- 4. MAJEUR (défense en profondeur) — fonctions de trigger exposées en RPC public
-- ----------------------------------------------------------------------------
-- Non exploitable (type de retour "trigger", Postgres refuse l'appel direct),
-- mais ces fonctions n'ont aucune raison d'être appelables depuis le client.
revoke execute on function public.fn_annuler_vente() from public, anon, authenticated;
revoke execute on function public.fn_appro_lignes_stock() from public, anon, authenticated;
revoke execute on function public.fn_apres_paiement() from public, anon, authenticated;
revoke execute on function public.fn_fermer_session_caisse() from public, anon, authenticated;
revoke execute on function public.fn_notifier_session_caisse() from public, anon, authenticated;
revoke execute on function public.fn_ventes_lignes_stock() from public, anon, authenticated;
revoke execute on function public.fn_recalcul_montant_vente() from public, anon, authenticated;
revoke execute on function public.fn_apres_remboursement() from public, anon, authenticated;

-- fn_role_courant() et fn_utilisateur_actif() DOIVENT rester exécutables par
-- "authenticated" (elles sont appelées depuis l'intérieur même des policies
-- RLS) — seul l'accès "anon"/PUBLIC générique est retiré.
revoke execute on function public.fn_role_courant() from public, anon;
revoke execute on function public.fn_utilisateur_actif() from public, anon;
grant execute on function public.fn_role_courant() to authenticated;
grant execute on function public.fn_utilisateur_actif() to authenticated;

-- ----------------------------------------------------------------------------
-- 7. MINEUR — search_path non figé sur 2 fonctions
-- ----------------------------------------------------------------------------
create or replace function public.fn_generer_numero_facture()
returns trigger as $$
begin
  if new.numero_facture is null then
    new.numero_facture := 'FACT-' || to_char(now(), 'YYYY') || '-' ||
                           lpad(nextval('public.seq_facture')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

-- (fn_role_courant a aussi été recréée avec search_path figé, cf. point 3 ci-dessus
-- où elle est déjà redéfinie avec `security definer set search_path = public, pg_temp`)

-- ----------------------------------------------------------------------------
-- Restant à faire manuellement (pas de SQL, réglages du Dashboard Supabase) :
-- - #6 : Authentication > Policies > activer "Leaked password protection"
-- - #9 : déplacer l'extension pg_net hors du schéma public (cosmétique,
--   nécessite généralement de la recréer dans un schéma dédié — pas fait
--   automatiquement ici pour éviter de casser les triggers qui l'utilisent
--   sans une vérification manuelle préalable)
-- ============================================================================
