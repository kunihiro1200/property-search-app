import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkWorkTasksSchema() {
  console.log('=== work_tasksテーブルのスキーマ確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1件のデータを取得してカラム名を確認
  const { data, error } = await supabase
    .from('work_tasks')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (data) {
    console.log('カラム一覧:');
    const columns = Object.keys(data).sort();
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col}`);
    });
    console.log(`\n合計: ${columns.length}カラム`);
  }
}

checkWorkTasksSchema().catch(console.error);
