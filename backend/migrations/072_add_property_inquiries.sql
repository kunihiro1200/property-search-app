-- Add site_display column to property_listings table for public property site
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS site_display VARCHAR(50);

-- Add remarks column for public property descriptions
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create property_inquiries table for inquiry submissions
CREATE TABLE IF NOT EXISTS property_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES property_listings(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  message TEXT NOT NULL,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for property_inquiries
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_id ON property_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_email ON property_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_created_at ON property_inquiries(created_at);

-- Add index for site_display column
CREATE INDEX IF NOT EXISTS idx_property_listings_site_display ON property_listings(site_display);

-- Add comment
COMMENT ON COLUMN property_listings.site_display IS 'サイト表示ステータス（"サイト表示"の場合のみ公開サイトに表示）';
COMMENT ON COLUMN property_listings.remarks IS '公開サイト用の物件説明文';
COMMENT ON TABLE property_inquiries IS '公開サイトからの問い合わせ';
