-- B2B partners may read spare part usage rows of their own tickets (needed for the repair report)
CREATE POLICY "B2B can view part usage on own tickets"
ON public.ticket_part_usage
FOR SELECT
TO authenticated
USING (
  is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.repair_tickets rt
    WHERE rt.id = ticket_part_usage.repair_ticket_id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

-- B2B partners may read the parts referenced by that usage (for names on documents)
CREATE POLICY "B2B can view parts used on own tickets"
ON public.parts
FOR SELECT
TO authenticated
USING (
  is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.ticket_part_usage tpu
    JOIN public.repair_tickets rt ON rt.id = tpu.repair_ticket_id
    WHERE tpu.part_id = parts.id
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

GRANT SELECT ON public.ticket_part_usage TO authenticated;
GRANT SELECT ON public.parts TO authenticated;