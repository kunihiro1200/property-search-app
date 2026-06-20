import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCC105Price() {
  console.log('🔍 Testing CC105 price fix...\n');

  // 1. データベースから直接取得
  console.log('📊 Step 1: Check database directly');
  const { data: dbData, error: dbError } = await supabase
    .from('property_listings')
    .select('property_number, sales_price, listing_price, atbb_status')
    .eq('property_number', 'CC105')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError);
    return;
  }

  console.log('Database data:', {
    property_number: dbData.property_number,
    sales_price: dbData.sales_price,
    listing_price: dbData.listing_price,
    atbb_status: dbData.atbb_status,
  });

  // 2. 価格の計算
  const price = dbData.sales_price || dbData.listing_price || 0;
  console.log('\n💰 Calculated price:', price.toLocaleString('ja-JP'), '円');

  // 3. 期待される結果
  console.log('\n✅ Expected result:');
  console.log('  - price should be:', '21,800,000円');
  console.log('  - NOT "価格応談"');

  // 4. APIエンドポイントをテスト（Vercelデプロイ後）
  console.log('\n🌐 Step 2: Test API endpoint (after Vercel deployment)');
  console.log('  - Wait for Vercel deployment to complete');
  console.log('  - Then visit: https://property-site-frontend-kappa.vercel.app/public/properties');
  console.log('  - Search for CC105');
  console.log('  - Verify price is displayed as "2,180万円" (not "価格応談")');

  console.log('\n✨ Test completed!');
}

testCC105Price().catch(console.error);
