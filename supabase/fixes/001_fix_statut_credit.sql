-- ============================================================================
-- FIX 001 — Le mode 'credit' était compté comme un paiement réel
-- ============================================================================
-- Bug : fn_apres_paiement() faisait la somme de TOUS les paiements
-- (y compris mode = 'credit') pour décider si statut = 'payee'. Résultat :
-- une vente 100% à crédit passait "payée" alors que rien n'a été encaissé.
--
-- Fix : le statut ne se base plus que sur les paiements réellement encaissés
-- (especes / mobile_money / virement). Le crédit continue d'augmenter
-- solde_du du client comme avant (logique inchangée sur ce point).
--
-- Impact : aucune migration de données nécessaire, aucune colonne modifiée.
-- Les ventes déjà existantes gardent leur statut actuel (ce fix ne s'applique
-- qu'aux nouveaux insert dans paiements). Si tu veux aussi corriger les
-- ventes déjà en base, vois la requête de rattrapage tout en bas (optionnelle).
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
  where id = new.vente_id;

  if new.mode = 'credit' then
    if v_client_id is null then
      raise exception 'Un paiement à crédit doit être associé à un client sur la vente';
    end if;
    update public.clients
    set solde_du = solde_du + new.montant
    where id = v_client_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Le trigger existant pointe déjà vers cette fonction (create or replace
-- suffit, pas besoin de recréer trg_apres_paiement).

-- ----------------------------------------------------------------------------
-- OPTIONNEL — rattrapage des ventes déjà enregistrées avec le mauvais statut
-- (à lancer une seule fois, après avoir vérifié le résultat du SELECT ci-dessous)
-- ----------------------------------------------------------------------------
-- 1) Vérifier ce qui va changer :
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
-- 2) Puis appliquer :
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
