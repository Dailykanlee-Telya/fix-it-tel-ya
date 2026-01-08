-- ===========================================
-- MIGRATION 1: Add B2B_INHABER role
-- ===========================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'B2B_INHABER';