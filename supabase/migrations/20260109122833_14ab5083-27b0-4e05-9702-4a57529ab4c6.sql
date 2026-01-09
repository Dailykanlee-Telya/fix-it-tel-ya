-- ============================================
-- A) Device Condition at Intake
-- ============================================
ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS device_condition_at_intake jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS device_condition_remarks text;

-- ============================================
-- B) Passcode + Pattern Lock
-- ============================================
ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS passcode_type text;
ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS passcode_pin text;
ALTER TABLE public.repair_tickets ADD COLUMN IF NOT EXISTS passcode_pattern jsonb;

-- ============================================
-- C) Status enum - add B2B logistics statuses
-- ============================================
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'EINGESENDET';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'RUECKVERSAND_AN_B2B';
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'RUECKVERSAND_AN_ENDKUNDE';

-- ============================================
-- D) Model Request Table for missing models
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  b2b_partner_id uuid REFERENCES public.b2b_partners(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  device_type text NOT NULL,
  brand text NOT NULL,
  model_name text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.model_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view all requests  
CREATE POLICY "Employees can view all model requests" ON public.model_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'THEKE', 'TECHNIKER', 'FILIALLEITER'))
  );

-- Employees can update requests (approve/reject)
CREATE POLICY "Employees can update model requests" ON public.model_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('ADMIN', 'THEKE', 'FILIALLEITER'))
  );

-- B2B users can view their own requests
CREATE POLICY "B2B users can view own model requests" ON public.model_requests
  FOR SELECT USING (
    b2b_partner_id IN (SELECT b2b_partner_id FROM public.profiles WHERE id = auth.uid())
  );

-- B2B users can insert requests for their partner
CREATE POLICY "B2B users can create model requests" ON public.model_requests
  FOR INSERT WITH CHECK (
    b2b_partner_id IN (SELECT b2b_partner_id FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================
-- E) B2B Customer Address Fields
-- ============================================
ALTER TABLE public.b2b_customers ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.b2b_customers ADD COLUMN IF NOT EXISTS house_number text;
ALTER TABLE public.b2b_customers ADD COLUMN IF NOT EXISTS zip text;
ALTER TABLE public.b2b_customers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.b2b_customers ADD COLUMN IF NOT EXISTS country text DEFAULT 'Deutschland';

-- ============================================
-- H) B2B Document Text Templates (editable legal texts)
-- ============================================
ALTER TABLE public.b2b_partners ADD COLUMN IF NOT EXISTS document_texts jsonb DEFAULT '{}'::jsonb;