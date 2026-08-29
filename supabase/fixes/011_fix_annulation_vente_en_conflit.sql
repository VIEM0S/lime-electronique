-- ============================================================================
-- FIX 011 — L'annulation d'une vente en conflit de synchronisation
-- réincrémentait à tort le stock (jamais décrémenté au départ)
-- ============================================================================
-- Une ligne de vente en conflit (BR-08/UC-08bis) n'a JAMAIS décrémenté le
-- stock au moment de sa création — fn_ventes_lignes_stock le laisse
-- explicitement intact et marque juste conflit_sync = true. Mais
-- fn_annuler_vente() réincrémentait *toutes* les lignes d'une vente
-- annulée sans distinction, y compris celles en conflit — ce qui
-- rajoutait du stock qui n'avait jamais été retiré, faussant l'inventaire.
--
-- Correctif : on trace, par LIGNE, si le stock a réellement été décrémenté
-- (une même vente peut avoir certaines lignes en conflit et d'autres non),
-- et fn_annuler_vente() ne réincrémente/ne journalise que ces lignes-là.
--
-- Note : fn_ventes_lignes_stock passe de AFTER à BEFORE INSERT — c'est le
-- seul moyen pour un trigger de fixer une valeur de colonne qui soit
-- réellement persistée sur la ligne insérée (modifier NEW dans un trigger
-- AFTER n'a aucun effet sur la ligne stockée en PostgreSQL).

alter table public.ventes_lignes
  add column if not exists stock_decremente boolean not null default true;

comment on column public.ventes_lignes.stock_decremente is
  'false uniquement pour une ligne en conflit de synchronisation (BR-08) dont le stock n''a jamais été décrémenté — sert à ce que fn_annuler_vente() ne la réincrémente pas à tort.';

drop trigger if exists trg_ventes_lignes_stock on public.ventes_lignes;

create or replace function public.fn_ventes_lignes_stock()
returns trigger as $$
declare
  v_stock_actuel integer;
  v_mode_sync    boolean;
begin
  select quantite_stock into v_stock_actuel
  from public.articles
  where id = new.article_id
  for update; -- verrou pour éviter les ventes simultanées incohérentes

  v_mode_sync := coalesce(current_setting('app.sync_mode', true), 'false') = 'true';

  if v_stock_actuel < new.quantite then
    if v_mode_sync then
      update public.ventes set conflit_sync = true where id = new.vente_id;
      new.stock_decremente := false; -- pas de décrément, pas de mouvement : la ligne reste en attente d'arbitrage
      return new;
    else
      raise exception 'Stock insuffisant pour l''article % (stock: %, demandé: %)',
        new.article_id, v_stock_actuel, new.quantite;
    end if;
  end if;

  update public.articles
  set quantite_stock = quantite_stock - new.quantite
  where id = new.article_id;

  insert into public.mouvements_stock (article_id, type, quantite, motif)
  values (new.article_id, 'sortie', new.quantite, 'Vente ' || new.vente_id);

  new.stock_decremente := true;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_ventes_lignes_stock
  before insert on public.ventes_lignes
  for each row execute function public.fn_ventes_lignes_stock();

create or replace function public.fn_annuler_vente()
returns trigger as $$
begin
  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    update public.articles a
    set quantite_stock = a.quantite_stock + vl.quantite
    from public.ventes_lignes vl
    where vl.vente_id = new.id and a.id = vl.article_id and vl.stock_decremente;

    insert into public.mouvements_stock (article_id, type, quantite, motif, utilisateur_id)
    select article_id, 'entree', quantite,
           'Annulation vente ' || new.numero_facture, new.annule_par
    from public.ventes_lignes
    where vente_id = new.id and stock_decremente;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;
