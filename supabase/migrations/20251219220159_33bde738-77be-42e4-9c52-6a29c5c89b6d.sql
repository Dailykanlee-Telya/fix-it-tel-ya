-- Make ticket-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'ticket-photos';

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view ticket photos" ON storage.objects;

-- Create proper RLS policy for employees to view ticket photos
CREATE POLICY "Employees can view ticket photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'ticket-photos' 
  AND is_employee(auth.uid())
);

-- Create policy for B2B users to view their own ticket photos
CREATE POLICY "B2B users can view own ticket photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'ticket-photos'
  AND is_b2b_user(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.ticket_photos tp
    JOIN public.repair_tickets rt ON rt.id = tp.repair_ticket_id
    WHERE tp.storage_url LIKE '%' || storage.objects.name
    AND rt.b2b_partner_id = get_b2b_partner_id(auth.uid())
  )
);