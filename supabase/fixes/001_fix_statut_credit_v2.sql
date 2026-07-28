-- ============================================================================
-- FIX 001 (v2 — corrigé après lecture de migration_002.sql réelle)
-- Le mode 'credit' était compté comme un paiement réel
-- ============================================================================
-- Repart de la vraie fn_apres_paiement() de migration_002.sql (celle avec
-- la garde `statut != 'annulee'` et la pose de `echeance_credit`), pas de
-- la version simplifiée de schema.sql. Si tu as déjà appliqué la première
-- version de ce fix que je t'ai envoyée, rejoue simplement celle-ci
-- par-dessus : create or replace est sans risque à rejouer.
--
-- Bug : le statut se basait sur TOUS les paiements, crédit inclus. Une
-- vente 100% à crédit passait donc "payée" alors que rien n'est encaissé.
-- ============================================================================

create or replace function public.fn_apres_paiement()
returns trigger as $$
declare
  v_montant_total     numeric(12,2);
  v_total_paye_reel    numeric(12,2); -- exclut le mode 'credit'
  v_client_id          uuid;
begin
  select montant_total, client_id into v_montant_total, v_client_id
  from public.ventes where id = new.vente_id;

  -- Uniquement les paiements réellement encaissés (pas le crédit différé)
  select coalesce(sum(montant), 0) into v_total_paye_reel
  from public.paiements
  where vente_id = new.vente_id and mode <> 'credit';

  update public.ventes
  set statut = case
    when v_total_paye_reel >= v_montant_total then 'payee'
    when v_total_paye_reel > 0 then 'partielle'
    else 'impayee'
  end
  where id = new.vente_id and statut != 'annulee';

  if new.mode = 'credit' then
    if v_client_id is null then
      raise exception 'Un paiement à crédit doit être associé à un client sur la vente';
    end if;
    update public.clients
    set solde_du = solde_du + new.montant
    where id = v_client_id;

    update public.ventes
    set echeance_credit = coalesce(echeance_credit, (current_date + interval '30 days')::date)
    where id = new.vente_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- OPTIONNEL — rattrapage des ventes déjà enregistrées avec le mauvais statut
-- (vérifier d'abord avec le SELECT, appliquer ensuite volontairement)
-- ----------------------------------------------------------------------------
-- select v.id, v.numero_facture, v.statut as statut_actuel,
--        coalesce(sum(p.montant) filter (where p.mode <> 'credit'), 0) as reel_encaisse,
--        v.montant_total
-- from public.ventes v
-- left join public.paiements p on p.vente_id = v.id
-- where v.statut <> 'annulee'
-- group by v.id
-- having v.statut != case
--   when coalesce(sum(p.montant) filter (where p.mode <> 'credit'), 0) >= v.montant_total then 'payee'
--   when coalesce(sum(p.montant) filter (where p.mode <> 'credit'), 0) > 0 then 'partielle'
--   else 'impayee'
-- end;
--
-- update public.ventes v
-- set statut = case
--   when reel.total >= v.montant_total then 'payee'
--   when reel.total > 0 then 'partielle'
--   else 'impayee'
-- end
-- from (
--   select vente_id, coalesce(sum(montant), 0) as total
--   from public.paiements where mode <> 'credit'
--   group by vente_id
-- ) reel
-- where reel.vente_id = v.id and v.statut <> 'annulee';
