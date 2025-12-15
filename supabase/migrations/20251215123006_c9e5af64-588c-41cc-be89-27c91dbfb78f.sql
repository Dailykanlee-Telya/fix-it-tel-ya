-- Add storage policies for B2B users to upload and view ticket photos

-- Allow B2B users to upload photos
CREATE POLICY "B2B users can upload ticket photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-photos' 
  AND is_b2b_user(auth.uid())
);

-- Update SELECT policy to include B2B users
DROP POLICY IF EXISTS "Employees can view ticket photos" ON storage.objects;

CREATE POLICY "Authenticated users can view ticket photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-photos' 
  AND (is_employee(auth.uid()) OR is_b2b_user(auth.uid()))
);
