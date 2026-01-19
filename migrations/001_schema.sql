-- =====================================================
-- OZZSTORE COMPLETE SCHEMA MIGRATION
-- File: 001_schema.sql
-- Run this FIRST in Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. STORES - Tiendas principales
-- =====================================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  currency TEXT DEFAULT 'BOB',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(active);

-- =====================================================
-- 2. STORE_MEMBERS - Administradores por tienda
-- =====================================================
CREATE TABLE IF NOT EXISTS store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members(store_id);

-- =====================================================
-- 3. CATEGORIES - Categorías de productos
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color_hex TEXT,
  image_url TEXT,
  sort INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(featured);

-- =====================================================
-- 4. BRANDS - Marcas
-- =====================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image TEXT,
  logo_url TEXT,
  website_url TEXT,
  sort INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_brands_store ON brands(store_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(active);

-- =====================================================
-- 5. PRODUCTS - Productos
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  short_desc TEXT,
  description TEXT,
  base_price DECIMAL(12,2),
  compare_price DECIMAL(12,2),
  cost_price DECIMAL(12,2),
  sku TEXT,
  barcode TEXT,
  weight DECIMAL(10,3),
  weight_unit TEXT DEFAULT 'kg',
  featured BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  has_variants BOOLEAN DEFAULT false,
  track_inventory BOOLEAN DEFAULT true,
  default_specs_json JSONB DEFAULT '{}',
  landing_json JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  sort INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- =====================================================
-- 6. VARIANTS - Variantes de productos
-- =====================================================
CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  barcode TEXT,
  name TEXT,
  price DECIMAL(12,2),
  compare_price DECIMAL(12,2),
  cost_price DECIMAL(12,2),
  weight DECIMAL(10,3),
  image_url TEXT,
  sort INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_store ON variants(store_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_active ON variants(active);

-- =====================================================
-- 7. INVENTORY - Stock por variante/ubicación
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  location_id UUID,
  quantity INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  available INTEGER GENERATED ALWAYS AS (quantity - reserved) STORED,
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(variant_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);

-- =====================================================
-- 8. PRODUCT_MEDIA - Imágenes y videos de productos
-- =====================================================
CREATE TABLE IF NOT EXISTS product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  alt TEXT,
  type TEXT DEFAULT 'image',
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_media_variant ON product_media(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_media_sort ON product_media(sort);

-- =====================================================
-- 9. OPTION_GROUPS - Grupos de opciones (Talla, Color, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  input_type TEXT DEFAULT 'select',
  sort INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_option_groups_store ON option_groups(store_id);

-- =====================================================
-- 10. OPTION_VALUES - Valores de opciones (S, M, L, Rojo, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  color_hex TEXT,
  image_url TEXT,
  sort INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_option_values_group ON option_values(option_group_id);

-- =====================================================
-- 11. PRODUCT_OPTION_GROUPS - Relación producto-grupo
-- =====================================================
CREATE TABLE IF NOT EXISTS product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, option_group_id)
);

CREATE INDEX IF NOT EXISTS idx_pog_product ON product_option_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_pog_group ON product_option_groups(option_group_id);

-- =====================================================
-- 12. VARIANT_OPTION_VALUES - Valores por variante
-- =====================================================
CREATE TABLE IF NOT EXISTS variant_option_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  option_value_id UUID NOT NULL REFERENCES option_values(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(variant_id, option_value_id)
);

CREATE INDEX IF NOT EXISTS idx_vov_variant ON variant_option_values(variant_id);
CREATE INDEX IF NOT EXISTS idx_vov_value ON variant_option_values(option_value_id);

-- =====================================================
-- 13. PAGES - Páginas CMS
-- =====================================================
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT,
  template TEXT DEFAULT 'default',
  status TEXT DEFAULT 'draft',
  seo_title TEXT,
  seo_description TEXT,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pages_store ON pages(store_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- =====================================================
-- 14. PAGE_SECTIONS - Secciones de páginas
-- =====================================================
CREATE TABLE IF NOT EXISTS page_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content JSONB DEFAULT '{}',
  sort INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page ON page_sections(page_id);

-- =====================================================
-- 15. INQUIRIES - Consultas/cotizaciones
-- =====================================================
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_store ON inquiries(store_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- =====================================================
-- 16. INQUIRY_ITEMS - Items de consulta
-- =====================================================
CREATE TABLE IF NOT EXISTS inquiry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_items_inquiry ON inquiry_items(inquiry_id);

-- =====================================================
-- 17. SETTINGS - Configuraciones key-value
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_store ON settings(store_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- =====================================================
-- 18. CARTS - Carrito por usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_store_id ON carts(store_id);

-- =====================================================
-- 19. CART_ITEMS - Items del carrito
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- =====================================================
-- DONE! Proceed to 002_functions.sql
-- =====================================================
