-- Create storage buckets for mobile app uploads
-- receipts: expense receipt photos
-- load-photos: photos taken during load workflow (loading start/end, delivery)

-- Create the receipts bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
-- Create the load-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'load-photos',
  'load-photos',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
-- RLS Policies for receipts bucket
-- Allow authenticated users to upload to their trip folders
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
);
-- Allow authenticated users to view receipts
DROP POLICY IF EXISTS "Users can view receipts" ON storage.objects;
CREATE POLICY "Users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');
-- Allow authenticated users to delete their own receipts
DROP POLICY IF EXISTS "Users can delete receipts" ON storage.objects;
CREATE POLICY "Users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
-- RLS Policies for load-photos bucket
-- Allow authenticated users to upload load photos
DROP POLICY IF EXISTS "Users can upload load photos" ON storage.objects;
CREATE POLICY "Users can upload load photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'load-photos'
);
-- Allow authenticated users to view load photos
DROP POLICY IF EXISTS "Users can view load photos" ON storage.objects;
CREATE POLICY "Users can view load photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'load-photos');
-- Allow authenticated users to delete load photos
DROP POLICY IF EXISTS "Users can delete load photos" ON storage.objects;
CREATE POLICY "Users can delete load photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'load-photos');
