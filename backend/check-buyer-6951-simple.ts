import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iqvvqxqxqxqxqxqxqxqx.supabase.co', // ダミーURL（実際の環境変数から読み込む）
  'dummy-key' // ダミーキー（実際の環境変数から読み込む）
);

async function main() {
  console.log('買主6951のデータを確認中...\n');
  
  // 環境変数を確認
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');
}

main();
