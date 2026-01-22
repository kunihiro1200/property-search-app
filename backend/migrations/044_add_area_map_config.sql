-- Migration 044: Add area_map_config table for buyer distribution radius filtering
-- This table stores the mapping between area numbers (①-⑯, ㊵, ㊶) and their Google Maps URLs

CREATE TABLE IF NOT EXISTS area_map_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_number VARCHAR(10) NOT NULL UNIQUE,
  google_map_url TEXT,
  city_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE area_map_config IS 'Configuration for area maps used in buyer distribution filtering';

-- Add comments to columns
COMMENT ON COLUMN area_map_config.area_number IS 'Area identifier (①-⑯, ㊵, ㊶)';
COMMENT ON COLUMN area_map_config.google_map_url IS 'Google Maps URL for the area (null for city-wide areas)';
COMMENT ON COLUMN area_map_config.city_name IS 'City name for city-wide areas (㊵=大分市, ㊶=別府市)';
COMMENT ON COLUMN area_map_config.is_active IS 'Whether this area configuration is active';

-- Create indexes for performance
CREATE INDEX idx_area_map_config_active ON area_map_config(is_active) WHERE is_active = true;
CREATE INDEX idx_area_map_config_city ON area_map_config(city_name) WHERE city_name IS NOT NULL;
CREATE INDEX idx_area_map_config_area_number ON area_map_config(area_number);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_area_map_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_area_map_config_updated_at
  BEFORE UPDATE ON area_map_config
  FOR EACH ROW
  EXECUTE FUNCTION update_area_map_config_updated_at();
