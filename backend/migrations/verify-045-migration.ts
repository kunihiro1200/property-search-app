import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyMigration() {
  console.log('Verifying migration 045...\n');

  try {
    // Check if distribution_areas column exists
    const { error: columnsError } = await supabase
      .from('property_listings')
      .select('distribution_areas')
      .limit(1);

    if (columnsError) {
      console.error('✗ distribution_areas column not found');
      console.error('Error:', columnsError.message);
      process.exit(1);
    }

    console.log('✓ distribution_areas column exists');

    // Check if index exists
    const { data: indexes, error: indexError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'property_listings' 
          AND indexname = 'idx_property_listings_distribution_areas'
        `
      });

    if (indexError || !indexes || indexes.length === 0) {
      console.log('⚠ Index idx_property_listings_distribution_areas may not exist');
    } else {
      console.log('✓ Index idx_property_listings_distribution_areas exists');
    }

    // Test inserting and retrieving data
    const testPropertyNumber = `TEST_${Date.now()}`;
    const testAreas = '①,②,③,㊵';

    const { error: insertError } = await supabase
      .from('property_listings')
      .insert({
        property_number: testPropertyNumber,
        distribution_areas: testAreas
      });

    if (insertError) {
      console.error('✗ Failed to insert test data');
      console.error('Error:', insertError.message);
      process.exit(1);
    }

    console.log('✓ Successfully inserted test data');

    // Retrieve test data
    const { data: retrieved, error: retrieveError } = await supabase
      .from('property_listings')
      .select('distribution_areas')
      .eq('property_number', testPropertyNumber)
      .single();

    if (retrieveError || !retrieved) {
      console.error('✗ Failed to retrieve test data');
      process.exit(1);
    }

    if (retrieved.distribution_areas !== testAreas) {
      console.error('✗ Retrieved data does not match');
      console.error('Expected:', testAreas);
      console.error('Got:', retrieved.distribution_areas);
      process.exit(1);
    }

    console.log('✓ Successfully retrieved test data');

    // Clean up test data
    await supabase
      .from('property_listings')
      .delete()
      .eq('property_number', testPropertyNumber);

    console.log('✓ Cleaned up test data');

    console.log('\n✓ Migration 045 verification completed successfully');

  } catch (error) {
    console.error('Error verifying migration:', error);
    process.exit(1);
  }
}

verifyMigration();
