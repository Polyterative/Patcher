-- Manufacturer verification/profile fields for the local Manufacturer Accounts MVP schema.
-- Column additions use nullable defaults only; no UPDATE backfill is performed.

alter table public.manufacturers
  add column if not exists verified_at timestamptz null,
  add column if not exists verified_by uuid null references public.profiles(id),
  add column if not exists tagline text null,
  add column if not exists description text null,
  add column if not exists social_links jsonb null;
