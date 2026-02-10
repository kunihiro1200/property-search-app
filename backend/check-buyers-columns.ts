// buyersテーブルのカラムを確認
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('buyersテーブルのカラムを確認中...\n');

  // 1件だけ取得してカラム名を確認
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('データが見つかりません');
    return;
  }

  const columns = Object.keys(data[0]);
  console.log('カラム数:', columns.length);
  console.log('\nカラム一覧:');
  columns.sort().forEach((col, index) => {
    console.log(`${index + 1}. ${col}`);
  });

  // broker_surveyが存在するか確認
  if (columns.includes('broker_survey')) {
    console.log('\n✅ broker_surveyカラムが存在します');
  } else {
    console.log('\n❌ broker_surveyカラムが存在しません');
  }
}

checkColumns()
  .then(() => {
    console.log('\n確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
