-- =====================================================
-- RLS POLICIES PARA TODAS LAS TABLAS DE ADMIN
-- Ejecuta en Supabase SQL Editor
-- =====================================================

-- PRODUCTS: Lectura pública (activos), escritura para miembros
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

CREATE POLICY "products_select" ON products 
FOR SELECT USING (true);

CREATE POLICY "products_insert" ON products 
FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

CREATE POLICY "products_update" ON products 
FOR UPDATE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

CREATE POLICY "products_delete" ON products 
FOR DELETE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- VARIANTS
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "variants_select" ON variants;
DROP POLICY IF EXISTS "variants_insert" ON variants;
DROP POLICY IF EXISTS "variants_update" ON variants;
DROP POLICY IF EXISTS "variants_delete" ON variants;

CREATE POLICY "variants_select" ON variants FOR SELECT USING (true);
CREATE POLICY "variants_insert" ON variants FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "variants_update" ON variants FOR UPDATE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "variants_delete" ON variants FOR DELETE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- BRANDS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_select" ON brands;
DROP POLICY IF EXISTS "brands_insert" ON brands;
DROP POLICY IF EXISTS "brands_update" ON brands;
DROP POLICY IF EXISTS "brands_delete" ON brands;

CREATE POLICY "brands_select" ON brands FOR SELECT USING (true);
CREATE POLICY "brands_insert" ON brands FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "brands_update" ON brands FOR UPDATE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "brands_delete" ON brands FOR DELETE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- INQUIRIES
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiries_select" ON inquiries;
DROP POLICY IF EXISTS "inquiries_insert" ON inquiries;
DROP POLICY IF EXISTS "inquiries_update" ON inquiries;
DROP POLICY IF EXISTS "inquiries_delete" ON inquiries;

CREATE POLICY "inquiries_select" ON inquiries FOR SELECT USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "inquiries_insert" ON inquiries FOR INSERT WITH CHECK (true);  -- Cualquiera puede crear consulta
CREATE POLICY "inquiries_update" ON inquiries FOR UPDATE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "inquiries_delete" ON inquiries FOR DELETE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- INVENTORY
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_select" ON inventory;
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
DROP POLICY IF EXISTS "inventory_update" ON inventory;
DROP POLICY IF EXISTS "inventory_delete" ON inventory;

CREATE POLICY "inventory_select" ON inventory FOR SELECT USING (true);
CREATE POLICY "inventory_insert" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "inventory_update" ON inventory FOR UPDATE USING (true);
CREATE POLICY "inventory_delete" ON inventory FOR DELETE USING (true);

-- SETTINGS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;

CREATE POLICY "settings_select" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON settings FOR INSERT WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- PRODUCT_MEDIA
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_media_select" ON product_media;
DROP POLICY IF EXISTS "product_media_all" ON product_media;

CREATE POLICY "product_media_select" ON product_media FOR SELECT USING (true);
CREATE POLICY "product_media_all" ON product_media FOR ALL USING (true);

-- =====================================================
-- DONE!
-- =====================================================
