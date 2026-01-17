

async function main() {
  console.log('=== Creating area_map_config table ===\n');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS area_map_config (
      id SERIAL PRIMARY KEY,
      area_number VARCHAR(10) UNIQUE NOT NULL,
      google_map_url TEXT,
      city_name VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_area_map_config_area_number ON area_map_config(area_number);
    CREATE INDEX IF NOT EXISTS idx_area_map_config_is_active ON area_map_config(is_active);
  `;

  console.log('SQL to execute:');
  console.log(createTableSQL);
  console.log('\n⚠️  Please run this SQL in your Supabase SQL Editor:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the SQL above');
  console.log('4. Click "Run"');
  console.log('\nAfter creating the table, run: npx ts-node populate-area-map-config.ts');
}

main();
