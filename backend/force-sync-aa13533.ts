import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込み
const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceSyncAA13533() {
  console.log('🔄 AA13533の不通フィールドを強制同期中...\n');

  // スプレッドシートの値: "通電OK"
  const unreachableStatus = '通電OK';

  console.log(`  不通ステータス: "${unreachableStatus}"`);

  // データベースを更新
  const { data, error } = await supabase
    .from('sellers')
    .update({
      unreachable_status: unreachableStatus,
      updated_at: new Date().toISOString()
    })
    .eq('seller_number', 'AA13533')
    .select();

  if (error) {
    console.error('❌ 更新エラー:', error);
    return;
  }

  console.log('✅ 更新成功:', data);

  // 確認
  const { data: seller } = await supabase
    .from('sellers')
    .select('seller_number, unreachable_status')
    .eq('seller_number', 'AA13533')
    .single();

  console.log('\n📊 更新後の状態:');
  console.log('  売主番号:', seller?.seller_number);
  console.log('  不通ステータス:', seller?.unreachable_status);
}

forceSyncAA13533().catch(console.error);
