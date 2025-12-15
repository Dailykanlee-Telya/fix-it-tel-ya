-- Fix storage bucket security: add file size limit and MIME type restrictions
UPDATE storage.buckets 
SET file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
WHERE id = 'ticket-photos';

-- Also fix intake_documents bucket
UPDATE storage.buckets 
SET file_size_limit = 20971520, -- 20 MB for documents
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg', 'application/pdf']
WHERE id = 'intake_documents';