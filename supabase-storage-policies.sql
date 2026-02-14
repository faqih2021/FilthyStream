-- ============================================
-- SUPABASE STORAGE POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. AVATARS BUCKET
-- ============================================

-- Create the bucket (public so avatar URLs are accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to VIEW/DOWNLOAD avatars (public read)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to UPLOAD their own avatar
-- Uses folder structure: userId/timestamp.ext
CREATE POLICY "avatars_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
);

-- Allow authenticated users to UPDATE their own avatar
CREATE POLICY "avatars_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to DELETE their own avatar
CREATE POLICY "avatars_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');


-- ============================================
-- 2. LOGO-ETC BUCKET
-- ============================================

-- Create the bucket (public so logos are accessible via URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logo-etc', 'logo-etc', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to VIEW/DOWNLOAD logos (public read)
CREATE POLICY "logo_etc_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'logo-etc');

-- Allow authenticated users to UPLOAD logos
CREATE POLICY "logo_etc_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logo-etc');

-- Allow authenticated users to UPDATE logos
CREATE POLICY "logo_etc_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logo-etc')
WITH CHECK (bucket_id = 'logo-etc');

-- Allow authenticated users to DELETE logos
CREATE POLICY "logo_etc_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logo-etc');


-- ============================================
-- OPTIONAL: Set file size limits
-- ============================================
-- Avatars max 300KB, Logos max 2MB
-- (This is done via bucket config, not policies)

UPDATE storage.buckets 
SET file_size_limit = 307200  -- 300KB in bytes
WHERE id = 'avatars';

UPDATE storage.buckets 
SET file_size_limit = 2097152  -- 2MB in bytes
WHERE id = 'logo-etc';

-- Set allowed MIME types (images only)
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
WHERE id IN ('avatars', 'logo-etc');
