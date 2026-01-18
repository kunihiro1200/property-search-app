// work_tasksテーブルの存在確認
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkTable() {
  console.log('=== work_tasksテーブルの確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // テーブルの存在確認
    const { data, error } = await supabase
      .from('work_tasks')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ work_tasksテーブルが見つかりません');
      console.error('エラー:', error.message);
      console.error('コード:', error.code);
      console.log('\n⚠️ work_tasksテーブルを作成する必要があります');
    } else {
      console.log('✅ work_tasksテーブルは存在します');
      console.log(`レコード数: ${data?.length || 0}件`);
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkTable();
