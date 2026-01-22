import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkAA13424Properties() {
  console.log('🔍 Checking AA13424 properties...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 売主を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', 'AA13424')
    .single();

  if (sellerError || !seller) {
    console.log('❌ Seller AA13424 not found');
    return;
  }

  console.log('✅ Seller found:', seller.id);
  console.log('\n');

  // 物件を取得（すべて）
  const { data: properties, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  if (propError) {
    console.log('❌ Error fetching properties:', propError.message);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('❌ No properties found for AA13424');
    console.log('\n');
    console.log('🔧 Creating property record...');
    
    // 物件レコードを作成
    const { data: newProperty, error: createError } = await supabase
      .from('properties')
      .insert({
        seller_id: seller.id,
        address: '大分市末広町2丁目4-21グリーヒル大分駅前レジデンス905',
        property_type: 'マンション',
        seller_situation: '居',
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Error creating property:', createError.message);
    } else {
      console.log('✅ Property created:', newProperty.id);
    }
    return;
  }

  console.log(`📊 Found ${properties.length} properties for AA13424:`);
  properties.forEach((prop, index) => {
    console.log(`\n${index + 1}. Property ID: ${prop.id}`);
    console.log(`   Address: ${prop.address}`);
    console.log(`   Type: ${prop.property_type}`);
    console.log(`   Seller Situation: ${prop.seller_situation}`);
    console.log(`   Land Area: ${prop.land_area}`);
    console.log(`   Building Area: ${prop.building_area}`);
    console.log(`   Created: ${prop.created_at}`);
  });

  if (properties.length > 1) {
    console.log('\n⚠️  Multiple properties found - this is a data quality issue');
  }
}

checkAA13424Properties().catch(console.error);
