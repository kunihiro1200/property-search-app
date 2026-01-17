import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findDuplicatesSQL() {
  console.log('=== Finding Duplicate Properties (SQL) ===\n');

  // Use SQL to find sellers with multiple properties
  const { data, error } = await supabase.rpc('find_duplicate_properties', {});

  if (error) {
    // If function doesn't exist, use direct query
    const query = `
      SELECT 
        s.seller_number,
        s.id as seller_id,
        COUNT(p.id) as property_count
      FROM sellers s
      INNER JOIN properties p ON p.seller_id = s.id
      GROUP BY s.id, s.seller_number
      HAVING COUNT(p.id) > 1
      ORDER BY property_count DESC
    `;

    const { data: results, error: queryError } = await supabase
      .from('sellers')
      .select(`
        seller_number,
        id,
        properties:properties(count)
      `);

    if (queryError) {
      console.error('Error:', queryError);
      return;
    }

    // Manual aggregation
    const duplicates = results?.filter((s: any) => {
      return s.properties && s.properties.length > 1;
    });

    console.log(`Found ${duplicates?.length || 0} sellers with duplicate properties`);
    return;
  }

  console.log(`Found ${data?.length || 0} sellers with duplicate properties:\n`);
  
  data?.slice(0, 20).forEach((row: any) => {
    console.log(`  ${row.seller_number}: ${row.property_count} properties`);
  });

  if (data && data.length > 20) {
    console.log(`  ... and ${data.length - 20} more`);
  }

  const totalDuplicates = data?.reduce((sum: number, row: any) => sum + (row.property_count - 1), 0) || 0;
  console.log(`\nTotal duplicate properties to clean: ${totalDuplicates}`);
}

findDuplicatesSQL()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
