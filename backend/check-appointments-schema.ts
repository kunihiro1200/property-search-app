import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('=== Appointmentsテーブルのスキーマ確認 ===\n');

  // テーブルの情報を取得
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .limit(0);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('テーブルは存在します');
  
  // 実際のレコードを1件取得してカラムを確認
  const { data: records, error: recordError } = await supabase
    .from('appointments')
    .select('*')
    .limit(1);

  if (recordError) {
    console.error('Error fetching records:', recordError);
    return;
  }

  if (records && records.length > 0) {
    console.log('\nカラム一覧:');
    Object.keys(records[0]).forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('\nレコードが存在しないため、カラム一覧を直接確認できません');
    console.log('マイグレーションを実行してください');
  }
}

checkSchema();
