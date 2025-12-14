-- =============================================
-- B2B PORTAL - PART 2: Helper Functions & RLS Policies
-- =============================================

-- 1) Helper function to check if user is B2B
CREATE OR REPLACE FUNCTION public.is_b2b_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id 
        AND role IN ('B2B_ADMIN', 'B2B_USER')
    )
  END
$$;

-- 2) Helper function to get user's B2B partner ID
CREATE OR REPLACE FUNCTION public.get_b2b_partner_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b2b_partner_id FROM public.profiles WHERE id = _user_id
$$;

-- =============================================
-- RLS POLICIES FOR B2B TABLES
-- =============================================

-- b2b_partners policies
CREATE POLICY "Employees can view all B2B partners"
  ON public.b2b_partners FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Admins can manage B2B partners"
  ON public.b2b_partners FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "B2B users can view own partner"
  ON public.b2b_partners FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND id = get_b2b_partner_id(auth.uid())
  );

-- b2b_shipments policies
CREATE POLICY "Employees can view all shipments"
  ON public.b2b_shipments FOR SELECT
  USING (is_employee(auth.uid()));

CREATE POLICY "Employees can manage all shipments"
  ON public.b2b_shipments FOR ALL
  USING (is_employee(auth.uid()));

CREATE POLICY "B2B users can view own shipments"
  ON public.b2b_shipments FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  );

CREATE POLICY "B2B users can create own shipments"
  ON public.b2b_shipments FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  );

CREATE POLICY "B2B users can update own shipments"
  ON public.b2b_shipments FOR UPDATE
  USING (
    is_b2b_user(auth.uid()) 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  );

-- Extend repair_tickets policies for B2B
CREATE POLICY "B2B users can view own tickets"
  ON public.repair_tickets FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  );

CREATE POLICY "B2B users can create own tickets"
  ON public.repair_tickets FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
    AND is_b2b = true
  );

CREATE POLICY "B2B users can update own tickets"
  ON public.repair_tickets FOR UPDATE
  USING (
    is_b2b_user(auth.uid()) 
    AND b2b_partner_id = get_b2b_partner_id(auth.uid())
  );

-- B2B access to related tables
CREATE POLICY "B2B users can view own ticket devices"
  ON public.devices FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.device_id = devices.id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "B2B users can create devices"
  ON public.devices FOR INSERT
  WITH CHECK (is_b2b_user(auth.uid()));

CREATE POLICY "B2B users can view own ticket photos"
  ON public.ticket_photos FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.id = ticket_photos.repair_ticket_id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "B2B users can add ticket photos"
  ON public.ticket_photos FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.id = ticket_photos.repair_ticket_id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "B2B users can view own ticket status history"
  ON public.status_history FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.id = status_history.repair_ticket_id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "B2B users can view own ticket messages"
  ON public.ticket_messages FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.id = ticket_messages.repair_ticket_id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

CREATE POLICY "B2B users can add ticket messages"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.id = ticket_messages.repair_ticket_id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );

-- B2B access to device catalog (read-only)
CREATE POLICY "B2B users can view device catalog"
  ON public.device_catalog FOR SELECT
  USING (is_b2b_user(auth.uid()));

-- B2B access to locations (read-only for selecting location)
CREATE POLICY "B2B users can view locations"
  ON public.locations FOR SELECT
  USING (is_b2b_user(auth.uid()));

-- B2B access to customers (for creating customer records)
CREATE POLICY "B2B users can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (is_b2b_user(auth.uid()));

CREATE POLICY "B2B users can view customers they created"
  ON public.customers FOR SELECT
  USING (
    is_b2b_user(auth.uid()) 
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt 
      WHERE rt.customer_id = customers.id 
        AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    )
  );