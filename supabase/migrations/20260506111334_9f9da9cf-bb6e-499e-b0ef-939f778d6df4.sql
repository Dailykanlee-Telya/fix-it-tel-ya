-- Drop the overly broad storage policy that allows any B2B user to read all ticket photos
DROP POLICY "Authenticated users can view ticket photos" ON storage.objects;