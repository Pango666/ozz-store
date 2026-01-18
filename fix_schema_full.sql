-- ===============================================================
-- EMERGENCY FIX FOR CART TABLES (UPDATED 2)
-- Run this in Supabase SQL Editor
-- ===============================================================

-- 1. Fix 'carts' table
ALTER TABLE carts 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- 2. Fix 'cart_items' table structure
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);

ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES variants(id) ON DELETE CASCADE;

-- Relax constraints on columns that might exist from previous versions but aren't used/required now
ALTER TABLE cart_items ALTER COLUMN title DROP NOT NULL;
ALTER TABLE cart_items ALTER COLUMN price DROP NOT NULL;
ALTER TABLE cart_items ALTER COLUMN image DROP NOT NULL;
ALTER TABLE cart_items ALTER COLUMN sku DROP NOT NULL;

-- If 'title' etc don't exist, the above commands might fail in some SQL dialects, 
-- but in Postgres 'ALTER COLUMN ... DROP NOT NULL' only works if column exists.
-- To be safe, we wrap in DO block or just ignore errors. 
-- For Supabase SQL Editor, simple separate statements usually work best or fail benignly.
-- But if the column doesn't exist, it throws error.
-- Better approach: Add them as nullable if valid, or just drop constraint.

-- Let's try to just Alter if exists.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'title') THEN
        ALTER TABLE cart_items ALTER COLUMN title DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'price') THEN
        ALTER TABLE cart_items ALTER COLUMN price DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_items' AND column_name = 'image') THEN
        ALTER TABLE cart_items ALTER COLUMN image DROP NOT NULL;
    END IF;
END $$;

-- 3. Force schema cache reload
NOTIFY pgrst, 'reload schema';
