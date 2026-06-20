// CC104の価格を修正するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCC104Price() {
  console.log('🔧 Fixing CC104 price...\n');

  // CC104のsales_priceを取得
  const { data: currentData } = await supabase
    .from('property_listings')
    .select('property_number, price, sales_price, listing_price')
    .eq('property_number', 'CC104')
    .single();

  if (!currentData) {
    console.log('⚠️ CC104 not found');
    return;
  }

  console.log('📊 Current data:');
  console.log(`  price: ${currentData.price}`);
  console.log(`  sales_price: ${currentData.sales_price}`);
  console.log(`  listing_price: ${currentData.listing_price}\n`);

  // priceをsales_priceに設定
  const newPrice = currentData.sales_price || currentData.listing_price;

  if (!newPrice) {
    console.log('⚠️ No sales_price or listing_price found');
    return;
  }

  console.log(`💰 Setting price to: ${newPrice}\n`);

  // CC104のpriceを更新
  const { data, error } = await supabase
    .from('property_listings')
    .update({
      price: newPrice,
      updated_at: new Date().toISOString(),
    })
    .eq('property_number', 'CC104')
    .select();

  if (error) {
    console.error('❌ Error updating CC104:', error);
    return;
  }

  console.log('✅ CC104 price updated successfully!');

  // 確認
  const { data: checkData } = await supabase
    .from('property_listings')
    .select('property_number, price, sales_price, listing_price')
    .eq('property_number', 'CC104')
    .single();

  console.log('\n🔍 Verification:');
  console.log(JSON.stringify(checkData, null, 2));
}

fixCC104Price().catch(console.error);
