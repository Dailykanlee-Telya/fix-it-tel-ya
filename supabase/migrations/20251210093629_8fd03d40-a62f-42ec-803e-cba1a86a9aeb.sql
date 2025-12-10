-- Create custom types/enums
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'THEKE', 'TECHNIKER', 'BUCHHALTUNG', 'FILIALLEITER');
CREATE TYPE public.device_type AS ENUM ('HANDY', 'TABLET', 'LAPTOP', 'SMARTWATCH', 'OTHER');
CREATE TYPE public.ticket_status AS ENUM ('NEU_EINGEGANGEN', 'IN_DIAGNOSE', 'WARTET_AUF_TEIL_ODER_FREIGABE', 'IN_REPARATUR', 'FERTIG_ZUR_ABHOLUNG', 'ABGEHOLT', 'STORNIERT');
CREATE TYPE public.error_code AS ENUM ('DISPLAYBRUCH', 'WASSERSCHADEN', 'AKKU_SCHWACH', 'LADEBUCHSE', 'KAMERA', 'MIKROFON', 'LAUTSPRECHER', 'TASTATUR', 'SONSTIGES');
CREATE TYPE public.price_mode AS ENUM ('FIXPREIS', 'KVA', 'NACH_AUFWAND');
CREATE TYPE public.notification_channel AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE public.notification_trigger AS ENUM ('TICKET_CREATED', 'KVA_READY', 'KVA_APPROVED', 'KVA_REJECTED', 'REPAIR_IN_PROGRESS', 'READY_FOR_PICKUP', 'REMINDER_NOT_PICKED');
CREATE TYPE public.error_cause AS ENUM ('STURZ', 'FEUCHTIGKEIT', 'VERSCHLEISS', 'HERSTELLERFEHLER', 'UNKLAR');

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (for RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'THEKE',
  UNIQUE(user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  device_type device_type NOT NULL DEFAULT 'HANDY',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  imei_or_serial TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Repair tickets table
CREATE TABLE public.repair_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  device_id UUID NOT NULL REFERENCES public.devices(id),
  location_id UUID NOT NULL REFERENCES public.locations(id),
  status ticket_status NOT NULL DEFAULT 'NEU_EINGEGANGEN',
  error_description_text TEXT,
  error_code error_code DEFAULT 'SONSTIGES',
  error_cause error_cause,
  accessories TEXT,
  legal_notes_ack BOOLEAN NOT NULL DEFAULT false,
  passcode_info TEXT,
  price_mode price_mode NOT NULL DEFAULT 'KVA',
  estimated_price NUMERIC(10,2),
  final_price NUMERIC(10,2),
  kva_required BOOLEAN NOT NULL DEFAULT false,
  kva_approved BOOLEAN,
  kva_approved_at TIMESTAMPTZ,
  kva_token TEXT UNIQUE,
  assigned_technician_id UUID REFERENCES public.profiles(id),
  priority TEXT DEFAULT 'normal',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket photos
CREATE TABLE public.ticket_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parts/inventory
CREATE TABLE public.parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  sku TEXT,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sales_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_quantity INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket part usage
CREATE TABLE public.ticket_part_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_purchase_price NUMERIC(10,2),
  unit_sales_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Status history
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  old_status ticket_status,
  new_status ticket_status NOT NULL,
  changed_by_user_id UUID REFERENCES public.profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  device_type device_type,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Checklist items
CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Ticket checklist items
CREATE TABLE public.ticket_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id),
  checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by_user_id UUID REFERENCES public.profiles(id)
);

-- Notification templates
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL DEFAULT 'EMAIL',
  trigger notification_trigger NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification logs
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID REFERENCES public.repair_tickets(id),
  customer_id UUID REFERENCES public.customers(id),
  channel notification_channel NOT NULL,
  trigger notification_trigger NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID REFERENCES public.repair_tickets(id),
  customer_id UUID REFERENCES public.customers(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_complaint BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price table for standard repairs
CREATE TABLE public.price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type device_type NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  repair_type error_code NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_part_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user has any role (is authenticated employee)
CREATE OR REPLACE FUNCTION public.is_employee(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- RLS Policies for locations
CREATE POLICY "Employees can view locations" ON public.locations FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Employees can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for customers
CREATE POLICY "Employees can view customers" ON public.customers FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Employees can create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));
CREATE POLICY "Employees can update customers" ON public.customers FOR UPDATE TO authenticated USING (public.is_employee(auth.uid()));

-- RLS Policies for devices
CREATE POLICY "Employees can view devices" ON public.devices FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Employees can create devices" ON public.devices FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));
CREATE POLICY "Employees can update devices" ON public.devices FOR UPDATE TO authenticated USING (public.is_employee(auth.uid()));

-- RLS Policies for repair_tickets
CREATE POLICY "Employees can view tickets" ON public.repair_tickets FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Employees can create tickets" ON public.repair_tickets FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));
CREATE POLICY "Employees can update tickets" ON public.repair_tickets FOR UPDATE TO authenticated USING (public.is_employee(auth.uid()));

-- RLS Policies for ticket_photos
CREATE POLICY "Employees can view photos" ON public.ticket_photos FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Employees can add photos" ON public.ticket_photos FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));

-- RLS Policies for parts
CREATE POLICY "Employees can view parts" ON public.parts FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Admins and Buchhaltung can manage parts" ON public.parts FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'BUCHHALTUNG'));

-- RLS Policies for ticket_part_usage
CREATE POLICY "Employees can view part usage" ON public.ticket_part_usage FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Technicians can manage part usage" ON public.ticket_part_usage FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'TECHNIKER') OR public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for status_history
CREATE POLICY "Employees can view status history" ON public.status_history FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Employees can add status history" ON public.status_history FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));

-- RLS Policies for checklist templates
CREATE POLICY "Employees can view checklists" ON public.checklist_templates FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Admins can manage checklists" ON public.checklist_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for checklist items
CREATE POLICY "Employees can view checklist items" ON public.checklist_items FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Admins can manage checklist items" ON public.checklist_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for ticket_checklist_items
CREATE POLICY "Employees can view ticket checklists" ON public.ticket_checklist_items FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Technicians can manage ticket checklists" ON public.ticket_checklist_items FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'TECHNIKER') OR public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for notification templates
CREATE POLICY "Employees can view templates" ON public.notification_templates FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Admins can manage templates" ON public.notification_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for notification logs
CREATE POLICY "Employees can view logs" ON public.notification_logs FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "System can insert logs" ON public.notification_logs FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));

-- RLS Policies for feedback
CREATE POLICY "Employees can view feedback" ON public.feedback FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Public can insert feedback" ON public.feedback FOR INSERT TO anon WITH CHECK (true);

-- RLS Policies for audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_employee(auth.uid()));

-- RLS Policies for price_list
CREATE POLICY "Employees can view prices" ON public.price_list FOR SELECT TO authenticated USING (public.is_employee(auth.uid()));
CREATE POLICY "Admins and Buchhaltung can manage prices" ON public.price_list FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'ADMIN') OR public.has_role(auth.uid(), 'BUCHHALTUNG'));

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_repair_tickets_updated_at BEFORE UPDATE ON public.repair_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_price_list_updated_at BEFORE UPDATE ON public.price_list FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
BEGIN
  today_date := to_char(now(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO seq_num 
  FROM public.repair_tickets 
  WHERE ticket_number LIKE 'TELYA-' || today_date || '-%';
  RETURN 'TELYA-' || today_date || '-' || lpad(seq_num::TEXT, 4, '0');
END;
$$;