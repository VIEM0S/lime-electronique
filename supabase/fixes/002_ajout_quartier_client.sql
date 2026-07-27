-- ============================================================================
-- FIX 002 — Ajout d'un champ "quartier" optionnel sur les clients
-- ============================================================================
-- Migration additive et sans risque : nouvelle colonne nullable, aucune
-- donnée existante touchée, aucune contrainte cassée.

alter table public.clients
  add column if not exists quartier text;
