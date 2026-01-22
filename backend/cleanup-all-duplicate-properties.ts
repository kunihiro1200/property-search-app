import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupAllDuplicateProperties() {
  console.log('=== Cleaning Up All Duplicate Properties ===\n');

  // Get all properties with pagination
  console.log('Fetching all properties...');
  
  let allProperties: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: batch, error: fetchError } = await supabase
      .from('properties')
      .select('id, seller_id, created_at, address, land_area')
      .order('created_at')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (fetchError) {
      console.error('Error fetching properties:', fetchError);
      break;
    }
    
    if (!batch || batch.length === 0) break;
    
    allProperties = allProperties.concat(batch);
    page++;
    console.log(`Fetched ${allProperties.length} properties...`);
    
    if (batch.length < pageSize) break;
  }

  if (!allProperties) {
    console.log('No properties found');
    return;
  }

  console.log(`Total properties: ${allProperties.length}`);

  // Group by seller_id
  const propertiesBySeller = new Map<string, any[]>();
  
  for (const prop of allProperties) {
    if (!propertiesBySeller.has(prop.seller_id)) {
      propertiesBySeller.set(prop.seller_id, []);
    }
    propertiesBySeller.get(prop.seller_id)!.push(prop);
  }

  console.log(`Unique sellers: ${propertiesBySeller.size}`);

  // Find duplicates
  const sellersWithDuplicates = Array.from(propertiesBySeller.entries())
    .filter(([_, props]) => props.length > 1);

  console.log(`Sellers with duplicates: ${sellersWithDuplicates.length}\n`);

  let totalDeleted = 0;
  let errors = 0;

  for (const [_sellerId, properties] of sellersWithDuplicates) {
    // Keep the most recent one with data (prefer non-null address and land_area)
    const sorted = properties.sort((a, b) => {
      // Prefer properties with data
      const aHasData = a.address && a.address !== '住所不明' && a.land_area;
      const bHasData = b.address && b.address !== '住所不明' && b.land_area;
      
      if (aHasData && !bHasData) return -1;
      if (!aHasData && bHasData) return 1;
      
      // If both have data or both don't, prefer most recent
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Keep the first one (best quality)
    const toDelete = sorted.slice(1);

    // Delete duplicates
    for (const prop of toDelete) {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', prop.id);

      if (error) {
        console.error(`Error deleting ${prop.id}:`, error.message);
        errors++;
      } else {
        totalDeleted++;
      }
    }

    if ((totalDeleted + errors) % 100 === 0) {
      console.log(`Progress: ${totalDeleted} deleted, ${errors} errors`);
    }
  }

  console.log(`\n=== Cleanup Complete ===`);
  console.log(`Total deleted: ${totalDeleted}`);
  console.log(`Errors: ${errors}`);
  console.log(`Remaining properties: ${allProperties.length - totalDeleted}`);
}

cleanupAllDuplicateProperties()
  .then(() => {
    console.log('\n✅ Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
