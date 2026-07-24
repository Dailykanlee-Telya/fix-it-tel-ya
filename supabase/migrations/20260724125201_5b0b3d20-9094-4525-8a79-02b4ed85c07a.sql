
-- 1) Storage: B2B SELECT must also honor ticket_photos.b2b_visible
DROP POLICY IF EXISTS "B2B users can view own ticket photos" ON storage.objects;

CREATE POLICY "B2B users can view own ticket photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-photos'
  AND is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.ticket_photos tp
    JOIN public.repair_tickets rt ON rt.id = tp.repair_ticket_id
    WHERE tp.storage_url LIKE '%' || objects.name
      AND tp.b2b_visible = true
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

-- Also fix the duplicate table-level policy that bypasses b2b_visible
DROP POLICY IF EXISTS "B2B users can view own ticket photos" ON public.ticket_photos;

-- 2) feedback INSERT: require inserter to be linked to the ticket
DROP POLICY IF EXISTS "Authenticated users can insert feedback for valid tickets" ON public.feedback;

CREATE POLICY "Authenticated users can insert feedback for valid tickets"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  repair_ticket_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.repair_tickets rt
    WHERE rt.id = feedback.repair_ticket_id
      AND (
        -- Employee assigned to the ticket's location/workshop
        (is_employee(auth.uid()) AND (
          (rt.is_b2b = false AND can_view_location(auth.uid(), rt.location_id))
          OR (rt.is_b2b = true AND can_view_workshop(auth.uid(), rt.workshop_id))
        ))
        -- B2B partner owning the ticket
        OR (is_b2b_user(auth.uid()) AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid()))
      )
  )
);
