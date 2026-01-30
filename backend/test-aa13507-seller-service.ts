import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAA13507SellerService() {
  console.log('🔍 AA13507のデータベースデータをテスト...\n');

  try {
    // 売主番号でデータを取得
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA13507')
      .single();

    if (error || !seller) {
      console.log('❌ AA13507が見つかりません:', error?.message);
      return;
    }

    console.log(`✅ 売主ID: ${seller.id}\n`);

    console.log('📝 データベースのデータ:');
    console.log(`  sellerNumber: ${seller.seller_number}`);
    console.log(`  name: ${seller.name ? '(暗号化済み)' : '(null)'}`);
    console.log(`  property_address: ${seller.property_address || '(null)'}`);
    console.log(`  comments: ${seller.comments ? seller.comments.substring(0, 50) + '...' : '(null)'}`);
    console.log(`  unreachable_status: ${seller.unreachable_status || '(null)'}`);
    console.log(`  valuation_method: ${seller.valuation_method || '(null)'}`);
    console.log(`  visit_assignee: ${seller.visit_assignee || '(null)'}`);
    console.log(`  visit_valuation_acquirer: ${seller.visit_valuation_acquirer || '(null)'}`);
    console.log(`  status: ${seller.status || '(null)'}`);

    console.log('\n✅ 検証結果:');
    
    const checks = [
      { field: 'property_address', value: seller.property_address, expected: '大分市田中町1丁目4-13' },
      { field: 'comments', value: seller.comments, expected: 'R1/30' },
      { field: 'unreachable_status', value: seller.unreachable_status, expected: '不通' },
      { field: 'valuation_method', value: seller.valuation_method, expected: '机上査定（不通）' },
      { field: 'status', value: seller.status, expected: '追客中' },
    ];

    checks.forEach(({ field, value, expected }) => {
      const exists = value && String(value).includes(expected);
      console.log(`  ${field}: ${exists ? '✅ 正常' : '❌ 未設定'}`);
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

testAA13507SellerService();
