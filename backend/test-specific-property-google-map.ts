// スクリプト: 特定の物件のGoogle Map URLを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testSpecificProperty() {
  // ユーザーが見ている物件番号を入力してください
  const propertyNumber = 'AA1121'; // 例: AA1121 (Google Map URLがあることが確認済み)

  console.log(`Testing property: ${propertyNumber}\n`);

  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, google_map_url, address, display_address')
    .eq('property_number', propertyNumber)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data) {
    console.log('Property not found');
    return;
  }

  console.log('Property data:');
  console.log(`  Property Number: ${data.property_number}`);
  console.log(`  Address: ${data.address || data.display_address || 'N/A'}`);
  console.log(`  Google Map URL: ${data.google_map_url || 'NOT SET'}`);
  console.log(`\nURL exists: ${!!data.google_map_url}`);
  
  if (data.google_map_url) {
    console.log(`\nYou can test this URL in your browser:`);
    console.log(data.google_map_url);
  }
}

testSpecificProperty().catch(console.error);
