import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('='.repeat(80));
console.log('Migration 081 詳細診断スクリプト');
console.log('='.repeat(80));
console.log();

// 1. 環境変数の確認
console.log('📋 ステップ 1: 環境変数の確認');
console.log('-'.repeat(80));
console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ 設定済み' : '❌ 未設定'}`);
console.log();

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.log();
  console.log('解決方法:');
  console.log('1. backend/.env ファイルを確認してください');
  console.log('2. SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が正しく設定されているか確認してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  try {
    // 2. PostgreSQL直接接続でカラムの存在確認
    console.log('📋 ステップ 2: PostgreSQL直接接続でカラムの存在確認');
    console.log('-'.repeat(80));
    
    const { data: propertiesColumns, error: propColError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'properties'
        ORDER BY ordinal_position;
      `
    });

    if (propColError) {
      console.log('⚠️  RPC関数が利用できません。代替方法を使用します...');
      console.log();
    } else {
      console.log('✅ properties テーブルのカラム:');
      console.log(JSON.stringify(propertiesColumns, null, 2));
      console.log();
    }

    // 3. REST API経由でのカラム認識確認
    console.log('📋 ステップ 3: Supabase REST API経由でのカラム認識');
    console.log('-'.repeat(80));
    
    const { data: propertiesData, error: propError } = await supabase
      .from('properties')
      .select('*')
      .limit(1);

    if (propError) {
      console.log(`❌ properties テーブルへのアクセスエラー: ${propError.message}`);
    } else {
      console.log('✅ properties テーブルにアクセス成功');
      if (propertiesData && propertiesData.length > 0) {
        console.log('認識されているカラム:');
        console.log(Object.keys(propertiesData[0]).join(', '));
      } else {
        console.log('⚠️  データが存在しません（カラム構造は確認できません）');
      }
    }
    console.log();

    const { data: valuationsData, error: valError } = await supabase
      .from('valuations')
      .select('*')
      .limit(1);

    if (valError) {
      console.log(`❌ valuations テーブルへのアクセスエラー: ${valError.message}`);
    } else {
      console.log('✅ valuations テーブルにアクセス成功');
      if (valuationsData && valuationsData.length > 0) {
        console.log('認識されているカラム:');
        console.log(Object.keys(valuationsData[0]).join(', '));
      } else {
        console.log('⚠️  データが存在しません（カラム構造は確認できません）');
      }
    }
    console.log();

    // 4. マイグレーション実行履歴の確認
    console.log('📋 ステップ 4: マイグレーション実行履歴の確認');
    console.log('-'.repeat(80));
    
    const { data: migrations, error: migError } = await supabase
      .from('schema_migrations')
      .select('*')
      .eq('version', '081')
      .single();

    if (migError) {
      if (migError.code === 'PGRST116') {
        console.log('❌ Migration 081 は実行されていません');
      } else {
        console.log(`⚠️  マイグレーション履歴の確認エラー: ${migError.message}`);
      }
    } else {
      console.log('✅ Migration 081 は実行済みです');
      console.log(`実行日時: ${migrations.executed_at}`);
    }
    console.log();

    // 5. 診断結果のサマリー
    console.log('='.repeat(80));
    console.log('📊 診断結果サマリー');
    console.log('='.repeat(80));
    console.log();
    
    const propertiesAccessible = !propError;
    const valuationsAccessible = !valError;
    const migrationExecuted = !migError && migrations;

    console.log(`✅ 環境変数: 正常`);
    console.log(`${propertiesAccessible ? '✅' : '❌'} properties テーブル: ${propertiesAccessible ? 'アクセス可能' : 'アクセス不可'}`);
    console.log(`${valuationsAccessible ? '✅' : '❌'} valuations テーブル: ${valuationsAccessible ? 'アクセス可能' : 'アクセス不可'}`);
    console.log(`${migrationExecuted ? '✅' : '❌'} Migration 081: ${migrationExecuted ? '実行済み' : '未実行'}`);
    console.log();

    // 6. 推奨される次のステップ
    console.log('='.repeat(80));
    console.log('🔧 推奨される次のステップ');
    console.log('='.repeat(80));
    console.log();

    if (!migrationExecuted) {
      console.log('❗ Migration 081 が実行されていません');
      console.log();
      console.log('次のコマンドを実行してください:');
      console.log('  cd backend');
      console.log('  npx ts-node migrations/run-081-migration.ts');
      console.log();
    } else if (!propertiesAccessible || !valuationsAccessible) {
      console.log('❗ テーブルは存在しますが、REST API経由でアクセスできません');
      console.log();
      console.log('原因の可能性:');
      console.log('  A. PostgRESTのスキーマキャッシュが古い');
      console.log('  B. RLSポリシーの問題');
      console.log('  C. テーブルの権限設定の問題');
      console.log();
      console.log('解決方法:');
      console.log('  1. Supabaseダッシュボードでプロジェクトを一時停止して再起動');
      console.log('  2. または、以下のSQLを実行:');
      console.log('     NOTIFY pgrst, \'reload schema\';');
      console.log();
    } else {
      console.log('✅ すべて正常です！');
      console.log();
      console.log('Migration 081 は正常に実行され、テーブルにアクセスできます。');
      console.log();
    }

  } catch (error) {
    console.error('❌ 診断中にエラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

diagnose();
