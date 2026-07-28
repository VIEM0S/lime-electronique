-- ============================================================================
-- FIX 005 — Commentaire optionnel à la fermeture de session de caisse
-- ============================================================================
-- Additive et sans risque : colonne nullable, rien à migrer.
-- Sert à documenter sur le moment une explication d'écart (confusion de
-- mode de paiement, erreur de comptage, etc.) — optionnel, jamais obligatoire.

alter table public.sessions_caisse
  add column if not exists commentaire_fermeture text;
