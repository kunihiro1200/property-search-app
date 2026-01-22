import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA12903Status() {
  console.log('=== AA12903のステータスを確認 ===\n');

  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA12903');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('❌ AA12903が見つかりません');
    return;
  }

  const seller = sellers[0];
  console.log('✅ AA12903を発見\n');
  console.log('【ステータス情報】');
  console.log('ID:', seller.id);
  console.log('売主番号:', seller.seller_number);
  console.log('氏名:', decrypt(seller.name));
  console.log('ステータス（status）:', seller.status);
  console.log('');
}

checkAA12903Status()
  .then(() => {
    console.log('✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
