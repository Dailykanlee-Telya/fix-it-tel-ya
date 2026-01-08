-- ===========================================
-- B2B MODULE ENHANCEMENT - Part 2 (with function creation)
-- ===========================================

-- 0) Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1) Add location_id to b2b_partners (each partner assigned to one Telya location)
ALTER TABLE public.b2b_partners 
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);

-- 2) Add B2B branding fields to b2b_partners
ALTER TABLE public.b2b_partners
ADD COLUMN IF NOT EXISTS company_logo_url text,
ADD COLUMN IF NOT EXISTS company_slogan text,
ADD COLUMN IF NOT EXISTS legal_footer text,
ADD COLUMN IF NOT EXISTS terms_and_conditions text,
ADD COLUMN IF NOT EXISTS privacy_policy_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#666666';

-- 3) Create B2B document templates table
CREATE TABLE IF NOT EXISTS public.b2b_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id uuid NOT NULL REFERENCES public.b2b_partners(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('LIEFERSCHEIN', 'REPARATURBERICHT', 'KVA_SCHRIFTLICH')),
  title text NOT NULL,
  intro text,
  conditions text,
  footer text,
  legal_text text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(b2b_partner_id, template_type)
);

ALTER TABLE public.b2b_document_templates ENABLE ROW LEVEL SECURITY;

-- RLS for B2B document templates
CREATE POLICY "B2B users can view own templates"
ON public.b2b_document_templates FOR SELECT
USING (is_b2b_user(auth.uid()) AND b2b_partner_id = get_b2b_partner_id(auth.uid()));

CREATE POLICY "B2B_INHABER can manage own templates"
ON public.b2b_document_templates FOR ALL
USING (
  has_role(auth.uid(), 'B2B_INHABER'::app_role) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

CREATE POLICY "Employees can view all B2B templates"
ON public.b2b_document_templates FOR SELECT
USING (is_employee(auth.uid()));

-- 4) Add KVA decision options to repair_tickets
ALTER TABLE public.repair_tickets
ADD COLUMN IF NOT EXISTS kva_decision_type text CHECK (kva_decision_type IN ('REPARATUR', 'RUECKVERSAND', 'ENTSORGUNG_KOSTENLOS', 'ENTSORGUNG_KOSTENPFLICHTIG')),
ADD COLUMN IF NOT EXISTS kva_decision_by text CHECK (kva_decision_by IN ('B2B', 'ENDKUNDE')),
ADD COLUMN IF NOT EXISTS kva_decision_at timestamptz,
ADD COLUMN IF NOT EXISTS endcustomer_kva_allowed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS return_to_endcustomer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS endcustomer_return_address jsonb;

-- 5) Create B2B customers table (optional customers for B2B orders)
CREATE TABLE IF NOT EXISTS public.b2b_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id uuid NOT NULL REFERENCES public.b2b_partners(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_customers ENABLE ROW LEVEL SECURITY;

-- RLS for B2B customers - strict isolation
CREATE POLICY "B2B users can view own customers"
ON public.b2b_customers FOR SELECT
USING (is_b2b_user(auth.uid()) AND b2b_partner_id = get_b2b_partner_id(auth.uid()));

CREATE POLICY "B2B users can create own customers"
ON public.b2b_customers FOR INSERT
WITH CHECK (is_b2b_user(auth.uid()) AND b2b_partner_id = get_b2b_partner_id(auth.uid()));

CREATE POLICY "B2B users can update own customers"
ON public.b2b_customers FOR UPDATE
USING (is_b2b_user(auth.uid()) AND b2b_partner_id = get_b2b_partner_id(auth.uid()));

CREATE POLICY "B2B_INHABER can delete own customers"
ON public.b2b_customers FOR DELETE
USING (has_role(auth.uid(), 'B2B_INHABER'::app_role) AND b2b_partner_id = get_b2b_partner_id(auth.uid()));

CREATE POLICY "Employees can view B2B customers"
ON public.b2b_customers FOR SELECT
USING (is_employee(auth.uid()));

-- 6) Link repair tickets to B2B customers (optional)
ALTER TABLE public.repair_tickets
ADD COLUMN IF NOT EXISTS b2b_customer_id uuid REFERENCES public.b2b_customers(id);

-- 7) Create B2B user invitations table (for B2B_INHABER to invite users)
CREATE TABLE IF NOT EXISTS public.b2b_user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id uuid NOT NULL REFERENCES public.b2b_partners(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'B2B_USER',
  invited_by uuid REFERENCES public.profiles(id),
  invitation_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_b2b_role CHECK (role IN ('B2B_INHABER', 'B2B_ADMIN', 'B2B_USER'))
);

ALTER TABLE public.b2b_user_invitations ENABLE ROW LEVEL SECURITY;

-- RLS for B2B invitations
CREATE POLICY "B2B_INHABER can manage own invitations"
ON public.b2b_user_invitations FOR ALL
USING (
  has_role(auth.uid(), 'B2B_INHABER'::app_role) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

CREATE POLICY "Employees can view all invitations"
ON public.b2b_user_invitations FOR SELECT
USING (is_employee(auth.uid()));

-- 8) Add B2B pricing table for partner-specific prices
CREATE TABLE IF NOT EXISTS public.b2b_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_partner_id uuid NOT NULL REFERENCES public.b2b_partners(id) ON DELETE CASCADE,
  device_type text NOT NULL,
  repair_type text NOT NULL,
  brand text,
  model text,
  b2b_price numeric NOT NULL DEFAULT 0,
  endcustomer_price numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_prices ENABLE ROW LEVEL SECURITY;

-- RLS for B2B prices
CREATE POLICY "B2B users can view own prices"
ON public.b2b_prices FOR SELECT
USING (is_b2b_user(auth.uid()) AND b2b_partner_id = get_b2b_partner_id(auth.uid()));

CREATE POLICY "B2B_INHABER can manage own prices"
ON public.b2b_prices FOR ALL
USING (
  has_role(auth.uid(), 'B2B_INHABER'::app_role) 
  AND b2b_partner_id = get_b2b_partner_id(auth.uid())
);

CREATE POLICY "Employees can view all B2B prices"
ON public.b2b_prices FOR SELECT
USING (is_employee(auth.uid()));

-- 9) Helper function to check if user is B2B_INHABER
CREATE OR REPLACE FUNCTION public.is_b2b_inhaber(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'B2B_INHABER'::app_role
  )
$$;

-- 10) Update B2B shipments for return-to-endcustomer option
ALTER TABLE public.b2b_shipments
ADD COLUMN IF NOT EXISTS return_to_endcustomer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS endcustomer_address jsonb;

-- 11) Add permissions for B2B management
INSERT INTO public.permissions (key, description, category) VALUES
  ('B2B_MANAGE_USERS', 'B2B-Benutzer verwalten', 'B2B'),
  ('B2B_MANAGE_PRICES', 'B2B-Preise verwalten', 'B2B'),
  ('B2B_MANAGE_TEMPLATES', 'B2B-Dokumentvorlagen verwalten', 'B2B'),
  ('B2B_MANAGE_CUSTOMERS', 'B2B-Kunden verwalten', 'B2B'),
  ('B2B_CREATE_ORDERS', 'B2B-Aufträge erstellen', 'B2B'),
  ('B2B_VIEW_ORDERS', 'B2B-Aufträge anzeigen', 'B2B'),
  ('B2B_MANAGE_SHIPMENTS', 'B2B-Sendungen verwalten', 'B2B'),
  ('B2B_KVA_DECISION', 'KVA-Entscheidungen treffen', 'B2B'),
  ('B2B_RELEASE_ENDCUSTOMER_PRICE', 'Endkundenpreise freigeben', 'B2B')
ON CONFLICT (key) DO NOTHING;

-- 12) Assign permissions to B2B roles
INSERT INTO public.role_permissions (role, permission_key) VALUES
  -- B2B_INHABER has all B2B permissions
  ('B2B_INHABER', 'B2B_MANAGE_USERS'),
  ('B2B_INHABER', 'B2B_MANAGE_PRICES'),
  ('B2B_INHABER', 'B2B_MANAGE_TEMPLATES'),
  ('B2B_INHABER', 'B2B_MANAGE_CUSTOMERS'),
  ('B2B_INHABER', 'B2B_CREATE_ORDERS'),
  ('B2B_INHABER', 'B2B_VIEW_ORDERS'),
  ('B2B_INHABER', 'B2B_MANAGE_SHIPMENTS'),
  ('B2B_INHABER', 'B2B_KVA_DECISION'),
  ('B2B_INHABER', 'B2B_RELEASE_ENDCUSTOMER_PRICE'),
  -- B2B_ADMIN has most B2B permissions except user management
  ('B2B_ADMIN', 'B2B_MANAGE_PRICES'),
  ('B2B_ADMIN', 'B2B_MANAGE_CUSTOMERS'),
  ('B2B_ADMIN', 'B2B_CREATE_ORDERS'),
  ('B2B_ADMIN', 'B2B_VIEW_ORDERS'),
  ('B2B_ADMIN', 'B2B_MANAGE_SHIPMENTS'),
  ('B2B_ADMIN', 'B2B_KVA_DECISION'),
  ('B2B_ADMIN', 'B2B_RELEASE_ENDCUSTOMER_PRICE'),
  -- B2B_USER has basic permissions
  ('B2B_USER', 'B2B_MANAGE_CUSTOMERS'),
  ('B2B_USER', 'B2B_CREATE_ORDERS'),
  ('B2B_USER', 'B2B_VIEW_ORDERS'),
  ('B2B_USER', 'B2B_KVA_DECISION')
ON CONFLICT DO NOTHING;

-- 13) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_b2b_customers_partner ON public.b2b_customers(b2b_partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_document_templates_partner ON public.b2b_document_templates(b2b_partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_prices_partner ON public.b2b_prices(b2b_partner_id);
CREATE INDEX IF NOT EXISTS idx_b2b_user_invitations_partner ON public.b2b_user_invitations(b2b_partner_id);
CREATE INDEX IF NOT EXISTS idx_repair_tickets_b2b_customer ON public.repair_tickets(b2b_customer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_partners_location ON public.b2b_partners(location_id);

-- 14) Create triggers for updated_at
DROP TRIGGER IF EXISTS update_b2b_customers_updated_at ON public.b2b_customers;
CREATE TRIGGER update_b2b_customers_updated_at
  BEFORE UPDATE ON public.b2b_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_b2b_document_templates_updated_at ON public.b2b_document_templates;
CREATE TRIGGER update_b2b_document_templates_updated_at
  BEFORE UPDATE ON public.b2b_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_b2b_prices_updated_at ON public.b2b_prices;
CREATE TRIGGER update_b2b_prices_updated_at
  BEFORE UPDATE ON public.b2b_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();