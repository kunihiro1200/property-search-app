// Run migration 105: Add broker_survey to buyers
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('マイグレーション105を実行中...\n');

  // SQLファイルを読み込み
  const sqlPath = path.join(__dirname, '105_add_broker_survey_to_buyers.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('実行するSQL:');
  console.log(sql);
  console.log('');

  // SQLを実行
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ マイグレーションに失敗しました:', error);
    
    // 直接実行を試みる
    console.log('\n直接実行を試みます...');
    const { error: directError } = await supabase
      .from('buyers')
      .select('broker_survey')
      .limit(1);

    if (directError && directError.message.includes('does not exist')) {
      console.log('broker_surveyカラムが存在しないことを確認しました');
      console.log('\nSupabase SQL Editorで以下のSQLを実行してください:');
      console.log('---');
      console.log(sql);
      console.log('---');
    }
    
    process.exit(1);
  }

  console.log('✅ マイグレーションが完了しました');

  // 確認
  console.log('\n確認中...');
  const { data: testData, error: testError } = await supabase
    .from('buyers')
    .select('broker_survey')
    .limit(1);

  if (testError) {
    console.error('❌ 確認に失敗しました:', testError);
    process.exit(1);
  }

  console.log('✅ broker_surveyカラムが正常に追加されました');
}

runMigration()
  .then(() => {
    console.log('\nマイグレーション完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
