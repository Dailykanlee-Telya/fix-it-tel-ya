
-- Phase 2: ENUMs erstellen
CREATE TYPE public.part_usage_reason AS ENUM (
  'REPARATUR',
  'TEST',
  'AUSTAUSCH',
  'FEHLERTEIL',
  'SELBSTVERSCHULDEN',
  'SONSTIGES'
);

CREATE TYPE public.approval_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);
