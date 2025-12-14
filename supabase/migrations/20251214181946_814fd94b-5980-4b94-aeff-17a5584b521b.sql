-- ==========================================
-- 1. KVA MODULE - Variable fee & disposal
-- ==========================================

-- Add KVA fee and disposal fields to repair_tickets
ALTER TABLE public.repair_tickets 
ADD COLUMN IF NOT EXISTS kva_fee_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS kva_fee_applicable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disposal_option text DEFAULT NULL;

-- Add comment for disposal_option values
COMMENT ON COLUMN public.repair_tickets.disposal_option IS 'ZURUECKSENDEN or KOSTENLOS_ENTSORGEN - selected when KVA is rejected';

-- ==========================================
-- 2. B2B PRICING - Internal vs Endcustomer
-- ==========================================

-- Add B2B pricing fields
ALTER TABLE public.repair_tickets 
ADD COLUMN IF NOT EXISTS internal_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS endcustomer_price numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS endcustomer_price_released boolean DEFAULT false;

-- ==========================================
-- 3. NOTIFICATION OPT-INS
-- ==========================================

-- Add opt-in fields to repair_tickets (per-ticket opt-ins)
ALTER TABLE public.repair_tickets
ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false;

-- ==========================================
-- 4. USER DEFAULT LOCATION
-- ==========================================

-- Add default_location_id to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'default_location_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN default_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL;
  END IF;
END $$;