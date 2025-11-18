-- Add company details to users table for business card OCR feature
-- Migration: 0009_add_user_company_details

ALTER TABLE users ADD COLUMN company_address TEXT;
ALTER TABLE users ADD COLUMN position TEXT;
ALTER TABLE users ADD COLUMN mobile_phone TEXT;
ALTER TABLE users ADD COLUMN company_phone TEXT;
ALTER TABLE users ADD COLUMN company_fax TEXT;

-- Create index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_mobile_phone ON users(mobile_phone);
CREATE INDEX IF NOT EXISTS idx_users_company_phone ON users(company_phone);
