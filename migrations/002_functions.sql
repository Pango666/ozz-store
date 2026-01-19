-- =====================================================
-- OZZSTORE HELPER FUNCTIONS
-- File: 002_functions.sql
-- Run AFTER 001_schema.sql
-- =====================================================

-- =====================================================
-- FUNCTION: get_my_store_ids()
-- Returns all store IDs where the current user is a member
-- Used in RLS policies to avoid recursion
-- =====================================================
CREATE OR REPLACE FUNCTION get_my_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT store_id FROM store_members WHERE user_id = auth.uid()
$$;

-- =====================================================
-- FUNCTION: auto_update_timestamp()
-- Automatically updates updated_at column on row changes
-- =====================================================
CREATE OR REPLACE FUNCTION auto_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS: Auto-update timestamps on all tables with updated_at
-- =====================================================

-- Stores
DROP TRIGGER IF EXISTS trg_stores_updated ON stores;
CREATE TRIGGER trg_stores_updated
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Categories
DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Brands
DROP TRIGGER IF EXISTS trg_brands_updated ON brands;
CREATE TRIGGER trg_brands_updated
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Products
DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Variants
DROP TRIGGER IF EXISTS trg_variants_updated ON variants;
CREATE TRIGGER trg_variants_updated
  BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Inventory
DROP TRIGGER IF EXISTS trg_inventory_updated ON inventory;
CREATE TRIGGER trg_inventory_updated
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Option Groups
DROP TRIGGER IF EXISTS trg_option_groups_updated ON option_groups;
CREATE TRIGGER trg_option_groups_updated
  BEFORE UPDATE ON option_groups
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Pages
DROP TRIGGER IF EXISTS trg_pages_updated ON pages;
CREATE TRIGGER trg_pages_updated
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Page Sections
DROP TRIGGER IF EXISTS trg_page_sections_updated ON page_sections;
CREATE TRIGGER trg_page_sections_updated
  BEFORE UPDATE ON page_sections
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Inquiries
DROP TRIGGER IF EXISTS trg_inquiries_updated ON inquiries;
CREATE TRIGGER trg_inquiries_updated
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Settings
DROP TRIGGER IF EXISTS trg_settings_updated ON settings;
CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Carts
DROP TRIGGER IF EXISTS trg_carts_updated ON carts;
CREATE TRIGGER trg_carts_updated
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- Cart Items
DROP TRIGGER IF EXISTS trg_cart_items_updated ON cart_items;
CREATE TRIGGER trg_cart_items_updated
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- =====================================================
-- FUNCTION: get_product_with_details()
-- Returns a product with all related data (for storefront)
-- =====================================================
CREATE OR REPLACE FUNCTION get_product_with_details(product_slug TEXT, store_slug TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'product', row_to_json(p.*),
    'category', row_to_json(c.*),
    'brand', row_to_json(b.*),
    'media', (
      SELECT json_agg(row_to_json(m.*) ORDER BY m.sort)
      FROM product_media m
      WHERE m.product_id = p.id
    ),
    'variants', (
      SELECT json_agg(row_to_json(v.*) ORDER BY v.sort)
      FROM variants v
      WHERE v.product_id = p.id AND v.active = true
    )
  ) INTO result
  FROM products p
  JOIN stores s ON p.store_id = s.id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN brands b ON p.brand_id = b.id
  WHERE p.slug = product_slug
    AND s.slug = store_slug
    AND p.active = true
    AND s.active = true;

  RETURN result;
END;
$$;

-- =====================================================
-- DONE! Proceed to 003_rls_policies.sql
-- =====================================================
