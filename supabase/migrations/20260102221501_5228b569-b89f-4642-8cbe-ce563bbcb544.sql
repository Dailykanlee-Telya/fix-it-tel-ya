-- =====================================================
-- REVISIONSSICHERES LAGER- UND WARENBEWEGUNGSMODUL
-- =====================================================

-- 1) BEWEGUNGSTYPEN ENUM
CREATE TYPE public.stock_movement_type AS ENUM (
  'PURCHASE',           -- Einkauf/Wareneingang
  'CONSUMPTION',        -- Verbrauch im Auftrag
  'MANUAL_OUT',         -- Manuelle Entnahme (Test, Verkauf, etc.)
  'TRANSFER_OUT',       -- Umlagerung Ausgang
  'TRANSFER_IN',        -- Umlagerung Eingang
  'COMPLAINT_OUT',      -- Reklamation - Rücksendung an Lieferant
  'COMPLAINT_CREDIT',   -- Reklamation - Gutschrift erhalten
  'COMPLAINT_REPLACE',  -- Reklamation - Ersatzlieferung erhalten
  'WRITE_OFF',          -- Abschreibung (Eigenverschulden/Defekt)
  'INVENTORY_PLUS',     -- Inventur Korrektur positiv
  'INVENTORY_MINUS',    -- Inventur Korrektur negativ
  'INITIAL_STOCK'       -- Anfangsbestand bei Übernahme
);

-- 2) LIEFERANTEN TABELLE
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view suppliers"
  ON public.suppliers FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Managers and Admins can manage suppliers"
  ON public.suppliers FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- 3) LAGERORTE PRO FILIALE (verknüpft mit locations)
CREATE TABLE public.stock_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Hauptlager',
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view stock locations"
  ON public.stock_locations FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Admins can manage stock locations"
  ON public.stock_locations FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

-- 4) ERWEITERE PARTS TABELLE
ALTER TABLE public.parts 
  ADD COLUMN IF NOT EXISTS stock_location_id UUID REFERENCES public.stock_locations(id),
  ADD COLUMN IF NOT EXISTS last_purchase_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_purchase_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id);

-- 5) LAGERBEWEGUNGEN (KERNLABELLE - REVISIONSSICHER)
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movement_type public.stock_movement_type NOT NULL,
  part_id UUID NOT NULL REFERENCES public.parts(id) ON DELETE RESTRICT,
  stock_location_id UUID NOT NULL REFERENCES public.stock_locations(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity != 0),
  unit_price NUMERIC,  -- EK bei Einkauf, VK bei Verkauf
  total_value NUMERIC GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED,
  
  -- Referenzen
  repair_ticket_id UUID REFERENCES public.repair_tickets(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_order_id UUID, -- Will be foreign key after purchase_orders table exists
  complaint_id UUID, -- Will be foreign key after complaints table exists
  transfer_movement_id UUID, -- Verknüpfte Gegenbuchung bei Umlagerung
  inventory_session_id UUID, -- Inventursitzung
  
  -- Audit
  reason TEXT, -- Pflichtfeld bei bestimmten Bewegungen
  notes TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Bestandsinfo zum Zeitpunkt der Buchung (für Audit)
  stock_before INTEGER NOT NULL DEFAULT 0,
  stock_after INTEGER NOT NULL DEFAULT 0,
  
  -- Meta
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: Gegenbuchung nur bei Umlagerungen
  CONSTRAINT transfer_movement_type_check CHECK (
    (transfer_movement_id IS NULL) OR 
    (movement_type IN ('TRANSFER_OUT', 'TRANSFER_IN'))
  )
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_stock_movements_part ON public.stock_movements(part_id);
CREATE INDEX idx_stock_movements_location ON public.stock_movements(stock_location_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(created_at);
CREATE INDEX idx_stock_movements_ticket ON public.stock_movements(repair_ticket_id);

-- RLS für stock_movements
CREATE POLICY "Employees can view movements for their locations"
  ON public.stock_movements FOR SELECT
  USING (
    is_employee(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM public.stock_locations sl
      WHERE sl.id = stock_movements.stock_location_id
        AND can_view_location(auth.uid(), sl.location_id)
    )
  );

CREATE POLICY "Technicians can create consumption movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (
    is_employee(auth.uid()) AND
    (
      -- Techniker dürfen nur Verbrauch im Auftrag buchen
      (movement_type = 'CONSUMPTION' AND repair_ticket_id IS NOT NULL) OR
      -- Manager/Admins dürfen alle Bewegungen anlegen
      has_role(auth.uid(), 'ADMIN') OR 
      has_role(auth.uid(), 'FILIALLEITER')
    )
  );

CREATE POLICY "Only Admins can update movements"
  ON public.stock_movements FOR UPDATE
  USING (has_role(auth.uid(), 'ADMIN'));

-- 6) BESTELLUNGEN (PURCHASE ORDERS)
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  stock_location_id UUID NOT NULL REFERENCES public.stock_locations(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED')),
  order_date DATE,
  expected_delivery DATE,
  invoice_number TEXT,
  invoice_date DATE,
  notes TEXT,
  total_amount NUMERIC DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view purchase orders"
  ON public.purchase_orders FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Managers and Admins can manage purchase orders"
  ON public.purchase_orders FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- 7) BESTELLPOSITIONEN
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id),
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view purchase order items"
  ON public.purchase_order_items FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Managers and Admins can manage purchase order items"
  ON public.purchase_order_items FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- Add foreign key to stock_movements
ALTER TABLE public.stock_movements
  ADD CONSTRAINT fk_stock_movements_purchase_order
  FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);

-- 8) REKLAMATIONEN
CREATE TYPE public.complaint_status AS ENUM (
  'OPEN',              -- Reklamation eröffnet
  'SENT_BACK',         -- An Lieferant zurückgesendet
  'CREDIT_RECEIVED',   -- Gutschrift erhalten
  'REPLACEMENT_RECEIVED', -- Ersatzlieferung erhalten
  'CLOSED'             -- Abgeschlossen
);

CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_number TEXT NOT NULL UNIQUE,
  part_id UUID NOT NULL REFERENCES public.parts(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  stock_location_id UUID NOT NULL REFERENCES public.stock_locations(id),
  repair_ticket_id UUID REFERENCES public.repair_tickets(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status public.complaint_status NOT NULL DEFAULT 'OPEN',
  reason TEXT NOT NULL,
  resolution_type TEXT CHECK (resolution_type IN ('CREDIT', 'REPLACEMENT', 'REJECTED', NULL)),
  credit_amount NUMERIC,
  replacement_quantity INTEGER,
  sent_back_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  tracking_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view complaints"
  ON public.complaints FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Managers and Admins can manage complaints"
  ON public.complaints FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- Add foreign key to stock_movements
ALTER TABLE public.stock_movements
  ADD CONSTRAINT fk_stock_movements_complaint
  FOREIGN KEY (complaint_id) REFERENCES public.complaints(id);

-- 9) INVENTUR SITZUNGEN
CREATE TYPE public.inventory_status AS ENUM (
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE public.inventory_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_number TEXT NOT NULL UNIQUE,
  stock_location_id UUID NOT NULL REFERENCES public.stock_locations(id),
  status public.inventory_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  total_items_counted INTEGER DEFAULT 0,
  total_discrepancies INTEGER DEFAULT 0,
  total_value_difference NUMERIC DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view inventory sessions for their locations"
  ON public.inventory_sessions FOR SELECT
  USING (
    is_employee(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.stock_locations sl
      WHERE sl.id = inventory_sessions.stock_location_id
        AND can_view_location(auth.uid(), sl.location_id)
    )
  );

CREATE POLICY "Managers and Admins can manage inventory sessions"
  ON public.inventory_sessions FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- 10) INVENTUR ZÄHLUNGEN
CREATE TABLE public.inventory_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_session_id UUID NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.parts(id),
  expected_quantity INTEGER NOT NULL DEFAULT 0,
  counted_quantity INTEGER NOT NULL DEFAULT 0,
  difference INTEGER GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  unit_value NUMERIC DEFAULT 0,
  value_difference NUMERIC GENERATED ALWAYS AS ((counted_quantity - expected_quantity) * COALESCE(unit_value, 0)) STORED,
  discrepancy_reason TEXT,
  counted_by UUID NOT NULL REFERENCES auth.users(id),
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inventory_session_id, part_id)
);

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view inventory counts"
  ON public.inventory_counts FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Managers and Admins can manage inventory counts"
  ON public.inventory_counts FOR ALL
  USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'FILIALLEITER'));

-- Add foreign key to stock_movements
ALTER TABLE public.stock_movements
  ADD CONSTRAINT fk_stock_movements_inventory_session
  FOREIGN KEY (inventory_session_id) REFERENCES public.inventory_sessions(id);

-- 11) FUNKTION: Bestand aus Bewegungen berechnen (nie direkt ändern!)
CREATE OR REPLACE FUNCTION public.get_stock_quantity(
  _part_id UUID,
  _stock_location_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(quantity), 0)::INTEGER
  FROM public.stock_movements
  WHERE part_id = _part_id
    AND (_stock_location_id IS NULL OR stock_location_id = _stock_location_id)
$$;

-- 12) FUNKTION: Lagerbewegung erstellen mit Bestandsprüfung
CREATE OR REPLACE FUNCTION public.create_stock_movement(
  _movement_type stock_movement_type,
  _part_id UUID,
  _stock_location_id UUID,
  _quantity INTEGER,
  _unit_price NUMERIC DEFAULT NULL,
  _repair_ticket_id UUID DEFAULT NULL,
  _supplier_id UUID DEFAULT NULL,
  _purchase_order_id UUID DEFAULT NULL,
  _complaint_id UUID DEFAULT NULL,
  _transfer_movement_id UUID DEFAULT NULL,
  _inventory_session_id UUID DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _requires_approval BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_stock INTEGER;
  _new_stock INTEGER;
  _movement_id UUID;
BEGIN
  -- Hole aktuellen Bestand
  SELECT get_stock_quantity(_part_id, _stock_location_id) INTO _current_stock;
  
  -- Berechne neuen Bestand
  _new_stock := _current_stock + _quantity;
  
  -- Prüfe ob Bestand negativ würde (außer bei bestimmten Typen)
  IF _new_stock < 0 AND _movement_type NOT IN ('WRITE_OFF', 'INVENTORY_MINUS') THEN
    RAISE EXCEPTION 'Nicht genügend Bestand verfügbar. Aktuell: %, Angefordert: %', _current_stock, ABS(_quantity);
  END IF;
  
  -- Erstelle Bewegung
  INSERT INTO public.stock_movements (
    movement_type,
    part_id,
    stock_location_id,
    quantity,
    unit_price,
    repair_ticket_id,
    supplier_id,
    purchase_order_id,
    complaint_id,
    transfer_movement_id,
    inventory_session_id,
    reason,
    notes,
    requires_approval,
    stock_before,
    stock_after,
    created_by
  ) VALUES (
    _movement_type,
    _part_id,
    _stock_location_id,
    _quantity,
    _unit_price,
    _repair_ticket_id,
    _supplier_id,
    _purchase_order_id,
    _complaint_id,
    _transfer_movement_id,
    _inventory_session_id,
    _reason,
    _notes,
    _requires_approval,
    _current_stock,
    _new_stock,
    auth.uid()
  )
  RETURNING id INTO _movement_id;
  
  -- Aktualisiere parts.stock_quantity (derived, aber für Performance)
  UPDATE public.parts
  SET stock_quantity = _new_stock,
      updated_at = now()
  WHERE id = _part_id;
  
  -- Bei Einkauf: Aktualisiere EK-Preise
  IF _movement_type = 'PURCHASE' AND _unit_price IS NOT NULL THEN
    UPDATE public.parts
    SET last_purchase_price = _unit_price,
        avg_purchase_price = (
          SELECT COALESCE(AVG(unit_price), _unit_price)
          FROM public.stock_movements
          WHERE part_id = _part_id AND movement_type = 'PURCHASE' AND unit_price IS NOT NULL
        ),
        updated_at = now()
    WHERE id = _part_id;
  END IF;
  
  RETURN _movement_id;
END;
$$;

-- 13) FUNKTION: Umlagerung zwischen Filialen
CREATE OR REPLACE FUNCTION public.create_stock_transfer(
  _part_id UUID,
  _from_location_id UUID,
  _to_location_id UUID,
  _quantity INTEGER,
  _reason TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _out_movement_id UUID;
  _in_movement_id UUID;
  _current_stock INTEGER;
BEGIN
  -- Prüfe Bestand am Quellort
  SELECT get_stock_quantity(_part_id, _from_location_id) INTO _current_stock;
  
  IF _current_stock < _quantity THEN
    RAISE EXCEPTION 'Nicht genügend Bestand am Quellort. Verfügbar: %, Angefordert: %', _current_stock, _quantity;
  END IF;
  
  -- Erstelle Ausgangsbuchung
  _out_movement_id := create_stock_movement(
    'TRANSFER_OUT',
    _part_id,
    _from_location_id,
    -_quantity,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    _reason,
    _notes,
    false
  );
  
  -- Erstelle Eingangsbuchung mit Verknüpfung
  _in_movement_id := create_stock_movement(
    'TRANSFER_IN',
    _part_id,
    _to_location_id,
    _quantity,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    _out_movement_id,
    NULL,
    _reason,
    _notes,
    false
  );
  
  -- Verknüpfe Ausgangsbuchung mit Eingangsbuchung
  UPDATE public.stock_movements
  SET transfer_movement_id = _in_movement_id
  WHERE id = _out_movement_id;
  
  RETURN _out_movement_id;
END;
$$;

-- 14) GENERATOR FÜR NUMMERN
CREATE OR REPLACE FUNCTION public.generate_purchase_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.purchase_orders
  WHERE order_number LIKE 'PO-' || _year || '-%';
  RETURN 'PO-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.complaints
  WHERE complaint_number LIKE 'RK-' || _year || '-%';
  RETURN 'RK-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_inventory_session_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _seq INTEGER;
BEGIN
  _year := to_char(now(), 'YYYY');
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.inventory_sessions
  WHERE session_number LIKE 'INV-' || _year || '-%';
  RETURN 'INV-' || _year || '-' || lpad(_seq::TEXT, 5, '0');
END;
$$;

-- 15) TRIGGERS für updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 16) NEUE PERMISSIONS FÜR LAGERVERWALTUNG
INSERT INTO public.permissions (key, description, category) VALUES
  ('VIEW_INVENTORY', 'Lagerbestand einsehen', 'inventory'),
  ('VIEW_STOCK_MOVEMENTS', 'Lagerbewegungen einsehen', 'inventory'),
  ('CREATE_PURCHASE_ORDER', 'Bestellungen anlegen', 'inventory'),
  ('RECEIVE_GOODS', 'Wareneingang buchen', 'inventory'),
  ('CREATE_CONSUMPTION', 'Verbrauch buchen (im Auftrag)', 'inventory'),
  ('CREATE_MANUAL_OUT', 'Manuelle Entnahme buchen', 'inventory'),
  ('CREATE_TRANSFER', 'Umlagerung zwischen Filialen', 'inventory'),
  ('MANAGE_COMPLAINTS', 'Reklamationen verwalten', 'inventory'),
  ('APPROVE_WRITE_OFF', 'Abschreibungen freigeben', 'inventory'),
  ('CONDUCT_INVENTORY', 'Inventur durchführen', 'inventory'),
  ('APPROVE_INVENTORY', 'Inventurkorrekturen freigeben', 'inventory'),
  ('MANAGE_SUPPLIERS', 'Lieferanten verwalten', 'inventory')
ON CONFLICT (key) DO NOTHING;

-- 17) DEFAULT PERMISSIONS FÜR ROLLEN
-- TECHNIKER: Nur Verbrauch im Auftrag
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('TECHNIKER', 'VIEW_INVENTORY'),
  ('TECHNIKER', 'VIEW_STOCK_MOVEMENTS'),
  ('TECHNIKER', 'CREATE_CONSUMPTION')
ON CONFLICT DO NOTHING;

-- FILIALLEITER: Wareneingang, Umlagerung, Reklamation, Inventur
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('FILIALLEITER', 'VIEW_INVENTORY'),
  ('FILIALLEITER', 'VIEW_STOCK_MOVEMENTS'),
  ('FILIALLEITER', 'CREATE_PURCHASE_ORDER'),
  ('FILIALLEITER', 'RECEIVE_GOODS'),
  ('FILIALLEITER', 'CREATE_CONSUMPTION'),
  ('FILIALLEITER', 'CREATE_TRANSFER'),
  ('FILIALLEITER', 'MANAGE_COMPLAINTS'),
  ('FILIALLEITER', 'CONDUCT_INVENTORY'),
  ('FILIALLEITER', 'MANAGE_SUPPLIERS')
ON CONFLICT DO NOTHING;

-- ADMIN: Alles
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('ADMIN', 'VIEW_INVENTORY'),
  ('ADMIN', 'VIEW_STOCK_MOVEMENTS'),
  ('ADMIN', 'CREATE_PURCHASE_ORDER'),
  ('ADMIN', 'RECEIVE_GOODS'),
  ('ADMIN', 'CREATE_CONSUMPTION'),
  ('ADMIN', 'CREATE_MANUAL_OUT'),
  ('ADMIN', 'CREATE_TRANSFER'),
  ('ADMIN', 'MANAGE_COMPLAINTS'),
  ('ADMIN', 'APPROVE_WRITE_OFF'),
  ('ADMIN', 'CONDUCT_INVENTORY'),
  ('ADMIN', 'APPROVE_INVENTORY'),
  ('ADMIN', 'MANAGE_SUPPLIERS')
ON CONFLICT DO NOTHING;

-- 18) ERSTELLE DEFAULT STOCK LOCATIONS FÜR EXISTIERENDE LOCATIONS
INSERT INTO public.stock_locations (location_id, name, is_default)
SELECT id, 'Hauptlager', true
FROM public.locations
WHERE NOT EXISTS (
  SELECT 1 FROM public.stock_locations sl WHERE sl.location_id = locations.id
);