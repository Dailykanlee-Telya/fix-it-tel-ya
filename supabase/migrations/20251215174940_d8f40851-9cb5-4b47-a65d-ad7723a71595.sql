
-- =============================================
-- UPDATE RLS POLICIES FOR LOCATION-BASED ACCESS
-- =============================================

-- status_history: Only allow viewing history for tickets user can view
DROP POLICY IF EXISTS "Employees can view status history" ON public.status_history;
CREATE POLICY "Employees can view status history for their locations"
  ON public.status_history FOR SELECT
  USING (
    is_employee(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = status_history.repair_ticket_id
        AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- ticket_part_usage: Only allow viewing parts for tickets user can view
DROP POLICY IF EXISTS "Employees can view part usage" ON public.ticket_part_usage;
CREATE POLICY "Employees can view part usage for their locations"
  ON public.ticket_part_usage FOR SELECT
  USING (
    is_employee(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_part_usage.repair_ticket_id
        AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- ticket_checklist_items: Only allow viewing checklists for tickets user can view
DROP POLICY IF EXISTS "Employees can view ticket checklists" ON public.ticket_checklist_items;
CREATE POLICY "Employees can view ticket checklists for their locations"
  ON public.ticket_checklist_items FOR SELECT
  USING (
    is_employee(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_checklist_items.repair_ticket_id
        AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- ticket_internal_notes: Only allow viewing notes for tickets user can view
DROP POLICY IF EXISTS "Employees can view internal notes" ON public.ticket_internal_notes;
CREATE POLICY "Employees can view internal notes for their locations"
  ON public.ticket_internal_notes FOR SELECT
  USING (
    is_employee(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_internal_notes.repair_ticket_id
        AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- ticket_messages: Only allow viewing messages for tickets user can view
DROP POLICY IF EXISTS "Employees can view all messages" ON public.ticket_messages;
CREATE POLICY "Employees can view messages for their locations"
  ON public.ticket_messages FOR SELECT
  USING (
    is_employee(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_messages.repair_ticket_id
        AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- ticket_photos: Only allow viewing photos for tickets user can view
DROP POLICY IF EXISTS "Employees can view photos" ON public.ticket_photos;
CREATE POLICY "Employees can view photos for their locations"
  ON public.ticket_photos FOR SELECT
  USING (
    is_employee(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.repair_tickets rt
      WHERE rt.id = ticket_photos.repair_ticket_id
        AND can_view_location(auth.uid(), rt.location_id)
    )
  );

-- feedback: Only allow viewing feedback for tickets user can view
DROP POLICY IF EXISTS "Employees can view feedback" ON public.feedback;
CREATE POLICY "Employees can view feedback for their locations"
  ON public.feedback FOR SELECT
  USING (
    is_employee(auth.uid())
    AND (
      repair_ticket_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.repair_tickets rt
        WHERE rt.id = feedback.repair_ticket_id
          AND can_view_location(auth.uid(), rt.location_id)
      )
    )
  );

-- notification_logs: Users can only see their own notifications (already correct, no change needed)

-- =============================================
-- UPDATE INSERT/UPDATE POLICIES FOR TICKETS
-- =============================================

-- Employees can create tickets (location check at application level)
-- Keep existing policy as-is for creation

-- Update existing update policy to respect location access
DROP POLICY IF EXISTS "Employees can update tickets" ON public.repair_tickets;
CREATE POLICY "Employees can update tickets for their locations"
  ON public.repair_tickets FOR UPDATE
  USING (
    is_employee(auth.uid())
    AND can_view_location(auth.uid(), location_id)
  );

-- =============================================
-- PERMISSION CHECK FUNCTION FOR FRONTEND
-- =============================================

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT rp.permission_key
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  WHERE ur.user_id = _user_id
$$;

-- Function to get user's accessible locations
CREATE OR REPLACE FUNCTION public.get_user_locations(_user_id uuid)
RETURNS TABLE(location_id uuid, is_default boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ul.location_id, ul.is_default
  FROM public.user_locations ul
  WHERE ul.user_id = _user_id AND ul.can_view = true
$$;
