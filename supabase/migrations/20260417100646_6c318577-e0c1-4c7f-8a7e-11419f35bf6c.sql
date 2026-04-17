-- Tighten B2B upload policy: must reference a ticket owned by the user's partner
DROP POLICY IF EXISTS "B2B users can upload ticket photos" ON storage.objects;

CREATE POLICY "B2B users can upload ticket photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-photos'
  AND is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.repair_tickets rt
    WHERE rt.id::text = (storage.foldername(name))[1]
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);

-- Add UPDATE policies (employees + scoped B2B)
CREATE POLICY "Employees can update ticket photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'ticket-photos' AND is_employee(auth.uid()))
WITH CHECK (bucket_id = 'ticket-photos' AND is_employee(auth.uid()));

CREATE POLICY "B2B users can update own ticket photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'ticket-photos'
  AND is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.repair_tickets rt
    WHERE rt.id::text = (storage.foldername(name))[1]
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'ticket-photos'
  AND is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.repair_tickets rt
    WHERE rt.id::text = (storage.foldername(name))[1]
      AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);