-- ============================================================================
-- FIX CRITIQUE — le calcul de l'écart de caisse comptait l'argent des
-- ventes ANNULÉES comme si c'était vraiment en caisse.
-- ============================================================================
-- Trouvé le 06/08/2026 : un caissier qui encaisse en espèces puis annule la
-- vente (client qui change d'avis, erreur...) voyait quand même ce montant
-- compté dans le "montant théorique" à la fermeture de session — ce qui
-- pouvait faire croire à un vrai manque en caisse qui n'existait pas.

create or replace function public.fn_fermer_session_caisse()
returns trigger as $$
declare
  v_total_especes numeric(12,2);
begin
  if new.statut = 'fermee' and old.statut is distinct from 'fermee' then
    select coalesce(sum(p.montant), 0) into v_total_especes
    from public.paiements p
    join public.ventes v on v.id = p.vente_id
    where p.mode = 'especes'
      and v.utilisateur_id = new.utilisateur_id
      and v.statut <> 'annulee'
      and p.date between new.date_ouverture and now();

    new.montant_theorique := new.montant_ouverture + v_total_especes;
    new.ecart := coalesce(new.montant_fermeture_declare, 0) - new.montant_theorique;
    new.date_fermeture := coalesce(new.date_fermeture, now());
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- OPTIONNEL — pour corriger les sessions déjà fermées qui auraient été
-- affectées par ce bug (vérifie d'abord avec le SELECT avant d'appliquer
-- l'UPDATE, pour voir concrètement ce qui changerait) :
-- ----------------------------------------------------------------------------
-- select s.id, s.utilisateur_id, s.date_fermeture, s.montant_theorique as theorique_actuel,
--        s.montant_ouverture + coalesce((
--          select sum(p.montant) from public.paiements p
--          join public.ventes v on v.id = p.vente_id
--          where p.mode = 'especes' and v.utilisateur_id = s.utilisateur_id
--            and v.statut <> 'annulee' and p.date between s.date_ouverture and s.date_fermeture
--        ), 0) as theorique_correct
-- from public.sessions_caisse s
-- where s.statut = 'fermee';
