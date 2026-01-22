import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13423() {
  console.log('🔍 AA13423のデータベース状態を確認\n');

  const { data, error } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_year, inquiry_site, name, status')
    .eq('seller_number', 'AA13423')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('✅ データベースの状態:');
  console.log(`   売主番号: ${data.seller_number}`);
  console.log(`   inquiry_year: ${data.inquiry_year}`);
  console.log(`   inquiry_site: ${data.inquiry_site}`);
  console.log(`   status: ${data.status}`);
  console.log('');
  console.log('📋 次のステップ:');
  console.log('1. ブラウザで売主リストページを開く: http://localhost:5174/sellers');
  console.log('2. ページをリロード（F5キーまたはCtrl+R）');
  console.log('3. AA13423の行を探す');
  console.log('4. 「反響年」列に「2026」が表示されているか確認');
  console.log('5. 「サイト」列に「す」が表示されているか確認');
}

checkAA13423()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
