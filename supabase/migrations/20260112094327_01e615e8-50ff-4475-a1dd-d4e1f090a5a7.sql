
-- ==============================================
-- MASTER BUGFIX v3 - RLS Policies fixes
-- ==============================================

-- 1) Fix model_requests RLS for B2B INSERT
DROP POLICY IF EXISTS "B2B users can request models" ON public.model_requests;
CREATE POLICY "B2B users can request models"
  ON public.model_requests
  FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) AND
    b2b_partner_id = get_b2b_partner_id(auth.uid()) AND
    requested_by = auth.uid()
  );

-- B2B can view their own requests
DROP POLICY IF EXISTS "B2B users can view own requests" ON public.model_requests;
CREATE POLICY "B2B users can view own requests"
  ON public.model_requests
  FOR SELECT
  USING (
    is_b2b_user(auth.uid()) AND
    b2b_partner_id = get_b2b_partner_id(auth.uid())
  );

-- Admins can manage all requests
DROP POLICY IF EXISTS "Admins can manage model requests" ON public.model_requests;
CREATE POLICY "Admins can manage model requests"
  ON public.model_requests
  FOR ALL
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- 2) Fix ticket_messages RLS for B2B - they need to see b2b_message type
DROP POLICY IF EXISTS "B2B users can add ticket messages" ON public.ticket_messages;
CREATE POLICY "B2B users can add ticket messages"
  ON public.ticket_messages
  FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) AND
    message_type = 'b2b_message' AND
    sender_user_id = auth.uid() AND
    (EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_messages.repair_ticket_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    ))
  );

DROP POLICY IF EXISTS "B2B users can view own ticket messages" ON public.ticket_messages;
CREATE POLICY "B2B users can view own ticket messages"
  ON public.ticket_messages
  FOR SELECT
  USING (
    is_b2b_user(auth.uid()) AND
    message_type IN ('b2b_message', 'customer_message') AND
    (EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_messages.repair_ticket_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    ))
  );

-- 3) Fix ticket_photos RLS for B2B (table already exists with correct columns)
DROP POLICY IF EXISTS "Employees can manage ticket photos" ON public.ticket_photos;
CREATE POLICY "Employees can manage ticket photos"
  ON public.ticket_photos
  FOR ALL
  USING (
    is_employee(auth.uid()) AND
    (EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_photos.repair_ticket_id
      AND can_view_location(auth.uid(), rt.location_id)
    ))
  );

DROP POLICY IF EXISTS "B2B users can view own ticket photos" ON public.ticket_photos;
CREATE POLICY "B2B users can view own ticket photos"
  ON public.ticket_photos
  FOR SELECT
  USING (
    is_b2b_user(auth.uid()) AND
    (EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_photos.repair_ticket_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    ))
  );

-- B2B can also upload photos to their tickets
DROP POLICY IF EXISTS "B2B users can upload ticket photos" ON public.ticket_photos;
CREATE POLICY "B2B users can upload ticket photos"
  ON public.ticket_photos
  FOR INSERT
  WITH CHECK (
    is_b2b_user(auth.uid()) AND
    (EXISTS (
      SELECT 1 FROM repair_tickets rt
      WHERE rt.id = ticket_photos.repair_ticket_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
    ))
  );

-- 4) Ensure device_catalog has proper indexes for sorting
CREATE INDEX IF NOT EXISTS idx_device_catalog_sort ON public.device_catalog (brand, device_type, sort_order NULLS LAST, model);
