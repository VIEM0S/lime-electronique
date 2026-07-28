-- ============================================================================
-- FIX 003 — vue_credits_clients comptait le crédit comme déjà réglé
-- ============================================================================
-- BUG TROUVÉ dans migration_002.sql :
--
--   solde_restant = montant_total - sum(paiements de CETTE vente)
--
-- Le souci : la part "credit" d'une vente est elle-même enregistrée comme une
-- ligne dans `paiements` (mode = 'credit') au moment de la vente. Donc dès la
-- création de la facture, sum(paiements) == montant_total (espèces + mobile
-- money + virement + credit), et solde_restant tombe à 0 IMMÉDIATEMENT,
-- même si rien n'a été réellement encaissé sur la part à crédit.
-- C'est exactement pourquoi la facture d'Awa Traoré apparaissait "Soldée"
-- avec solde_restant = 0 alors que Clients & créances affichait encore
-- 250 000 FCFA dus (ce dernier chiffre, lui, est correct — cf. plus bas).
--
-- Second problème, plus profond : même corrigé pour ignorer le mode
-- 'credit', ce calcul par facture ne peut jamais refléter un remboursement
-- ultérieur, car `remboursements_credit` n'est pas lié à une vente précise
-- (il ne connaît que le client). Il n'y a donc pas de vérité unique
-- "combien reste dû sur CETTE facture" sans décider d'une règle
-- d'allocation. Ce fix applique une règle FIFO : chaque remboursement du
-- client rembourse d'abord sa plus ancienne facture à crédit non soldée,
-- puis la suivante, etc. — c'est la convention comptable la plus naturelle
-- et la plus simple à expliquer à un client.
--
-- Résultat après ce fix :
--   - somme des solde_restant de toutes les factures à crédit d'un client
--     == clients.solde_du (les deux écrans redeviennent cohérents)
--   - un remboursement partiel se voit correctement répercuté sur la
--     facture la plus ancienne d'abord
-- ============================================================================

create or replace view public.vue_credits_clients as
with ventes_credit as (
  -- Uniquement les ventes ayant une composante à crédit (echeance_credit
  -- n'est posée que lorsque mode = 'credit', cf. fn_apres_paiement),
  -- en excluant les ventes annulées.
  select
    v.id as vente_id,
    v.numero_facture,
    v.date,
    v.client_id,
    v.montant_total,
    v.echeance_credit,
    coalesce((
      select sum(p.montant) from public.paiements p
      where p.vente_id = v.id and p.mode = 'credit'
    ), 0) as montant_credit
  from public.ventes v
  where v.echeance_credit is not null
    and v.statut <> 'annulee'
),
cumul as (
  -- Cumul du crédit initial du client, dans l'ordre chronologique, pour
  -- pouvoir allouer ses remboursements en FIFO (plus ancienne facture
  -- remboursée en premier).
  select
    vc.*,
    sum(vc.montant_credit) over (
      partition by vc.client_id order by vc.date, vc.vente_id
      rows between unbounded preceding and 1 preceding
    ) as cumul_credit_avant
  from ventes_credit vc
),
remboursements as (
  select client_id, coalesce(sum(montant), 0) as total_rembourse
  from public.remboursements_credit
  group by client_id
)
select
  cum.vente_id,
  cum.numero_facture,
  cum.date,
  c.id as client_id,
  c.nom as client_nom,
  c.telephone as client_telephone,
  c.limite_credit,
  cum.montant_total,
  cum.echeance_credit,
  greatest(
    cum.montant_credit - least(
      greatest(coalesce(r.total_rembourse, 0) - coalesce(cum.cumul_credit_avant, 0), 0),
      cum.montant_credit
    ),
    0
  ) as solde_restant,
  case
    when greatest(
      cum.montant_credit - least(
        greatest(coalesce(r.total_rembourse, 0) - coalesce(cum.cumul_credit_avant, 0), 0),
        cum.montant_credit
      ),
      0
    ) <= 0 then 'soldee'
    when cum.echeance_credit is not null and cum.echeance_credit < current_date then 'en_retard'
    else 'en_cours'
  end as statut_credit
from cumul cum
join public.clients c on c.id = cum.client_id
left join remboursements r on r.client_id = cum.client_id
order by cum.echeance_credit asc nulls last;

-- ----------------------------------------------------------------------------
-- Vérification à lancer après application (aucune ligne ne doit remonter) :
-- doit confirmer que le total par client dans cette vue == clients.solde_du
-- ----------------------------------------------------------------------------
-- select c.id, c.nom, c.solde_du,
--        coalesce(sum(vc.solde_restant), 0) as total_vue_credits
-- from public.clients c
-- left join public.vue_credits_clients vc on vc.client_id = c.id
-- group by c.id, c.nom, c.solde_du
-- having c.solde_du <> coalesce(sum(vc.solde_restant), 0);
