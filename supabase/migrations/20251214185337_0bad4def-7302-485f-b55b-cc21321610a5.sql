-- Create storage bucket for intake documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('intake_documents', 'intake_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated employees to upload intake documents
CREATE POLICY "Employees can upload intake documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'intake_documents' 
  AND is_employee(auth.uid())
);

-- Allow authenticated employees to view intake documents
CREATE POLICY "Employees can view intake documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'intake_documents' 
  AND is_employee(auth.uid())
);

-- Allow authenticated employees to delete intake documents
CREATE POLICY "Employees can delete intake documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'intake_documents' 
  AND is_employee(auth.uid())
);