import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncStatus() {
  console.log('=== Checking Sync Status ===\n');

  // Count total sellers
  const { count: totalSellers } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  console.log(`Total sellers: ${totalSellers}`);

  // Count sellers with valuation amounts
  const { count: sellersWithValuation } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('valuation_amount_1', 'is', null);

  console.log(`Sellers with valuation amounts: ${sellersWithValuation}`);

  // Count properties
  const { count: totalProperties } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  console.log(`Total properties: ${totalProperties}`);

  // Count properties with land_area
  const { count: propertiesWithLandArea } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('land_area', 'is', null);

  console.log(`Properties with land area: ${propertiesWithLandArea}`);

  // Count properties with building_area
  const { count: propertiesWithBuildingArea } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('building_area', 'is', null);

  console.log(`Properties with building area: ${propertiesWithBuildingArea}`);

  // Count properties with build_year
  const { count: propertiesWithBuildYear } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('build_year', 'is', null);

  console.log(`Properties with build year: ${propertiesWithBuildYear}`);

  // Count properties with floor_plan
  const { count: propertiesWithFloorPlan } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('floor_plan', 'is', null);

  console.log(`Properties with floor plan: ${propertiesWithFloorPlan}`);

  console.log('\n=== Summary ===');
  console.log(`Valuation sync progress: ${sellersWithValuation}/${totalSellers} (${((sellersWithValuation! / totalSellers!) * 100).toFixed(1)}%)`);
  console.log(`Property data sync progress: ${propertiesWithLandArea}/${totalProperties} (${((propertiesWithLandArea! / totalProperties!) * 100).toFixed(1)}%)`);
}

checkSyncStatus()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
