// Run migration 047: Add coordinates to area_map_config
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
  console.log('=== Running Migration 047: Add coordinates to area_map_config ===\n');

  const sqlPath = path.join(__dirname, '047_add_coordinates_to_area_map_config.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing SQL...\n');

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
    console.log(sql);
    return;
  }

  console.log('✅ Migration 047 completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Run: npx ts-node extract-and-update-area-coordinates.ts');
  console.log('2. Verify: npx ts-node check-area-map-coordinates.ts');
}

runMigration();
