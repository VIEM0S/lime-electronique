-- ============================================================================
-- FIX 004 — Notifications push (ouverture/fermeture de session de caisse)
-- ============================================================================
-- Vraies notifications navigateur/téléphone (Web Push), qui arrivent même
-- app fermée. Fonctionne comme ceci :
--   1. Le propriétaire clique "Activer les alertes" dans l'app → son
--      navigateur s'abonne au push, l'abonnement est stocké ici.
--   2. À l'ouverture ou la fermeture d'une session de caisse, un trigger
--      Postgres appelle l'Edge Function `notifier-session-caisse` (via
--      pg_net, en tâche de fond, sans bloquer la transaction).
--   3. L'Edge Function envoie la notification à tous les abonnés
--      "propriétaire" via le protocole Web Push standard (pas de
--      SMS/WhatsApp, pas de coût par message).
-- ============================================================================

create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  utilisateur_id  uuid not null references public.profils(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  created_at      timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'push_subscriptions' and policyname = 'utilisateur_gere_son_abonnement'
  ) then
    create policy "utilisateur_gere_son_abonnement" on public.push_subscriptions for all
      using (auth.uid() = utilisateur_id)
      with check (auth.uid() = utilisateur_id);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Déclencheur : appelle l'Edge Function en tâche de fond (pg_net), sans
-- bloquer l'ouverture/fermeture de session si l'appel HTTP est lent.
-- La clé "anon" utilisée ici n'est pas secrète (c'est la clé publique
-- publishable du projet) — sans risque à laisser dans le SQL.
-- ----------------------------------------------------------------------------
create or replace function public.fn_notifier_session_caisse()
returns trigger as $$
declare
  v_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_payload := jsonb_build_object(
      'type', 'ouverture',
      'session_id', new.id,
      'utilisateur_id', new.utilisateur_id,
      'montant_ouverture', new.montant_ouverture,
      'date_ouverture', new.date_ouverture
    );
  elsif tg_op = 'UPDATE' and new.statut = 'fermee' and old.statut is distinct from 'fermee' then
    v_payload := jsonb_build_object(
      'type', 'fermeture',
      'session_id', new.id,
      'utilisateur_id', new.utilisateur_id,
      'montant_theorique', new.montant_theorique,
      'montant_fermeture_declare', new.montant_fermeture_declare,
      'ecart', new.ecart,
      'date_fermeture', new.date_fermeture
    );
  else
    return new;
  end if;

  perform net.http_post(
    url := 'https://mdzxitzgzndpuxobjqcq.supabase.co/functions/v1/notifier-session-caisse',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kenhpdHpnem5kcHV4b2JqcWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDA4ODQsImV4cCI6MjEwMDQ3Njg4NH0.b-eX42FzrcfBMnJWnpqx5eQPfVuPaXSui1wQbCEm9PA'
    ),
    body := v_payload
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp, net;

drop trigger if exists trg_notifier_session_ouverture on public.sessions_caisse;
create trigger trg_notifier_session_ouverture
  after insert on public.sessions_caisse
  for each row execute function public.fn_notifier_session_caisse();

drop trigger if exists trg_notifier_session_fermeture on public.sessions_caisse;
create trigger trg_notifier_session_fermeture
  after update on public.sessions_caisse
  for each row execute function public.fn_notifier_session_caisse();
