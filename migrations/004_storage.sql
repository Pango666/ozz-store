-- =====================================================
-- OZZSTORE STORAGE CONFIGURATION
-- File: 004_storage.sql
-- Run AFTER 003_rls_policies.sql
-- =====================================================

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Products bucket - for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Brands bucket - for brand logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brands',
  'brands',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Categories bucket - for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'categories',
  'categories',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Stores bucket - for store logos and assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stores',
  'stores',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO NOTHING;

-- Pages bucket - for CMS content images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pages',
  'pages',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- Public read for all buckets
-- Authenticated users can upload/manage files
-- =====================================================

-- PRODUCTS bucket policies
DROP POLICY IF EXISTS "products_public_read" ON storage.objects;
CREATE POLICY "products_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "products_auth_upload" ON storage.objects;
CREATE POLICY "products_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "products_auth_update" ON storage.objects;
CREATE POLICY "products_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "products_auth_delete" ON storage.objects;
CREATE POLICY "products_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- BRANDS bucket policies
DROP POLICY IF EXISTS "brands_public_read" ON storage.objects;
CREATE POLICY "brands_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'brands');

DROP POLICY IF EXISTS "brands_auth_upload" ON storage.objects;
CREATE POLICY "brands_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'brands' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "brands_auth_update" ON storage.objects;
CREATE POLICY "brands_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'brands' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "brands_auth_delete" ON storage.objects;
CREATE POLICY "brands_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'brands' AND auth.role() = 'authenticated');

-- CATEGORIES bucket policies
DROP POLICY IF EXISTS "categories_public_read" ON storage.objects;
CREATE POLICY "categories_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'categories');

DROP POLICY IF EXISTS "categories_auth_upload" ON storage.objects;
CREATE POLICY "categories_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'categories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "categories_auth_update" ON storage.objects;
CREATE POLICY "categories_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'categories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "categories_auth_delete" ON storage.objects;
CREATE POLICY "categories_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'categories' AND auth.role() = 'authenticated');

-- STORES bucket policies
DROP POLICY IF EXISTS "stores_public_read" ON storage.objects;
CREATE POLICY "stores_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'stores');

DROP POLICY IF EXISTS "stores_auth_upload" ON storage.objects;
CREATE POLICY "stores_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stores' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stores_auth_update" ON storage.objects;
CREATE POLICY "stores_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stores' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stores_auth_delete" ON storage.objects;
CREATE POLICY "stores_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'stores' AND auth.role() = 'authenticated');

-- PAGES bucket policies
DROP POLICY IF EXISTS "pages_public_read" ON storage.objects;
CREATE POLICY "pages_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pages');

DROP POLICY IF EXISTS "pages_auth_upload" ON storage.objects;
CREATE POLICY "pages_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pages' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pages_auth_update" ON storage.objects;
CREATE POLICY "pages_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'pages' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "pages_auth_delete" ON storage.objects;
CREATE POLICY "pages_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'pages' AND auth.role() = 'authenticated');

-- =====================================================
-- DONE! All migrations complete.
-- See README.md for setup instructions.
-- =====================================================
