// CC104の価格データを確認するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC104Price() {
  console.log('🔍 Checking CC104 price data...\n');

  // CC104のデータを取得
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, price, sales_price, listing_price, atbb_status')
    .eq('property_number', 'CC104')
    .single();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data) {
    console.log('⚠️ CC104 not found');
    return;
  }

  console.log('📊 CC104 data:');
  console.log(JSON.stringify(data, null, 2));

  // 価格の状態を確認
  console.log('\n💰 Price status:');
  console.log(`  price: ${data.price || 'null'}`);
  console.log(`  sales_price: ${data.sales_price || 'null'}`);
  console.log(`  listing_price: ${data.listing_price || 'null'}`);
  console.log(`  atbb_status: ${data.atbb_status || 'null'}`);

  if (!data.price && (data.sales_price || data.listing_price)) {
    console.log('\n⚠️ CC104 has sales_price or listing_price but price is null!');
    console.log('This is the same issue as CC105.');
  }
}

checkCC104Price().catch(console.error);
