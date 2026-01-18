// Migration 094実行スクリプト: buyer_numberにユニーク制約を追加
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('=== Migration 094: buyer_numberにユニーク制約を追加 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // マイグレーションファイルを読み込み
    const migrationPath = path.join(__dirname, 'migrations', '094_add_buyer_number_unique_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('マイグレーションを実行中...\n');

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ マイグレーション実行エラー:', error);
      
      // 直接PostgreSQL接続で実行を試みる
      console.log('\n直接実行を試みます...\n');
      
      const { Client } = require('pg');
      const client = new Client({
        connectionString: process.env.DATABASE_URL
      });

      await client.connect();
      await client.query(migrationSQL);
      await client.end();

      console.log('✅ 直接実行で成功しました');
    } else {
      console.log('✅ マイグレーションが正常に完了しました');
    }

    // 制約が追加されたか確認
    console.log('\n制約の確認中...\n');
    
    const { data: constraints, error: checkError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT constraint_name, constraint_type
          FROM information_schema.table_constraints
          WHERE table_name = 'buyers' AND constraint_name = 'buyers_buyer_number_unique';
        `
      });

    if (checkError) {
      console.warn('⚠️ 制約の確認に失敗しました:', checkError.message);
    } else if (constraints && constraints.length > 0) {
      console.log('✅ ユニーク制約が正常に追加されました');
      console.log('   制約名: buyers_buyer_number_unique');
    } else {
      console.warn('⚠️ 制約が見つかりませんでした');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

runMigration();
