-- KVA-Status ENUM
CREATE TYPE public.kva_status AS ENUM (
  'ENTWURF',
  'ERSTELLT', 
  'GESENDET',
  'WARTET_AUF_ANTWORT',
  'FREIGEGEBEN',
  'ABGELEHNT',
  'ENTSORGEN',
  'RUECKFRAGE',
  'ABGELAUFEN'
);

-- KVA-Typ ENUM
CREATE TYPE public.kva_type AS ENUM (
  'FIXPREIS',
  'VARIABEL',
  'BIS_ZU'
);

-- Kommunikationsweg für manuelle Freigabe
CREATE TYPE public.kva_approval_channel AS ENUM (
  'ONLINE',
  'TELEFON',
  'VOR_ORT',
  'EMAIL',
  'SMS'
);

-- Haupttabelle für KVA mit Versionierung
CREATE TABLE public.kva_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_ticket_id UUID NOT NULL REFERENCES public.repair_tickets(id) ON DELETE CASCADE,
  
  -- Versionierung
  version INTEGER NOT NULL DEFAULT 1,
  parent_kva_id UUID REFERENCES public.kva_estimates(id),
  is_current BOOLEAN NOT NULL DEFAULT true,
  
  -- KVA-Typ
  kva_type public.kva_type NOT NULL DEFAULT 'VARIABEL',
  
  -- Status
  status public.kva_status NOT NULL DEFAULT 'ENTWURF',
  
  -- Preise
  repair_cost NUMERIC(10,2),
  parts_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2),
  min_cost NUMERIC(10,2), -- Für BIS_ZU Typ
  max_cost NUMERIC(10,2), -- Für BIS_ZU Typ
  
  -- KVA-Gebühr
  kva_fee_amount NUMERIC(10,2) DEFAULT 35.00,
  kva_fee_waived BOOLEAN DEFAULT false,
  kva_fee_waiver_reason TEXT,
  kva_fee_waiver_by UUID REFERENCES public.profiles(id),
  
  -- Fristen
  valid_until TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE,
  
  -- Kommunikation
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_via public.notification_channel,
  
  -- Freigabe/Ablehnung
  decision public.kva_status,
  decision_at TIMESTAMP WITH TIME ZONE,
  decision_by_customer BOOLEAN DEFAULT true,
  decision_channel public.kva_approval_channel,
  decision_note TEXT,
  
  -- Bei Ablehnung
  disposal_option TEXT CHECK (disposal_option IN ('ZURUECKSENDEN', 'KOSTENLOS_ENTSORGEN')),
  
  -- Rückfrage
  customer_question TEXT,
  staff_answer TEXT,
  
  -- B2B-spezifisch
  internal_price NUMERIC(10,2), -- Preis für B2B-Partner
  endcustomer_price NUMERIC(10,2), -- Preis für Endkunde
  endcustomer_price_released BOOLEAN DEFAULT false,
  
  -- Diagnose/Beschreibung
  diagnosis TEXT,
  repair_description TEXT,
  notes TEXT,
  
  -- Ersteller
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index für schnellen Zugriff
CREATE INDEX idx_kva_estimates_ticket ON public.kva_estimates(repair_ticket_id);
CREATE INDEX idx_kva_estimates_status ON public.kva_estimates(status);
CREATE INDEX idx_kva_estimates_current ON public.kva_estimates(repair_ticket_id, is_current) WHERE is_current = true;

-- Trigger für updated_at
CREATE TRIGGER update_kva_estimates_updated_at
  BEFORE UPDATE ON public.kva_estimates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- KVA-Historie für Änderungsnachvollziehbarkeit
CREATE TABLE public.kva_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kva_estimate_id UUID NOT NULL REFERENCES public.kva_estimates(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- z.B. 'ERSTELLT', 'GESENDET', 'PREIS_GEAENDERT', 'FREIGEGEBEN'
  old_values JSONB,
  new_values JSONB,
  
  user_id UUID REFERENCES public.profiles(id),
  note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_kva_history_estimate ON public.kva_history(kva_estimate_id);

-- RLS für kva_estimates
ALTER TABLE public.kva_estimates ENABLE ROW LEVEL SECURITY;

-- Mitarbeiter können alle KVAs ihrer Standorte sehen
CREATE POLICY "Employees can view KVAs for their locations"
  ON public.kva_estimates FOR SELECT
  USING (
    is_employee(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM repair_tickets rt 
      WHERE rt.id = kva_estimates.repair_ticket_id 
      AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- Mitarbeiter können KVAs erstellen
CREATE POLICY "Employees can create KVAs"
  ON public.kva_estimates FOR INSERT
  WITH CHECK (is_employee(auth.uid()));

-- Mitarbeiter können KVAs aktualisieren
CREATE POLICY "Employees can update KVAs"
  ON public.kva_estimates FOR UPDATE
  USING (
    is_employee(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM repair_tickets rt 
      WHERE rt.id = kva_estimates.repair_ticket_id 
      AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- B2B-Partner können ihre eigenen KVAs sehen
CREATE POLICY "B2B users can view own KVAs"
  ON public.kva_estimates FOR SELECT
  USING (
    is_b2b_user(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM repair_tickets rt 
      WHERE rt.id = kva_estimates.repair_ticket_id 
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

-- B2B-Partner können Endkundenpreis setzen
CREATE POLICY "B2B users can update endcustomer price"
  ON public.kva_estimates FOR UPDATE
  USING (
    is_b2b_user(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM repair_tickets rt 
      WHERE rt.id = kva_estimates.repair_ticket_id 
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

-- RLS für kva_history
ALTER TABLE public.kva_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view KVA history"
  ON public.kva_history FOR SELECT
  USING (
    is_employee(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM kva_estimates ke
      JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
      WHERE ke.id = kva_history.kva_estimate_id
      AND can_view_location(auth.uid(), rt.location_id)
    )
  );

CREATE POLICY "Employees can add KVA history"
  ON public.kva_history FOR INSERT
  WITH CHECK (is_employee(auth.uid()));

-- B2B können History sehen
CREATE POLICY "B2B users can view own KVA history"
  ON public.kva_history FOR SELECT
  USING (
    is_b2b_user(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM kva_estimates ke
      JOIN repair_tickets rt ON rt.id = ke.repair_ticket_id
      WHERE ke.id = kva_history.kva_estimate_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

-- Standard-KVA-Gebühren pro Gerätetyp (optional, für spätere Nutzung)
CREATE TABLE public.kva_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_type public.device_type,
  b2b_partner_id UUID REFERENCES public.b2b_partners(id),
  fee_amount NUMERIC(10,2) NOT NULL DEFAULT 35.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(device_type, b2b_partner_id)
);

ALTER TABLE public.kva_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage fee settings"
  ON public.kva_fee_settings FOR ALL
  USING (is_employee(auth.uid()))
  WITH CHECK (is_employee(auth.uid()));

CREATE POLICY "B2B can view their fee settings"
  ON public.kva_fee_settings FOR SELECT
  USING (
    is_b2b_user(auth.uid()) AND 
    b2b_partner_id = get_b2b_partner_id(auth.uid())
  );