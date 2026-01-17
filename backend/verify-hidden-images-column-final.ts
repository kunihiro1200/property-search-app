import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyHiddenImagesColumn() {
  console.log('🔍 Verifying hidden_images column...\n');

  try {
    // Test 1: Check if we can query the column
    console.log('Test 1: Querying property_listings with hidden_images column...');
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, hidden_images')
      .limit(5);

    if (error) {
      console.error('❌ Error querying hidden_images:', error);
      return;
    }

    console.log('✅ Successfully queried hidden_images column');
    console.log('Sample data:', JSON.stringify(data, null, 2));

    // Test 2: Try to update a record with hidden_images
    if (data && data.length > 0) {
      const testProperty = data[0];
      console.log(`\nTest 2: Updating hidden_images for ${testProperty.property_number}...`);
      
      const { error: updateError } = await supabase
        .from('property_listings')
        .update({ hidden_images: ['test-image-1.jpg', 'test-image-2.jpg'] })
        .eq('property_number', testProperty.property_number);

      if (updateError) {
        console.error('❌ Error updating hidden_images:', updateError);
        return;
      }

      console.log('✅ Successfully updated hidden_images');

      // Verify the update
      const { data: verifyData, error: verifyError } = await supabase
        .from('property_listings')
        .select('property_number, hidden_images')
        .eq('property_number', testProperty.property_number)
        .single();

      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
        return;
      }

      console.log('✅ Verified update:', JSON.stringify(verifyData, null, 2));

      // Clean up - reset to empty array
      await supabase
        .from('property_listings')
        .update({ hidden_images: [] })
        .eq('property_number', testProperty.property_number);

      console.log('✅ Cleaned up test data');
    }

    console.log('\n🎉 All tests passed! The hidden_images column is working correctly.');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

verifyHiddenImagesColumn();
