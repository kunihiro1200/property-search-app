/**
 * Migration 040: work_tasksテーブルの作成
 * 業務依頼スプレッドシートのデータを格納するテーブル
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('=== Migration 040: work_tasksテーブルの作成 ===\n');

  try {
    // まずテーブルが既に存在するか確認
    const { error: checkError } = await supabase
      .from('work_tasks')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ work_tasks table already exists');
      return;
    }

    if (checkError.code === '42P01') {
      // テーブルが存在しない場合
      console.log('Table does not exist. Please run the following SQL in Supabase SQL Editor:');
      console.log('\n--- Copy the content of backend/migrations/040_add_work_tasks.sql ---\n');
      console.log('After running the SQL, execute this script again to verify.');
      process.exit(1);
    }

    console.log('⚠️ Unexpected error:', checkError.message);
    console.log('Please run the SQL manually in Supabase SQL Editor.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runMigration();
