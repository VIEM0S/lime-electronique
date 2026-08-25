-- ============================================================================
-- FIX 010 — RPC de création de vente atomique (caisse en ligne)
-- ============================================================================
-- Incident du 25/08/2026 : 14 "factures fantômes" (0 article, 0 paiement)
-- trouvées en base, créées coup sur coup par un caissier. Cause probable :
-- src/app/(app)/caisse/CaisseForm.tsx créait la ligne `ventes` PUIS les
-- `ventes_lignes` PUIS les `paiements` en 3 requêtes séparées orchestrées
-- côté client, avec un rattrapage JS ("annuler proprement la vente ratée")
-- en cas d'échec d'une étape intermédiaire. Si l'app meurt entre la 1ère et
-- la 2ème étape (onglet fermé/rechargé, app tuée en arrière-plan sur mobile
-- — connexion instable au Mali), ce rattrapage ne s'exécute jamais : le
-- numéro de facture reste consommé et la vente reste "impayee" à 0 FCFA
-- indéfiniment.
--
-- Cette RPC reprend exactement le principe de `synchroniser_vente_hors_ligne`
-- (fix 009) mais SANS positionner `app.sync_mode` : en fonctionnement normal
-- (caisse en ligne), un stock insuffisant continue de bloquer la vente
-- (raise exception), jamais de marquage "conflit_sync" ici — ça, c'est
-- réservé à la réconciliation hors-ligne.
--
-- L'intérêt de tout faire dans une seule fonction PL/pgSQL plutôt que 3
-- requêtes séparées : c'est une seule transaction Postgres. Si quoi que ce
-- soit échoue en cours de route (stock insuffisant sur une ligne, connexion
-- coupée avant la fin), TOUT est annulé automatiquement — impossible
-- d'obtenir une vente à moitié créée. Plus besoin non plus du rattrapage
-- "annuler la vente ratée" côté client : soit tout a été créé, soit rien.

create or replace function public.creer_vente(
  p_client_id uuid,
  p_nom_client_comptant text,
  p_lignes jsonb,
  p_paiements jsonb
)
returns table (id uuid, numero_facture text, statut text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_vente_id uuid;
  v_ligne    jsonb;
  v_paiement jsonb;
begin
  if not public.fn_utilisateur_actif() then
    raise exception 'Compte non actif.';
  end if;

  if p_lignes is null or jsonb_array_length(p_lignes) = 0 then
    raise exception 'La vente doit contenir au moins un article.';
  end if;

  insert into public.ventes (client_id, nom_client_comptant, utilisateur_id)
  values (p_client_id, p_nom_client_comptant, auth.uid())
  returning ventes.id into v_vente_id;

  for v_ligne in select * from jsonb_array_elements(p_lignes)
  loop
    insert into public.ventes_lignes (vente_id, article_id, quantite, prix_unitaire)
    values (
      v_vente_id,
      (v_ligne->>'article_id')::uuid,
      (v_ligne->>'quantite')::integer,
      (v_ligne->>'prix_unitaire')::numeric
    );
  end loop;

  for v_paiement in select * from jsonb_array_elements(coalesce(p_paiements, '[]'::jsonb))
  loop
    if (v_paiement->>'montant')::numeric > 0 then
      insert into public.paiements (vente_id, mode, montant)
      values (v_vente_id, v_paiement->>'mode', (v_paiement->>'montant')::numeric);
    end if;
  end loop;

  return query
  select v.id, v.numero_facture, v.statut
  from public.ventes v
  where v.id = v_vente_id;
end;
$$;

revoke execute on function public.creer_vente(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.creer_vente(uuid, text, jsonb, jsonb) to authenticated;
