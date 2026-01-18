-- =====================================================
-- RLS POLICIES PARA OZZSTORE ADMIN
-- Ejecutar este script completo en Supabase SQL Editor
-- =====================================================

-- Función helper (si no existe)
CREATE OR REPLACE FUNCTION get_my_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT store_id FROM store_members WHERE user_id = auth.uid()
$$;

-- ============ STORES ============
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stores_public_read" ON stores;
DROP POLICY IF EXISTS "stores_member_all" ON stores;

CREATE POLICY "stores_public_read" ON stores FOR SELECT USING (active = true);
CREATE POLICY "stores_member_all" ON stores FOR ALL USING (id IN (SELECT get_my_store_ids()));

-- ============ STORE_MEMBERS ============
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_read_own" ON store_members;

CREATE POLICY "members_read_own" ON store_members FOR SELECT USING (user_id = auth.uid());

-- ============ PRODUCTS ============
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_member_all" ON products;

CREATE POLICY "products_public_read" ON products FOR SELECT USING (active = true);
CREATE POLICY "products_member_all" ON products FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ VARIANTS ============
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "variants_public_read" ON variants;
DROP POLICY IF EXISTS "variants_member_all" ON variants;

CREATE POLICY "variants_public_read" ON variants FOR SELECT USING (active = true);
CREATE POLICY "variants_member_all" ON variants FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ CATEGORIES ============
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "categories_member_all" ON categories;

CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (active = true);
CREATE POLICY "categories_member_all" ON categories FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ BRANDS ============
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_public_read" ON brands;
DROP POLICY IF EXISTS "brands_member_all" ON brands;

CREATE POLICY "brands_public_read" ON brands FOR SELECT USING (active = true);
CREATE POLICY "brands_member_all" ON brands FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ INVENTORY ============
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_member_all" ON inventory;

CREATE POLICY "inventory_member_all" ON inventory FOR ALL USING (
  variant_id IN (SELECT id FROM variants WHERE store_id IN (SELECT get_my_store_ids()))
);

-- ============ PRODUCT_MEDIA ============
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "media_public_read" ON product_media;
DROP POLICY IF EXISTS "media_member_all" ON product_media;

CREATE POLICY "media_public_read" ON product_media FOR SELECT USING (true);
CREATE POLICY "media_member_all" ON product_media FOR ALL USING (
  product_id IN (SELECT id FROM products WHERE store_id IN (SELECT get_my_store_ids()))
);

-- ============ OPTION_GROUPS ============
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "option_groups_public_read" ON option_groups;
DROP POLICY IF EXISTS "option_groups_member_all" ON option_groups;

CREATE POLICY "option_groups_public_read" ON option_groups FOR SELECT USING (active = true);
CREATE POLICY "option_groups_member_all" ON option_groups FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ OPTION_VALUES ============
ALTER TABLE option_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "option_values_public_read" ON option_values;
DROP POLICY IF EXISTS "option_values_member_all" ON option_values;

CREATE POLICY "option_values_public_read" ON option_values FOR SELECT USING (active = true);
CREATE POLICY "option_values_member_all" ON option_values FOR ALL USING (
  option_group_id IN (SELECT id FROM option_groups WHERE store_id IN (SELECT get_my_store_ids()))
);

-- ============ PAGES ============
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pages_public_read" ON pages;
DROP POLICY IF EXISTS "pages_member_all" ON pages;

CREATE POLICY "pages_public_read" ON pages FOR SELECT USING (status = 'published');
CREATE POLICY "pages_member_all" ON pages FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ PAGE_SECTIONS ============
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sections_public_read" ON page_sections;
DROP POLICY IF EXISTS "sections_member_all" ON page_sections;

CREATE POLICY "sections_public_read" ON page_sections FOR SELECT USING (
  page_id IN (SELECT id FROM pages WHERE status = 'published')
);
CREATE POLICY "sections_member_all" ON page_sections FOR ALL USING (
  page_id IN (SELECT id FROM pages WHERE store_id IN (SELECT get_my_store_ids()))
);

-- ============ INQUIRIES ============
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiries_member_all" ON inquiries;

CREATE POLICY "inquiries_member_all" ON inquiries FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ INQUIRY_ITEMS ============
ALTER TABLE inquiry_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inquiry_items_member_all" ON inquiry_items;

CREATE POLICY "inquiry_items_member_all" ON inquiry_items FOR ALL USING (
  inquiry_id IN (SELECT id FROM inquiries WHERE store_id IN (SELECT get_my_store_ids()))
);

-- ============ SETTINGS ============
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_public_read" ON settings;
DROP POLICY IF EXISTS "settings_member_all" ON settings;

CREATE POLICY "settings_public_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_member_all" ON settings FOR ALL USING (store_id IN (SELECT get_my_store_ids()));

-- ============ PRODUCT_OPTION_GROUPS ============
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pog_public_read" ON product_option_groups;
DROP POLICY IF EXISTS "pog_member_all" ON product_option_groups;

CREATE POLICY "pog_public_read" ON product_option_groups FOR SELECT USING (true);
CREATE POLICY "pog_member_all" ON product_option_groups FOR ALL USING (
  product_id IN (SELECT id FROM products WHERE store_id IN (SELECT get_my_store_ids()))
);

-- ============ VARIANT_OPTION_VALUES ============
ALTER TABLE variant_option_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vov_public_read" ON variant_option_values;
DROP POLICY IF EXISTS "vov_member_all" ON variant_option_values;

CREATE POLICY "vov_public_read" ON variant_option_values FOR SELECT USING (true);
CREATE POLICY "vov_member_all" ON variant_option_values FOR ALL USING (
  variant_id IN (SELECT id FROM variants WHERE store_id IN (SELECT get_my_store_ids()))
);

-- =====================================================
-- DONE! Todas las políticas RLS configuradas
-- =====================================================
