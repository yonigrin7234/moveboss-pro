-- Create storage bucket for compliance documents
-- Used for W-9s, Insurance Certificates, Hauling Agreements, etc.

-- Create the compliance-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for compliance-documents bucket
-- Allow authenticated users to upload compliance documents
DROP POLICY IF EXISTS "Users can upload compliance documents" ON storage.objects;
CREATE POLICY "Users can upload compliance documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
);

-- Allow authenticated users to view compliance documents
DROP POLICY IF EXISTS "Users can view compliance documents" ON storage.objects;
CREATE POLICY "Users can view compliance documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'compliance-documents');

-- Allow authenticated users to delete compliance documents
DROP POLICY IF EXISTS "Users can delete compliance documents" ON storage.objects;
CREATE POLICY "Users can delete compliance documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'compliance-documents');
