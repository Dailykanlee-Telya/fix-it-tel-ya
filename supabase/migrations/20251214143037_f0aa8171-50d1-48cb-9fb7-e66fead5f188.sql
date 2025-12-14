-- =============================================
-- B2B PORTAL DATABASE SCHEMA - PART 1: Core Tables & Enum
-- =============================================

-- 1) Add new B2B roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'B2B_ADMIN';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'B2B_USER';

-- 2) Create b2b_partners table
CREATE TABLE public.b2b_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  customer_number TEXT UNIQUE,
  street TEXT,
  zip TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  default_return_address JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on b2b_partners
ALTER TABLE public.b2b_partners ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_b2b_partners_updated_at
  BEFORE UPDATE ON public.b2b_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 3) Add b2b_partner_id to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS b2b_partner_id UUID REFERENCES public.b2b_partners(id);

-- 4) Create b2b_shipments table
CREATE TYPE public.b2b_shipment_status AS ENUM (
  'ANGELEGT',
  'GERAETE_UNTERWEGS',
  'BEI_TELYA_EINGEGANGEN',
  'ABGESCHLOSSEN'
);

CREATE TABLE public.b2b_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id UUID NOT NULL REFERENCES public.b2b_partners(id),
  shipment_number TEXT NOT NULL UNIQUE,
  status public.b2b_shipment_status NOT NULL DEFAULT 'ANGELEGT',
  created_by UUID REFERENCES public.profiles(id),
  dhl_tracking_number TEXT,
  dhl_label_url TEXT,
  sender_address JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on b2b_shipments
ALTER TABLE public.b2b_shipments ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_b2b_shipments_updated_at
  BEFORE UPDATE ON public.b2b_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 5) Extend repair_tickets with B2B fields
ALTER TABLE public.repair_tickets 
  ADD COLUMN IF NOT EXISTS b2b_partner_id UUID REFERENCES public.b2b_partners(id),
  ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS endcustomer_reference TEXT,
  ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES public.b2b_shipments(id),
  ADD COLUMN IF NOT EXISTS auto_approved_limit NUMERIC;

-- 6) Function to generate shipment number
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM public.b2b_shipments 
  WHERE shipment_number LIKE 'B2B-' || year_str || '-%';
  RETURN 'B2B-' || year_str || '-' || lpad(seq_num::TEXT, 6, '0');
END;
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_repair_tickets_b2b_partner 
  ON public.repair_tickets(b2b_partner_id) 
  WHERE b2b_partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repair_tickets_shipment 
  ON public.repair_tickets(shipment_id) 
  WHERE shipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_shipments_partner 
  ON public.b2b_shipments(b2b_partner_id);

CREATE INDEX IF NOT EXISTS idx_profiles_b2b_partner 
  ON public.profiles(b2b_partner_id) 
  WHERE b2b_partner_id IS NOT NULL;