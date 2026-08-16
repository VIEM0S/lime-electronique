-- ============================================================================
-- FIX 008 — Complément d'audit : fonctions ajoutées après le 30/07 non verrouillées
-- ============================================================================
-- fn_ajuster_stock (correction de stock tracée, Catalogue) et rls_auto_enable
-- (event trigger interne) ont été créées après l'audit de sécurité du
-- 006_audit_securite.sql et n'ont pas reçu le même traitement de retrait des
-- droits d'exécution publics. Non exploitable en pratique (garde-fou de rôle
-- dans fn_ajuster_stock ; rls_auto_enable est un event trigger, appel direct
-- refusé par Postgres) mais signalé par le linter de sécurité Supabase —
-- corrigé par cohérence avec le reste de l'audit.

revoke execute on function public.fn_ajuster_stock(uuid, integer, text) from public, anon;
grant execute on function public.fn_ajuster_stock(uuid, integer, text) to authenticated;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
