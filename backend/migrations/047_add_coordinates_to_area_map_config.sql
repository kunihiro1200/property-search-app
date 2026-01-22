-- Add coordinates column to area_map_config table
-- Migration: 047_add_coordinates_to_area_map_config

-- Add coordinates column (JSONB type to store {lat, lng})
ALTER TABLE area_map_config
ADD COLUMN IF NOT EXISTS coordinates JSONB;

-- Add area_name column for better readability
ALTER TABLE area_map_config
ADD COLUMN IF NOT EXISTS area_name VARCHAR(100);

-- Create index on coordinates for faster queries
CREATE INDEX IF NOT EXISTS idx_area_map_config_coordinates 
ON area_map_config USING GIN (coordinates);

-- Add comment
COMMENT ON COLUMN area_map_config.coordinates IS 'Coordinates in format: {"lat": 33.2382, "lng": 131.6126}';
COMMENT ON COLUMN area_map_config.area_name IS 'Human-readable area name';
