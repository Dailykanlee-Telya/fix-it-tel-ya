-- Fix: Make ticket-photos bucket private and update RLS policies

-- 1. Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'ticket-photos';

-- 2. Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view ticket photos" ON storage.objects;

-- 3. Create a proper employee-only read policy
CREATE POLICY "Employees can view ticket photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'ticket-photos' 
  AND public.is_employee(auth.uid())
);