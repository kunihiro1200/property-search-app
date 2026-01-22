import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyHiddenImagesColumn() {
  console.log('🔍 Verifying hidden_images column...\n');

  try {
    // Check if column exists in information_schema
    const { data: columnInfo, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, column_default')
      .eq('table_name', 'property_listings')
      .eq('column_name', 'hidden_images')
      .single();

    if (schemaError) {
      console.log('❌ Column does not exist in schema');
      console.log('Error:', schemaError.message);
      return false;
    }

    console.log('✅ Column exists in information_schema:');
    console.log(JSON.stringify(columnInfo, null, 2));
    console.log('');

    // Try to fetch a property listing with hidden_images
    const { data: testData, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, hidden_images')
      .limit(1)
      .single();

    if (fetchError) {
      console.log('❌ Cannot fetch data with hidden_images field');
      console.log('Error:', fetchError.message);
      console.log('\n⚠️  This indicates PostgREST cache is stale');
      console.log('📋 Execute: NOTIFY pgrst, \'reload schema\';');
      return false;
    }

    console.log('✅ Successfully fetched data with hidden_images:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('');

    // Check if index exists
    const { data: indexInfo, error: indexError } = await supabase.rpc('check_index_exists', {
      index_name: 'idx_property_listings_hidden_images'
    });

    if (!indexError && indexInfo) {
      console.log('✅ GIN index exists');
    } else {
      console.log('⚠️  GIN index may not exist (this is optional)');
    }

    console.log('\n✅ All checks passed! hidden_images column is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

verifyHiddenImagesColumn()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
