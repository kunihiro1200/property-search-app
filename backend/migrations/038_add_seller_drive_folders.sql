-- Migration: 038_add_seller_drive_folders
-- Description: Add seller_drive_folders table for Google Drive integration
-- Date: 2024-12-11

-- Create seller_drive_folders table
CREATE TABLE IF NOT EXISTS seller_drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  seller_number VARCHAR(20) NOT NULL,
  drive_folder_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraints
ALTER TABLE seller_drive_folders ADD CONSTRAINT seller_drive_folders_seller_id_unique UNIQUE (seller_id);
ALTER TABLE seller_drive_folders ADD CONSTRAINT seller_drive_folders_seller_number_unique UNIQUE (seller_number);

-- Add index for faster lookups by seller_number
CREATE INDEX IF NOT EXISTS idx_seller_drive_folders_seller_number ON seller_drive_folders(seller_number);

-- Add index for faster lookups by drive_folder_id
CREATE INDEX IF NOT EXISTS idx_seller_drive_folders_drive_folder_id ON seller_drive_folders(drive_folder_id);

-- Add comment
COMMENT ON TABLE seller_drive_folders IS 'Stores the mapping between sellers and their Google Drive folders';
COMMENT ON COLUMN seller_drive_folders.seller_id IS 'Reference to the seller';
COMMENT ON COLUMN seller_drive_folders.seller_number IS 'Seller number (e.g., AA12345) used as folder name';
COMMENT ON COLUMN seller_drive_folders.drive_folder_id IS 'Google Drive folder ID';
