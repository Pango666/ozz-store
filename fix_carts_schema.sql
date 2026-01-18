-- Add store_id to carts if it is missing
ALTER TABLE carts ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Reload schema cache to be sure
NOTIFY pgrst, 'reload schema';
