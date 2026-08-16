-- ============================================================================
-- FIX 009 — RPC de synchronisation des ventes hors-ligne (BR-08/UC-08bis)
-- ============================================================================
-- Jusqu'ici, la synchronisation d'une vente créée hors-ligne
-- (src/lib/offline/useSyncStatus.ts) rejouait les mêmes 3 inserts que le
-- flux en ligne, SANS jamais positionner `app.sync_mode = 'true'`. Résultat :
-- si le stock était devenu insuffisant entre la création hors-ligne et la
-- synchronisation (vente concurrente sur un autre appareil pendant la
-- coupure), `fn_ventes_lignes_stock` levait une exception au lieu de marquer
-- `conflit_sync = true` comme prévu par BR-08 — la vente restait bloquée
-- indéfiniment dans la file d'attente locale au lieu d'être remontée pour
-- arbitrage par le propriétaire.
--
-- Cette RPC encapsule les 3 inserts (vente + lignes + paiements) dans une
-- seule transaction serveur avec `set local app.sync_mode = 'true'`, comme
-- prévu par le commentaire original sur fn_ventes_lignes_stock. Elle n'est
-- appelée que par le flux de synchronisation, jamais par une vente en temps
-- réel (qui continue de passer par les inserts directs habituels).

create or replace function public.synchroniser_vente_hors_ligne(
  p_client_id uuid,
  p_nom_client_comptant text,
  p_lignes jsonb,
  p_paiements jsonb
)
returns table (id uuid, numero_facture text, statut text, conflit_sync boolean)
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
    raise exception 'La vente doit contenir au moins une ligne.';
  end if;

  -- Portée à la transaction courante (celle de cet appel RPC) : autorise
  -- fn_ventes_lignes_stock à marquer conflit_sync au lieu de bloquer.
  perform set_config('app.sync_mode', 'true', true);

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
  select v.id, v.numero_facture, v.statut, v.conflit_sync
  from public.ventes v
  where v.id = v_vente_id;
end;
$$;

revoke execute on function public.synchroniser_vente_hors_ligne(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.synchroniser_vente_hors_ligne(uuid, text, jsonb, jsonb) to authenticated;
