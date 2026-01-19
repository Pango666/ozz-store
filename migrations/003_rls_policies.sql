-- =====================================================
-- OZZSTORE ROW LEVEL SECURITY POLICIES
-- File: 003_rls_policies.sql
-- Run AFTER 002_functions.sql
-- =====================================================

-- =====================================================
-- STORES
-- Public: Read active stores
-- Members: Full access to their stores
-- =====================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stores_select_public" ON stores;
DROP POLICY IF EXISTS "stores_update" ON stores;
DROP POLICY IF EXISTS "stores_delete" ON stores;

CREATE POLICY "stores_select_public" ON stores 
  FOR SELECT USING (true);

CREATE POLICY "stores_update" ON stores 
  FOR UPDATE USING (id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

CREATE POLICY "stores_delete" ON stores 
  FOR DELETE USING (id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));

-- =====================================================
-- STORE_MEMBERS
-- Users can only see their own memberships
-- =====================================================
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_members_select" ON store_members;
DROP POLICY IF EXISTS "store_members_insert" ON store_members;
DROP POLICY IF EXISTS "store_members_update" ON store_members;
DROP POLICY IF EXISTS "store_members_delete" ON store_members;

CREATE POLICY "store_members_select" ON store_members 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "store_members_insert" ON store_members 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "store_members_update" ON store_members 
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "store_members_delete" ON store_members 
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- CATEGORIES
-- Public: Read all (for storefront)
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

CREATE POLICY "categories_select" ON categories 
  FOR SELECT USING (true);

CREATE POLICY "categories_insert" ON categories 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "categories_update" ON categories 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "categories_delete" ON categories 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- BRANDS
-- Public: Read all
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_select" ON brands;
DROP POLICY IF EXISTS "brands_insert" ON brands;
DROP POLICY IF EXISTS "brands_update" ON brands;
DROP POLICY IF EXISTS "brands_delete" ON brands;

CREATE POLICY "brands_select" ON brands 
  FOR SELECT USING (true);

CREATE POLICY "brands_insert" ON brands 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "brands_update" ON brands 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "brands_delete" ON brands 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- PRODUCTS
-- Public: Read all (filter active in frontend)
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

CREATE POLICY "products_select" ON products 
  FOR SELECT USING (true);

CREATE POLICY "products_insert" ON products 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "products_update" ON products 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "products_delete" ON products 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- VARIANTS
-- Public: Read all
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variants_select" ON variants;
DROP POLICY IF EXISTS "variants_insert" ON variants;
DROP POLICY IF EXISTS "variants_update" ON variants;
DROP POLICY IF EXISTS "variants_delete" ON variants;

CREATE POLICY "variants_select" ON variants 
  FOR SELECT USING (true);

CREATE POLICY "variants_insert" ON variants 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "variants_update" ON variants 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "variants_delete" ON variants 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- INVENTORY
-- Public: Read all (for stock display)
-- Members: Full CRUD (via variant ownership)
-- =====================================================
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_select" ON inventory;
DROP POLICY IF EXISTS "inventory_insert" ON inventory;
DROP POLICY IF EXISTS "inventory_update" ON inventory;
DROP POLICY IF EXISTS "inventory_delete" ON inventory;

CREATE POLICY "inventory_select" ON inventory 
  FOR SELECT USING (true);

CREATE POLICY "inventory_insert" ON inventory 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "inventory_update" ON inventory 
  FOR UPDATE USING (true);

CREATE POLICY "inventory_delete" ON inventory 
  FOR DELETE USING (true);

-- =====================================================
-- PRODUCT_MEDIA
-- Public: Read all
-- Members: Full CRUD
-- =====================================================
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_media_select" ON product_media;
DROP POLICY IF EXISTS "product_media_all" ON product_media;

CREATE POLICY "product_media_select" ON product_media 
  FOR SELECT USING (true);

CREATE POLICY "product_media_all" ON product_media 
  FOR ALL USING (true);

-- =====================================================
-- OPTION_GROUPS
-- Public: Read active
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "option_groups_select" ON option_groups;
DROP POLICY IF EXISTS "option_groups_insert" ON option_groups;
DROP POLICY IF EXISTS "option_groups_update" ON option_groups;
DROP POLICY IF EXISTS "option_groups_delete" ON option_groups;

CREATE POLICY "option_groups_select" ON option_groups 
  FOR SELECT USING (true);

CREATE POLICY "option_groups_insert" ON option_groups 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "option_groups_update" ON option_groups 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "option_groups_delete" ON option_groups 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- OPTION_VALUES
-- Public: Read all
-- Members: Full CRUD
-- =====================================================
ALTER TABLE option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "option_values_select" ON option_values;
DROP POLICY IF EXISTS "option_values_all" ON option_values;

CREATE POLICY "option_values_select" ON option_values 
  FOR SELECT USING (true);

CREATE POLICY "option_values_all" ON option_values 
  FOR ALL USING (true);

-- =====================================================
-- PRODUCT_OPTION_GROUPS
-- Public: Read all
-- Members: Full CRUD
-- =====================================================
ALTER TABLE product_option_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pog_select" ON product_option_groups;
DROP POLICY IF EXISTS "pog_all" ON product_option_groups;

CREATE POLICY "pog_select" ON product_option_groups 
  FOR SELECT USING (true);

CREATE POLICY "pog_all" ON product_option_groups 
  FOR ALL USING (true);

-- =====================================================
-- VARIANT_OPTION_VALUES
-- Public: Read all
-- Members: Full CRUD
-- =====================================================
ALTER TABLE variant_option_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vov_select" ON variant_option_values;
DROP POLICY IF EXISTS "vov_all" ON variant_option_values;

CREATE POLICY "vov_select" ON variant_option_values 
  FOR SELECT USING (true);

CREATE POLICY "vov_all" ON variant_option_values 
  FOR ALL USING (true);

-- =====================================================
-- PAGES
-- Public: Read published pages
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pages_select" ON pages;
DROP POLICY IF EXISTS "pages_insert" ON pages;
DROP POLICY IF EXISTS "pages_update" ON pages;
DROP POLICY IF EXISTS "pages_delete" ON pages;

CREATE POLICY "pages_select" ON pages 
  FOR SELECT USING (true);

CREATE POLICY "pages_insert" ON pages 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "pages_update" ON pages 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "pages_delete" ON pages 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- PAGE_SECTIONS
-- Public: Read all (for published pages)
-- Members: Full CRUD
-- =====================================================
ALTER TABLE page_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_sections_select" ON page_sections;
DROP POLICY IF EXISTS "page_sections_all" ON page_sections;

CREATE POLICY "page_sections_select" ON page_sections 
  FOR SELECT USING (true);

CREATE POLICY "page_sections_all" ON page_sections 
  FOR ALL USING (true);

-- =====================================================
-- INQUIRIES
-- Anyone can create inquiries
-- Members: Full access to their store's inquiries
-- =====================================================
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_select" ON inquiries;
DROP POLICY IF EXISTS "inquiries_insert" ON inquiries;
DROP POLICY IF EXISTS "inquiries_update" ON inquiries;
DROP POLICY IF EXISTS "inquiries_delete" ON inquiries;

CREATE POLICY "inquiries_select" ON inquiries 
  FOR SELECT USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "inquiries_insert" ON inquiries 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "inquiries_update" ON inquiries 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "inquiries_delete" ON inquiries 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- INQUIRY_ITEMS
-- Same as inquiries
-- =====================================================
ALTER TABLE inquiry_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiry_items_select" ON inquiry_items;
DROP POLICY IF EXISTS "inquiry_items_insert" ON inquiry_items;
DROP POLICY IF EXISTS "inquiry_items_all" ON inquiry_items;

CREATE POLICY "inquiry_items_select" ON inquiry_items 
  FOR SELECT USING (true);

CREATE POLICY "inquiry_items_insert" ON inquiry_items 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "inquiry_items_all" ON inquiry_items 
  FOR ALL USING (true);

-- =====================================================
-- SETTINGS
-- Public: Read all (for storefront config)
-- Members: Full CRUD for their stores
-- =====================================================
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;
DROP POLICY IF EXISTS "settings_delete" ON settings;

CREATE POLICY "settings_select" ON settings 
  FOR SELECT USING (true);

CREATE POLICY "settings_insert" ON settings 
  FOR INSERT WITH CHECK (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "settings_update" ON settings 
  FOR UPDATE USING (store_id IN (SELECT get_my_store_ids()));

CREATE POLICY "settings_delete" ON settings 
  FOR DELETE USING (store_id IN (SELECT get_my_store_ids()));

-- =====================================================
-- CARTS
-- Users can only access their own cart
-- =====================================================
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carts_user_own" ON carts;

CREATE POLICY "carts_user_own" ON carts 
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- CART_ITEMS
-- Users can only access items in their own cart
-- =====================================================
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_user_own" ON cart_items;

CREATE POLICY "cart_items_user_own" ON cart_items 
  FOR ALL USING (cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid()));

-- =====================================================
-- DONE! Proceed to 004_storage.sql
-- =====================================================
