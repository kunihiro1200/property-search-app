import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🗑️  Supabaseのsellersテーブルをクリア中...\n');

  const { error } = await supabase
    .from('sellers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // すべてのレコードを削除

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('✅ sellersテーブルをクリアしました\n');
  
  // 確認
  const { count } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 現在のデータ数: ${count}件\n`);
}

main();
