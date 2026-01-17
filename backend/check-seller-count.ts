import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('📊 Supabaseのsellersテーブルのデータ数を確認中...\n');

  const { count, error } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log(`✅ 現在のデータ数: ${count}件\n`);
  
  // メールアドレスがnullのレコード数も確認
  const { count: nullEmailCount, error: nullEmailError } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('email', null);

  if (!nullEmailError) {
    console.log(`📧 メールアドレスがnullのレコード数: ${nullEmailCount}件\n`);
  }
}

main();
