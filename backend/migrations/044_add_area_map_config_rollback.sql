-- Rollback Migration 044: Remove area_map_config table

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_update_area_map_config_updated_at ON area_map_config;

-- Drop function
DROP FUNCTION IF EXISTS update_area_map_config_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_area_map_config_area_number;
DROP INDEX IF EXISTS idx_area_map_config_city;
DROP INDEX IF EXISTS idx_area_map_config_active;

-- Drop table
DROP TABLE IF EXISTS area_map_config;
