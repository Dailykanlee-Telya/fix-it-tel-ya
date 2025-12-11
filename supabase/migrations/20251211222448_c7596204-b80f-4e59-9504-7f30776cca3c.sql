-- Add marketing consent field to customers table
ALTER TABLE public.customers 
ADD COLUMN marketing_consent boolean NOT NULL DEFAULT false;

-- Add consent timestamp
ALTER TABLE public.customers 
ADD COLUMN marketing_consent_at timestamp with time zone;