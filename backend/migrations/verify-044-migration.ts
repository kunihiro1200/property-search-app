import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  try {
    console.log('Verifying migration 044: area_map_config table...\n');

    // Check if table exists
    const { data: tableData, error: tableError } = await supabase
      .from('area_map_config')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table does not exist or cannot be accessed:', tableError.message);
      process.exit(1);
    }

    console.log('✓ Table area_map_config exists');

    // Check data count
    const { count, error: countError } = await supabase
      .from('area_map_config')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting records:', countError.message);
      process.exit(1);
    }

    console.log(`✓ Total records: ${count}`);

    // Check active records
    const { data: activeData, error: activeError } = await supabase
      .from('area_map_config')
      .select('area_number, google_map_url, city_name, is_active')
      .eq('is_active', true)
      .order('area_number');

    if (activeError) {
      console.error('❌ Error fetching active records:', activeError.message);
      process.exit(1);
    }

    console.log(`✓ Active records: ${activeData?.length || 0}\n`);

    // Display active configurations
    console.log('Active Area Configurations:');
    console.log('─'.repeat(80));
    activeData?.forEach((config) => {
      const location = config.city_name || 'Radius-based';
      const url = config.google_map_url || 'N/A (City-wide)';
      console.log(`${config.area_number.padEnd(5)} | ${location.padEnd(15)} | ${url}`);
    });
    console.log('─'.repeat(80));

    // Verify specific configurations
    const requiredAreas = ['①', '②', '③', '④', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '㊵', '㊶'];
    const foundAreas = activeData?.map(d => d.area_number) || [];
    const missingAreas = requiredAreas.filter(area => !foundAreas.includes(area));

    if (missingAreas.length > 0) {
      console.log(`\n⚠️  Missing required areas: ${missingAreas.join(', ')}`);
    } else {
      console.log('\n✓ All required area configurations are present');
    }

    // Verify city-wide configurations
    const cityWideAreas = activeData?.filter(d => d.city_name !== null) || [];
    console.log(`\n✓ City-wide configurations: ${cityWideAreas.length}`);
    cityWideAreas.forEach(config => {
      console.log(`  ${config.area_number}: ${config.city_name}`);
    });

    console.log('\n✅ Migration 044 verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifyMigration();
