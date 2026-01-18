-- Add image and description to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT;
