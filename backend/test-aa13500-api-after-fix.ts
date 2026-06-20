import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAPI() {
  console.log('🧪 Testing API response for AA13500 after unreachableStatus fix...\n');

  try {
    // 1. データベースから直接取得
    const { data: dbSeller, error: dbError } = await supabase
      .from('sellers')
      .select('id, seller_number, unreachable_status, is_unreachable, comments, valuation_method, property_address')
      .eq('seller_number', 'AA13500')
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return;
    }

    console.log('📊 Database data:');
    console.log('  seller_number:', dbSeller.seller_number);
    console.log('  unreachable_status:', dbSeller.unreachable_status);
    console.log('  is_unreachable:', dbSeller.is_unreachable);
    console.log('  valuation_method:', dbSeller.valuation_method);
    console.log('  property_address:', dbSeller.property_address);
    console.log('  comments:', dbSeller.comments ? `${dbSeller.comments.substring(0, 50)}...` : null);
    console.log('');

    // 2. APIエンドポイントをテスト（SellerService.getSeller経由）
    console.log('🔍 Testing API endpoint (SellerService.getSeller)...');
    console.log('  Note: This requires the backend server to be running on port 3000');
    console.log('  Run: npm run dev (in backend directory)');
    console.log('');

    // APIテストのためのcurlコマンドを表示
    console.log('📝 To test the API manually, run:');
    console.log(`  curl http://localhost:3000/api/sellers/${dbSeller.id}`);
    console.log('');

    console.log('✅ Expected API response should include:');
    console.log('  - unreachableStatus: "不通"');
    console.log('  - valuationMethod: "机上査定（不通）"');
    console.log('  - comments: (full comment text)');
    console.log('  - property_address: "大分市星和台2丁目2の18の9"');
    console.log('');

    console.log('🎯 Next steps:');
    console.log('  1. Restart backend server: npm run dev (in backend directory)');
    console.log('  2. Test API: curl http://localhost:3000/api/sellers/' + dbSeller.id);
    console.log('  3. Verify unreachableStatus is included in response');
    console.log('  4. Reload browser in incognito mode');
    console.log('  5. Verify "不通" button is selected in 不通セクション');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPI();
