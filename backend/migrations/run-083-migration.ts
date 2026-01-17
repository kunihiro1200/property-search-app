/**
 * Migration 083実行スクリプト
 * 同期メトリクステーブルの作成
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Migration 083を実行します...\n');

  try {
    // マイグレーションSQLファイルを読み込む
    const sqlPath = path.join(__dirname, '083_add_sync_metrics_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQLファイルを読み込みました');
    console.log('📊 テーブルを作成中...\n');

    // SQLを実行（Supabase REST APIを使用）
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ マイグレーション実行エラー:', error);
      process.exit(1);
    }

    console.log('✅ Migration 083が正常に完了しました\n');

    // 作成されたテーブルを確認
    console.log('📋 作成されたテーブル:');
    console.log('  - sync_metrics');
    console.log('  - sync_metrics_aggregated');
    console.log('  - alert_rules');
    console.log('  - alert_history\n');

    // デフォルトのアラートルールを確認
    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('name, severity, enabled');

    if (!rulesError && rules) {
      console.log('🚨 デフォルトのアラートルール:');
      rules.forEach(rule => {
        console.log(`  - ${rule.name} (${rule.severity}) ${rule.enabled ? '✓' : '✗'}`);
      });
    }

    console.log('\n✨ マイグレーション完了！');
  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  }
}

runMigration();
