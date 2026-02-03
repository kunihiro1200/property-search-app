// 公開前物件の座標データを確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env.localを読み込む
dotenv.config({ path: 'backend/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkPrePublishCoordinates() {
  console.log('🔍 Checking coordinates for all pre-publish properties...\n');
  
  try {
    // 公開前物件を取得（atbb_statusに「公開前」が含まれる）
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, latitude, longitude, address, google_map_url, atbb_status')
      .ilike('atbb_status', '%公開前%')
      .order('property_number', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ No pre-publish properties found');
      return;
    }
    
    console.log(`✅ Found ${data.length} pre-publish properties\n`);
    
    let withCoordinates = 0;
    let withoutCoordinates = 0;
    const missingCoordinates: any[] = [];
    
    data.forEach((property) => {
      if (property.latitude && property.longitude) {
        withCoordinates++;
        console.log(`✅ ${property.property_number}: Has coordinates (${property.latitude}, ${property.longitude})`);
      } else {
        withoutCoordinates++;
        console.log(`❌ ${property.property_number}: NO coordinates`);
        console.log(`   atbb_status: ${property.atbb_status}`);
        console.log(`   address: ${property.address}`);
        console.log(`   google_map_url: ${property.google_map_url || 'N/A'}`);
        console.log('');
        missingCoordinates.push(property);
      }
    });
    
    console.log('\n📊 Summary:');
    console.log(`  Total pre-publish properties: ${data.length}`);
    console.log(`  ✅ With coordinates: ${withCoordinates}`);
    console.log(`  ❌ Without coordinates: ${withoutCoordinates}`);
    
    if (missingCoordinates.length > 0) {
      console.log('\n💡 Properties missing coordinates:');
      missingCoordinates.forEach((property) => {
        console.log(`  - ${property.property_number} (${property.atbb_status})`);
      });
      
      console.log('\n💡 Solution:');
      console.log('  Run: npx ts-node backend/add-all-missing-coordinates.ts');
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

checkPrePublishCoordinates();
