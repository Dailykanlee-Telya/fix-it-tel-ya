
-- =============================================
-- A. PERMISSIONS & ROLE_PERMISSIONS TABLES
-- =============================================

-- Create permissions table
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions, employees can view
CREATE POLICY "Admins can manage permissions"
  ON public.permissions FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Employees can view permissions"
  ON public.permissions FOR SELECT
  USING (is_employee(auth.uid()));

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage role permissions
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Employees can view role permissions"
  ON public.role_permissions FOR SELECT
  USING (is_employee(auth.uid()));

-- =============================================
-- B. USER_LOCATIONS TABLE
-- =============================================

-- Create user_locations table for multi-location access
CREATE TABLE public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  can_view boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Users can view their own location assignments
CREATE POLICY "Users can view own locations"
  ON public.user_locations FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all user locations
CREATE POLICY "Admins can manage user locations"
  ON public.user_locations FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

-- Add can_view_all_locations to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_view_all_locations boolean NOT NULL DEFAULT false;

-- =============================================
-- C. HELPER FUNCTIONS
-- =============================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
  )
$$;

-- Function to check if user can view a specific location
CREATE OR REPLACE FUNCTION public.can_view_location(_user_id uuid, _location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    -- Admins can always view all
    WHEN has_role(_user_id, 'ADMIN') THEN true
    -- Check if user has VIEW_ALL_LOCATIONS permission
    WHEN has_permission(_user_id, 'VIEW_ALL_LOCATIONS') THEN true
    -- Check if user has can_view_all_locations flag
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND can_view_all_locations = true) THEN true
    -- Check if location is in user's assigned locations
    WHEN EXISTS (
      SELECT 1 FROM public.user_locations ul
      WHERE ul.user_id = _user_id
        AND ul.location_id = _location_id
        AND ul.can_view = true
    ) THEN true
    ELSE false
  END
$$;

-- =============================================
-- D. SEED PERMISSIONS
-- =============================================

INSERT INTO public.permissions (key, description, category) VALUES
  -- Dashboard
  ('VIEW_DASHBOARD', 'Dashboard anzeigen', 'dashboard'),
  -- Auftragsannahme
  ('VIEW_INTAKE', 'Auftragsannahme anzeigen', 'intake'),
  ('CREATE_TICKET', 'Aufträge erstellen', 'intake'),
  -- Aufträge
  ('VIEW_TICKET_DETAILS', 'Auftragsdetails anzeigen', 'tickets'),
  ('EDIT_TICKET', 'Aufträge bearbeiten', 'tickets'),
  ('VIEW_ALL_TICKETS', 'Alle Aufträge anzeigen', 'tickets'),
  -- Werkstatt
  ('VIEW_WORKSHOP', 'Werkstatt-Board anzeigen', 'workshop'),
  -- Lager/Teile
  ('VIEW_PARTS', 'Teile/Lager anzeigen', 'parts'),
  ('MANAGE_PARTS', 'Teile/Lager verwalten', 'parts'),
  -- Kunden
  ('VIEW_CUSTOMERS', 'Kunden anzeigen', 'customers'),
  ('EDIT_CUSTOMERS', 'Kunden bearbeiten', 'customers'),
  -- Reports
  ('VIEW_REPORTS', 'Reports anzeigen', 'reports'),
  ('VIEW_FINANCIAL_REPORTS', 'Finanzreports anzeigen', 'reports'),
  -- B2B
  ('VIEW_B2B_PORTAL', 'B2B-Portal anzeigen', 'b2b'),
  ('MANAGE_B2B_PARTNERS', 'B2B-Partner verwalten', 'b2b'),
  -- Admin
  ('MANAGE_USERS', 'Benutzer verwalten', 'admin'),
  ('MANAGE_PERMISSIONS', 'Berechtigungen verwalten', 'admin'),
  ('MANAGE_SETTINGS', 'Einstellungen verwalten', 'admin'),
  ('VIEW_ALL_LOCATIONS', 'Alle Standorte anzeigen', 'admin')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- E. SEED DEFAULT ROLE PERMISSIONS
-- =============================================

-- ADMIN: all permissions
INSERT INTO public.role_permissions (role, permission_key)
SELECT 'ADMIN'::app_role, key FROM public.permissions
ON CONFLICT (role, permission_key) DO NOTHING;

-- THEKE: Counter staff permissions
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('THEKE', 'VIEW_DASHBOARD'),
  ('THEKE', 'VIEW_INTAKE'),
  ('THEKE', 'CREATE_TICKET'),
  ('THEKE', 'EDIT_TICKET'),
  ('THEKE', 'VIEW_TICKET_DETAILS'),
  ('THEKE', 'VIEW_WORKSHOP'),
  ('THEKE', 'VIEW_CUSTOMERS'),
  ('THEKE', 'EDIT_CUSTOMERS'),
  ('THEKE', 'VIEW_PARTS')
ON CONFLICT (role, permission_key) DO NOTHING;

-- TECHNIKER: Workshop staff permissions
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('TECHNIKER', 'VIEW_WORKSHOP'),
  ('TECHNIKER', 'VIEW_TICKET_DETAILS'),
  ('TECHNIKER', 'EDIT_TICKET'),
  ('TECHNIKER', 'VIEW_PARTS'),
  ('TECHNIKER', 'MANAGE_PARTS')
ON CONFLICT (role, permission_key) DO NOTHING;

-- BUCHHALTUNG: Accounting permissions
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('BUCHHALTUNG', 'VIEW_DASHBOARD'),
  ('BUCHHALTUNG', 'VIEW_REPORTS'),
  ('BUCHHALTUNG', 'VIEW_FINANCIAL_REPORTS'),
  ('BUCHHALTUNG', 'VIEW_TICKET_DETAILS'),
  ('BUCHHALTUNG', 'VIEW_CUSTOMERS'),
  ('BUCHHALTUNG', 'MANAGE_PARTS')
ON CONFLICT (role, permission_key) DO NOTHING;

-- FILIALLEITER: Branch manager permissions
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('FILIALLEITER', 'VIEW_DASHBOARD'),
  ('FILIALLEITER', 'VIEW_TICKET_DETAILS'),
  ('FILIALLEITER', 'VIEW_WORKSHOP'),
  ('FILIALLEITER', 'VIEW_REPORTS'),
  ('FILIALLEITER', 'VIEW_CUSTOMERS'),
  ('FILIALLEITER', 'VIEW_PARTS'),
  ('FILIALLEITER', 'EDIT_TICKET')
ON CONFLICT (role, permission_key) DO NOTHING;

-- =============================================
-- F. UPDATE RLS POLICIES FOR LOCATION-BASED ACCESS
-- =============================================

-- Drop existing employee select policy for repair_tickets
DROP POLICY IF EXISTS "Employees can view tickets" ON public.repair_tickets;

-- Create new location-aware policy for employees viewing tickets
CREATE POLICY "Employees can view tickets for their locations"
  ON public.repair_tickets FOR SELECT
  USING (
    is_employee(auth.uid())
    AND can_view_location(auth.uid(), location_id)
  );

-- =============================================
-- G. MIGRATE EXISTING USERS TO USER_LOCATIONS
-- =============================================

-- For existing users with default_location_id, create user_locations entries
INSERT INTO public.user_locations (user_id, location_id, is_default, can_view)
SELECT 
  p.id as user_id,
  p.default_location_id as location_id,
  true as is_default,
  true as can_view
FROM public.profiles p
WHERE p.default_location_id IS NOT NULL
ON CONFLICT (user_id, location_id) DO NOTHING;

-- Give admins can_view_all_locations by default
UPDATE public.profiles
SET can_view_all_locations = true
WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'ADMIN'
);
