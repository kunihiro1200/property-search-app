import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_KEY が設定されていません');
  console.error('現在の環境変数:');
  console.error('  SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('  SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 マイグレーション 034 を開始します...');
    console.log('\n⚠️  Supabaseでは、ALTER TABLEコマンドはSupabase SQL Editorで実行する必要があります。');
    console.log('\n以下の手順で実行してください:');
    console.log('1. Supabaseダッシュボードにログイン');
    console.log('2. SQL Editorを開く');
    console.log('3. 以下のSQLを実行:\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '034_add_visit_department.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log('---SQL START---');
    console.log(migrationSQL);
    console.log('---SQL END---\n');
    
    console.log('4. SQLが正常に実行されたら、このスクリプトを再実行して検証してください\n');
    
    // 検証: visit_department 列が存在するかチェック
    console.log('📊 検証: visit_department 列が存在するかチェック中...');
    const { data: sellers, error: selectError } = await supabase
      .from('sellers')
      .select('id, visit_department, visit_valuation_acquirer')
      .limit(1);
    
    if (selectError) {
      if (selectError.message.includes('visit_department')) {
        console.error('\n❌ visit_department 列がまだ存在しません');
        console.error('上記のSQLをSupabase SQL Editorで実行してください\n');
        process.exit(1);
      } else {
        console.error('❌ データ取得エラー:', selectError.message);
        process.exit(1);
      }
    } else {
      console.log('✅ visit_department 列が正常に存在します');
      console.log('✅ visit_valuation_acquirer 列も存在します');
      console.log('サンプルデータ:', sellers);
      console.log('\n✅ マイグレーション 034 の検証が完了しました');
    }
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ 完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 失敗:', error);
    process.exit(1);
  });
