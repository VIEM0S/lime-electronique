-- ============================================================================
-- Lime-électronique — Schéma de base de données (PostgreSQL / Supabase)
-- Version 1.0
--
-- Correspond au modèle de données du SRS (section Annexe) et aux SSD associés.
-- Organisation unique (pas de tenant_id), stock global unifié, deux rôles.
-- ============================================================================

create extension if not exists "pgcrypto"; -- pour gen_random_uuid()


-- ============================================================================
-- 1. UTILISATEURS (profils applicatifs liés à Supabase Auth)
-- ============================================================================
-- L'authentification (email/mot de passe) est gérée par Supabase Auth
-- (table auth.users). Cette table stocke le rôle applicatif de chaque compte.

create table public.profils (
  id             uuid primary key references auth.users(id) on delete cascade,
  nom            text not null,
  role           text not null check (role in ('proprietaire', 'caisse')),
  actif          boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.profils is 'Rôle applicatif de chaque utilisateur authentifié (propriétaire ou caisse). actif=false désactive le compte (cf. écran Utilisateurs).';


-- ============================================================================
-- 2. ARTICLES (catalogue)
-- ============================================================================
-- Un numéro = un article. Chaque variante (couleur, taille...) est une ligne
-- distincte, pas de table produit+variante séparée.

create table public.articles (
  id               uuid primary key default gen_random_uuid(),
  code_article     text not null,
  nom              text not null,
  description      text,
  categorie        text,
  prix_achat       numeric(12,2),
  prix_vente       numeric(12,2) not null check (prix_vente >= 0),
  quantite_stock   integer not null default 0 check (quantite_stock >= 0),
  actif            boolean not null default true,
  created_at       timestamptz not null default now()
);

create index idx_articles_nom on public.articles using gin (to_tsvector('french', nom));
create index idx_articles_code on public.articles (code_article);

-- BR-01 : "un code d'article identifie un seul article actif à la fois" —
-- l'unicité ne doit donc porter que sur les articles actifs, pour permettre
-- de réutiliser un code après désactivation d'un ancien article.
create unique index idx_articles_code_actif on public.articles (code_article) where actif = true;


-- ============================================================================
-- 3. MOUVEMENTS DE STOCK (historique, traçabilité)
-- ============================================================================

create table public.mouvements_stock (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references public.articles(id),
  type            text not null check (type in ('entree', 'sortie')),
  quantite        integer not null check (quantite > 0),
  motif           text,
  date            timestamptz not null default now(),
  utilisateur_id  uuid references public.profils(id)
);

create index idx_mouvements_article on public.mouvements_stock (article_id, date desc);


-- ============================================================================
-- 4. CLIENTS (pour le suivi des ventes à crédit)
-- ============================================================================

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  telephone   text,
  solde_du    numeric(12,2) not null default 0 check (solde_du >= 0),
  created_at  timestamptz not null default now()
);

create index idx_clients_nom on public.clients using gin (to_tsvector('french', nom));


-- ============================================================================
-- 5. VENTES
-- ============================================================================

create sequence public.seq_facture start 1;

create table public.ventes (
  id                  uuid primary key default gen_random_uuid(),
  numero_facture      text not null unique,
  client_id           uuid references public.clients(id),
  utilisateur_id      uuid references public.profils(id),
  date                timestamptz not null default now(),
  montant_total       numeric(12,2) not null default 0,
  statut              text not null default 'impayee'
                       check (statut in ('payee', 'partielle', 'impayee', 'annulee')),
  -- FR-30 / BR-07 : annulation de vente (réservée au propriétaire)
  motif_annulation    text,
  annule_par          uuid references public.profils(id),
  date_annulation      timestamptz,
  -- BR-08 / UC-08bis : conflit détecté à la synchronisation d'une vente
  -- hors-ligne dont le stock n'est plus suffisant côté serveur.
  conflit_sync        boolean not null default false
);

create index idx_ventes_client on public.ventes (client_id);
create index idx_ventes_date on public.ventes (date desc);

-- Génération automatique du numéro de facture : FACT-<année>-<compteur>
--
-- Résout le point #5 de l'audit (risque de collision multi-appareils
-- hors-ligne) : ce trigger ne s'exécute QUE lors de l'insertion réelle de la
-- ligne côté serveur (Supabase Postgres), jamais côté client. nextval() est
-- atomique au niveau de la base. Conséquence pratique côté application :
--   - Une vente créée hors-ligne doit obtenir un identifiant LOCAL provisoire
--     (ex. UUID + libellé "FACT-EN ATTENTE-xxxx" affiché à l'écran/au PDF),
--     et ne JAMAIS générer elle-même un numero_facture définitif.
--   - Le numero_facture réel n'est attribué qu'au moment de la synchronisation,
--     quand la ligne est réellement insérée ici, dans l'ordre de réception.
--   - L'application remplace alors le libellé provisoire par le numéro
--     définitif renvoyé par le serveur (cf. futur SSD "attribution différée").
create or replace function public.fn_generer_numero_facture()
returns trigger as $$
begin
  if new.numero_facture is null then
    new.numero_facture := 'FACT-' || to_char(now(), 'YYYY') || '-' ||
                           lpad(nextval('public.seq_facture')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generer_numero_facture
  before insert on public.ventes
  for each row execute function public.fn_generer_numero_facture();


-- ============================================================================
-- 6. LIGNES DE VENTE
-- ============================================================================

create table public.ventes_lignes (
  id              uuid primary key default gen_random_uuid(),
  vente_id        uuid not null references public.ventes(id) on delete cascade,
  article_id      uuid not null references public.articles(id),
  quantite        integer not null check (quantite > 0),
  prix_unitaire   numeric(12,2) not null check (prix_unitaire >= 0)
);

create index idx_ventes_lignes_vente on public.ventes_lignes (vente_id);

-- Décrément atomique du stock + écriture du mouvement, à chaque ligne de vente.
-- FR-08 (décision produit confirmée) : en fonctionnement normal (temps réel,
-- en ligne ou hors-ligne côté client), la vente est TOUJOURS bloquée si la
-- quantité demandée dépasse le stock disponible — "on ne peut pas vendre ce
-- que l'on n'a pas". Le message d'erreur explique le motif (quantité
-- demandée vs stock disponible) pour que l'interface puisse l'afficher tel
-- quel à l'utilisateur.
--
-- UC-08bis (conflit de synchronisation) : lors de la RÉCEPTION SERVEUR d'une
-- vente créée hors-ligne, un stock devenu insuffisant entre-temps (vente
-- concurrente sur un autre appareil) ne doit pas faire échouer purement et
-- simplement l'insertion — la vente doit être conservée et marquée "en
-- conflit" pour arbitrage manuel du propriétaire (BR-08). L'application
-- distingue ce contexte en positionnant `app.sync_mode = 'true'` (via
-- `set local app.sync_mode = 'true';`) uniquement pendant la réconciliation
-- des données hors-ligne, jamais lors d'une vente en temps réel.
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
      return new; -- pas de décrément, pas de mouvement : la ligne reste en attente d'arbitrage
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

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_ventes_lignes_stock
  after insert on public.ventes_lignes
  for each row execute function public.fn_ventes_lignes_stock();

-- Recalcule montant_total de la vente à partir de ses lignes
create or replace function public.fn_recalcul_montant_vente()
returns trigger as $$
begin
  update public.ventes
  set montant_total = (
    select coalesce(sum(quantite * prix_unitaire), 0)
    from public.ventes_lignes
    where vente_id = new.vente_id
  )
  where id = new.vente_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_recalcul_montant_vente
  after insert or update or delete on public.ventes_lignes
  for each row execute function public.fn_recalcul_montant_vente();

-- FR-30 / BR-07 : annulation d'une vente (déclenchée par un update de
-- ventes.statut vers 'annulee', réservé au propriétaire par la policy RLS
-- "proprietaire_annule_ventes" plus bas). Réincrémente le stock de chaque
-- ligne et journalise le mouvement inverse ; ne s'exécute qu'une seule fois
-- (transition détectée via l'ancien statut).
create or replace function public.fn_annuler_vente()
returns trigger as $$
begin
  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    update public.articles a
    set quantite_stock = a.quantite_stock + vl.quantite
    from public.ventes_lignes vl
    where vl.vente_id = new.id and a.id = vl.article_id;

    insert into public.mouvements_stock (article_id, type, quantite, motif, utilisateur_id)
    select article_id, 'entree', quantite,
           'Annulation vente ' || new.numero_facture, new.annule_par
    from public.ventes_lignes
    where vente_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_annuler_vente
  after update on public.ventes
  for each row execute function public.fn_annuler_vente();


-- ============================================================================
-- 7. PAIEMENTS (encaissés au moment de la vente — peut être mixte)
-- ============================================================================
-- Un mode 'credit' signifie que cette part du montant est différée : elle
-- vient augmenter le solde dû du client (cf. trigger ci-dessous).

create table public.paiements (
  id          uuid primary key default gen_random_uuid(),
  vente_id    uuid not null references public.ventes(id) on delete cascade,
  mode        text not null check (mode in ('especes', 'mobile_money', 'virement', 'credit')),
  montant     numeric(12,2) not null check (montant > 0),
  date        timestamptz not null default now()
);

create index idx_paiements_vente on public.paiements (vente_id);

-- Met à jour le statut de la vente + le solde dû du client si mode = credit
--
-- BR-03bis (résout point #1 de l'audit) : les seuils sont explicites ici :
--   impayee  = total payé = 0
--   partielle = 0 < total payé < montant_total
--   payee    = total payé >= montant_total
--
-- Résout aussi le point #2 (crédit orphelin) : un paiement en mode 'credit'
-- lève une exception si la vente n'a pas de client_id — impossible d'avoir
-- un crédit sans client responsable.
create or replace function public.fn_apres_paiement()
returns trigger as $$
declare
  v_montant_total numeric(12,2);
  v_total_paye    numeric(12,2);
  v_client_id     uuid;
begin
  select montant_total, client_id into v_montant_total, v_client_id
  from public.ventes where id = new.vente_id;

  select coalesce(sum(montant), 0) into v_total_paye
  from public.paiements where vente_id = new.vente_id;

  update public.ventes
  set statut = case
    when v_total_paye >= v_montant_total then 'payee'
    when v_total_paye > 0 then 'partielle'
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

create trigger trg_apres_paiement
  after insert on public.paiements
  for each row execute function public.fn_apres_paiement();


-- ============================================================================
-- 8. REMBOURSEMENTS DE CRÉDIT (paiements ultérieurs sur le solde dû du client)
-- ============================================================================
-- Distinct des paiements de vente : ceci concerne le remboursement progressif
-- du solde dû par un client, pas nécessairement rattaché à une vente précise.

create table public.remboursements_credit (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id),
  montant         numeric(12,2) not null check (montant > 0),
  mode            text not null check (mode in ('especes', 'mobile_money', 'virement')),
  date            timestamptz not null default now(),
  utilisateur_id  uuid references public.profils(id)
);

create index idx_remboursements_client on public.remboursements_credit (client_id, date desc);

create or replace function public.fn_apres_remboursement()
returns trigger as $$
declare
  v_solde_actuel numeric(12,2);
begin
  select solde_du into v_solde_actuel from public.clients where id = new.client_id for update;

  if new.montant > v_solde_actuel then
    raise exception 'Le remboursement (%) dépasse le solde dû (%) du client %',
      new.montant, v_solde_actuel, new.client_id;
  end if;

  update public.clients
  set solde_du = solde_du - new.montant
  where id = new.client_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_apres_remboursement
  after insert on public.remboursements_credit
  for each row execute function public.fn_apres_remboursement();


-- ============================================================================
-- 9. APPROVISIONNEMENTS (arrivages de marchandise)
-- ============================================================================

create table public.approvisionnements (
  id               uuid primary key default gen_random_uuid(),
  date             timestamptz not null default now(),
  source           text,
  cout_transport   numeric(12,2) default 0,
  frais_douane     numeric(12,2) default 0,
  utilisateur_id   uuid references public.profils(id)
);

create table public.approvisionnements_lignes (
  id                      uuid primary key default gen_random_uuid(),
  approvisionnement_id    uuid not null references public.approvisionnements(id) on delete cascade,
  article_id              uuid not null references public.articles(id),
  quantite                integer not null check (quantite > 0),
  cout_unitaire           numeric(12,2) not null check (cout_unitaire >= 0)
);

create index idx_appro_lignes_appro on public.approvisionnements_lignes (approvisionnement_id);

-- Incrément du stock + écriture du mouvement, à chaque ligne d'approvisionnement
create or replace function public.fn_appro_lignes_stock()
returns trigger as $$
begin
  update public.articles
  set quantite_stock = quantite_stock + new.quantite
  where id = new.article_id;

  insert into public.mouvements_stock (article_id, type, quantite, motif)
  values (new.article_id, 'entree', new.quantite, 'Approvisionnement ' || new.approvisionnement_id);

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_appro_lignes_stock
  after insert on public.approvisionnements_lignes
  for each row execute function public.fn_appro_lignes_stock();

-- Vue utilitaire : prix de revient suggéré par ligne d'approvisionnement
-- (achat + part transport + part douane, répartis au prorata de la quantité)
create or replace view public.vue_prix_revient as
select
  al.id as ligne_id,
  al.article_id,
  al.quantite,
  al.cout_unitaire,
  al.cout_unitaire
    + (a.cout_transport / nullif(al_total.qte_totale, 0))
    + (a.frais_douane / nullif(al_total.qte_totale, 0)) as prix_revient_suggere
from public.approvisionnements_lignes al
join public.approvisionnements a on a.id = al.approvisionnement_id
join (
  select approvisionnement_id, sum(quantite) as qte_totale
  from public.approvisionnements_lignes
  group by approvisionnement_id
) al_total on al_total.approvisionnement_id = al.approvisionnement_id;


-- ============================================================================
-- 10. SESSIONS DE CAISSE (FR-31 ouverture, FR-32 fermeture)
-- ============================================================================
-- Une session par utilisateur/poste, du moment où il déclare un fonds de
-- caisse initial jusqu'à la fermeture (comptage et calcul de l'écart).

create table public.sessions_caisse (
  id                          uuid primary key default gen_random_uuid(),
  utilisateur_id              uuid not null references public.profils(id),
  date_ouverture              timestamptz not null default now(),
  montant_ouverture           numeric(12,2) not null default 0 check (montant_ouverture >= 0),
  date_fermeture              timestamptz,
  montant_fermeture_declare   numeric(12,2),
  montant_theorique           numeric(12,2),
  ecart                       numeric(12,2),
  statut                      text not null default 'ouverte' check (statut in ('ouverte', 'fermee'))
);

create index idx_sessions_caisse_utilisateur on public.sessions_caisse (utilisateur_id, date_ouverture desc);

-- Empêche un même utilisateur d'avoir deux sessions ouvertes simultanément.
create unique index idx_sessions_caisse_une_ouverte
  on public.sessions_caisse (utilisateur_id) where statut = 'ouverte';

-- FR-32 : au moment de la fermeture (statut passe à 'fermee'), calcule le
-- montant théorique = fonds initial + total des paiements en espèces
-- enregistrés pendant la durée de la session, puis l'écart avec le montant
-- compté déclaré par l'utilisateur.
--
-- Convention de signe : ecart = montant_fermeture_declare - montant_theorique
--   ecart > 0  -> excédent en caisse par rapport à ce qui était attendu
--   ecart < 0  -> manque en caisse par rapport à ce qui était attendu
--   ecart = 0  -> caisse juste
create or replace function public.fn_fermer_session_caisse()
returns trigger as $$
declare
  v_total_especes numeric(12,2);
begin
  if new.statut = 'fermee' and old.statut is distinct from 'fermee' then
    select coalesce(sum(p.montant), 0) into v_total_especes
    from public.paiements p
    where p.mode = 'especes'
      and p.date between old.date_ouverture and coalesce(new.date_fermeture, now());

    new.montant_theorique := old.montant_ouverture + v_total_especes;
    new.ecart := coalesce(new.montant_fermeture_declare, 0) - new.montant_theorique;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_fermer_session_caisse
  before update on public.sessions_caisse
  for each row execute function public.fn_fermer_session_caisse();

alter table public.sessions_caisse enable row level security;

-- Une seule policy "for all" : chacun gère (lecture + écriture) sa propre
-- session ; le propriétaire a accès à toutes les sessions (supervision,
-- vérification des écarts de caisse de la journée).
create policy "gere_sessions_caisse" on public.sessions_caisse for all
  using (auth.uid() = utilisateur_id or public.fn_role_courant() = 'proprietaire')
  with check (auth.uid() = utilisateur_id or public.fn_role_courant() = 'proprietaire');


-- ============================================================================
-- 11. RAPPORT — créances clients en cours
-- ============================================================================

create or replace view public.vue_creances_clients as
select id, nom, telephone, solde_du
from public.clients
where solde_du > 0
order by solde_du desc;


-- ============================================================================
-- 12. SÉCURITÉ — Row Level Security (RBAC à 2 rôles)
-- ============================================================================
--
-- IMPORTANT — fonctions trigger en SECURITY DEFINER :
-- fn_ventes_lignes_stock, fn_recalcul_montant_vente, fn_annuler_vente,
-- fn_apres_paiement, fn_apres_remboursement et fn_appro_lignes_stock sont
-- déclarées `security definer` (avec search_path fixé). Ce sont des effets de
-- bord SYSTÈME déclenchés par une action légitime de l'utilisateur (décrément
-- de stock à la vente, mise à jour du solde client, journal des mouvements,
-- statut de vente) : l'utilisateur n'écrit jamais directement ces colonnes,
-- c'est le trigger qui le fait pour lui. Sans `security definer`, ces
-- écritures seraient filtrées SILENCIEUSEMENT par RLS pour tout rôle qui n'a
-- pas de policy UPDATE/INSERT explicite sur la table cible (ex. la caisse n'a
-- pas le droit d'UPDATE sur articles/ventes/clients) — la requête ne
-- lèverait AUCUNE erreur, elle mettrait juste à jour zéro ligne, laissant le
-- stock, le solde client ou le statut de la vente désynchronisés sans que
-- personne ne s'en aperçoive. C'est le même principe déjà appliqué à
-- fn_role_courant() ci-dessous.

-- Renvoie le rôle de l'utilisateur connecté, ou NULL si son compte est
-- désactivé (actif=false) — ce qui fait automatiquement échouer les policies
-- "proprietaire_gere_*" pour un compte désactivé. Pour une désactivation
-- immédiate (avant expiration du token), révoquer aussi la session via
-- l'API Admin de Supabase Auth au moment du clic "Désactiver".
create or replace function public.fn_role_courant()
returns text as $$
  select role from public.profils where id = auth.uid() and actif = true;
$$ language sql stable security definer;

alter table public.profils enable row level security;
alter table public.articles enable row level security;
alter table public.mouvements_stock enable row level security;
alter table public.clients enable row level security;
alter table public.ventes enable row level security;
alter table public.ventes_lignes enable row level security;
alter table public.paiements enable row level security;
alter table public.remboursements_credit enable row level security;
alter table public.approvisionnements enable row level security;
alter table public.approvisionnements_lignes enable row level security;

-- Lecture : tout utilisateur authentifié (propriétaire ou caisse) peut lire
-- les données nécessaires à la vente et à la consultation du stock.
create policy "lecture_authentifie" on public.articles for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.clients for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.ventes for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.ventes_lignes for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.paiements for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.remboursements_credit for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.mouvements_stock for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.approvisionnements for select using (auth.role() = 'authenticated');
create policy "lecture_authentifie" on public.approvisionnements_lignes for select using (auth.role() = 'authenticated');
create policy "lecture_soi_meme" on public.profils for select using (auth.uid() = id or public.fn_role_courant() = 'proprietaire');

-- Écriture : la caisse peut créer des ventes, lignes de vente et paiements.
create policy "caisse_cree_ventes" on public.ventes for insert with check (auth.role() = 'authenticated');
create policy "caisse_cree_lignes" on public.ventes_lignes for insert with check (auth.role() = 'authenticated');
create policy "caisse_cree_paiements" on public.paiements for insert with check (auth.role() = 'authenticated');
create policy "caisse_cree_clients" on public.clients for insert with check (auth.role() = 'authenticated');
create policy "caisse_cree_remboursements" on public.remboursements_credit for insert with check (auth.role() = 'authenticated');

-- Écriture réservée au propriétaire : catalogue, approvisionnement, utilisateurs.
create policy "proprietaire_gere_articles" on public.articles for all
  using (public.fn_role_courant() = 'proprietaire')
  with check (public.fn_role_courant() = 'proprietaire');

create policy "proprietaire_gere_appro" on public.approvisionnements for all
  using (public.fn_role_courant() = 'proprietaire')
  with check (public.fn_role_courant() = 'proprietaire');

create policy "proprietaire_gere_appro_lignes" on public.approvisionnements_lignes for all
  using (public.fn_role_courant() = 'proprietaire')
  with check (public.fn_role_courant() = 'proprietaire');

create policy "proprietaire_gere_profils" on public.profils for all
  using (public.fn_role_courant() = 'proprietaire')
  with check (public.fn_role_courant() = 'proprietaire');

-- FR-30 : seul le propriétaire peut modifier une vente existante (annulation,
-- résolution d'un conflit de synchronisation cf. BR-08). La caisse ne peut
-- que créer des ventes (policy "caisse_cree_ventes" ci-dessus), jamais les
-- modifier.
create policy "proprietaire_annule_ventes" on public.ventes for update
  using (public.fn_role_courant() = 'proprietaire')
  with check (public.fn_role_courant() = 'proprietaire');

-- NB : "articles" a aussi une policy de lecture (lecture_authentifie) définie
-- plus haut ; la policy "for all" du propriétaire s'ajoute pour insert/update/delete.


-- ============================================================================
-- 13. DONNÉES D'EXEMPLE (facultatif — à retirer avant mise en production réelle)
-- ============================================================================
-- Les comptes utilisateurs (auth.users) doivent être créés via Supabase Auth
-- (interface ou API), puis complétés ici par leur rôle applicatif :
--
-- insert into public.profils (id, nom, role)
-- values ('<uuid-auth-proprietaire>', 'Propriétaire Lime-électronique', 'proprietaire');
--
-- insert into public.profils (id, nom, role)
-- values ('<uuid-auth-caisse>', 'Vendeur caisse', 'caisse');

insert into public.articles (code_article, nom, categorie, prix_achat, prix_vente, quantite_stock) values
  ('BUR-014', 'Bureau directeur XL', 'Bureaux', 60000, 85000, 7),
  ('CHZ-002', 'Chaise ergonomique noire', 'Mobilier', 14000, 22500, 3),
  ('CHZ-003', 'Chaise ergonomique marron', 'Mobilier', 14000, 22500, 0),
  ('HUM-007', 'Humidificateur 3L', 'Électroménager', 9000, 15000, 12);

insert into public.clients (nom, telephone) values
  ('Awa Traoré', '76123456'),
  ('Ibrahim Coulibaly', '65987721');
