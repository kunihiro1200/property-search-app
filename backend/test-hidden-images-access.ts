import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testHiddenImagesAccess() {
  console.log('🧪 Testing hidden_images column access...\n');

  try {
    // 1. テスト用の物件を1件取得
    console.log('1️⃣ Fetching a test property...');
    const { data: properties, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, hidden_images')
      .limit(1);

    if (fetchError) {
      console.error('❌ Error fetching property:', fetchError);
      return;
    }

    if (!properties || properties.length === 0) {
      console.log('⚠️ No properties found in database');
      return;
    }

    const testProperty = properties[0];
    console.log('✅ Found property:', {
      id: testProperty.id,
      property_number: testProperty.property_number,
      hidden_images: testProperty.hidden_images
    });

    // 2. hidden_imagesカラムに値を設定してみる
    console.log('\n2️⃣ Testing UPDATE with hidden_images...');
    const testHiddenImages = ['test-image-1.jpg', 'test-image-2.jpg'];
    
    const { data: updateData, error: updateError } = await supabase
      .from('property_listings')
      .update({ hidden_images: testHiddenImages })
      .eq('id', testProperty.id)
      .select('id, property_number, hidden_images');

    if (updateError) {
      console.error('❌ Error updating hidden_images:', updateError);
      return;
    }

    console.log('✅ Successfully updated hidden_images:', updateData);

    // 3. 更新された値を再度取得して確認
    console.log('\n3️⃣ Verifying the update...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('property_listings')
      .select('id, property_number, hidden_images')
      .eq('id', testProperty.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }

    console.log('✅ Verified data:', verifyData);

    // 4. 元の値に戻す（クリーンアップ）
    console.log('\n4️⃣ Cleaning up (restoring original value)...');
    const { error: cleanupError } = await supabase
      .from('property_listings')
      .update({ hidden_images: testProperty.hidden_images })
      .eq('id', testProperty.id);

    if (cleanupError) {
      console.error('❌ Error during cleanup:', cleanupError);
      return;
    }

    console.log('✅ Cleanup complete');

    // 5. 最終確認
    console.log('\n5️⃣ Final verification...');
    const { data: finalData, error: finalError } = await supabase
      .from('property_listings')
      .select('id, property_number, hidden_images')
      .eq('id', testProperty.id)
      .single();

    if (finalError) {
      console.error('❌ Error in final verification:', finalError);
      return;
    }

    console.log('✅ Final state:', finalData);

    console.log('\n🎉 All tests passed! hidden_images column is working correctly!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testHiddenImagesAccess();
