// PostgreSQLに直接接続してlast_synced_atカラムの存在を確認
// Supabase APIではなく、PostgreSQL直接クエリを使用
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkColumnDirectly() {
  console.log('='.repeat(60));
  console.log('PostgreSQL直接接続でカラム確認');
  console.log('='.repeat(60));
  console.log();

  // DATABASE_URLから接続情報を取得
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL環境変数が設定されていません');
    console.log('\n.envファイルを確認してください:');
    console.log('DATABASE_URL=postgresql://...');
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('📡 PostgreSQLに接続中...\n');
    await client.connect();
    console.log('✅ 接続成功\n');

    // 1. buyersテーブルの全カラムを取得
    console.log('1️⃣ buyersテーブルのカラム情報を取得中...\n');
    
    const columnQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'buyers'
      ORDER BY ordinal_position;
    `;

    const columnResult = await client.query(columnQuery);
    
    console.log(`📊 合計カラム数: ${columnResult.rows.length}\n`);

    // last_synced_atカラムを探す
    const lastSyncedColumn = columnResult.rows.find(
      row => row.column_name === 'last_synced_at'
    );

    const syncedAtColumn = columnResult.rows.find(
      row => row.column_name === 'synced_at'
    );

    console.log('🔍 同期関連カラムの確認:\n');
    
    if (lastSyncedColumn) {
      console.log('✅ last_synced_at カラムが存在します！');
      console.log(`   型: ${lastSyncedColumn.data_type}`);
      console.log(`   NULL許可: ${lastSyncedColumn.is_nullable}`);
      console.log(`   デフォルト値: ${lastSyncedColumn.column_default || 'なし'}`);
    } else {
      console.log('❌ last_synced_at カラムが見つかりません');
    }
    
    console.log();
    
    if (syncedAtColumn) {
      console.log('ℹ️  synced_at カラムが存在します');
      console.log(`   型: ${syncedAtColumn.data_type}`);
      console.log(`   NULL許可: ${syncedAtColumn.is_nullable}`);
      console.log(`   デフォルト値: ${syncedAtColumn.column_default || 'なし'}`);
    } else {
      console.log('ℹ️  synced_at カラムは存在しません');
    }

    console.log('\n' + '-'.repeat(60) + '\n');

    // 2. インデックスの確認
    console.log('2️⃣ インデックスの確認中...\n');
    
    const indexQuery = `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'buyers'
        AND indexname LIKE '%last_synced%';
    `;

    const indexResult = await client.query(indexQuery);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ last_synced_at関連のインデックスが存在します:\n');
      indexResult.rows.forEach(row => {
        console.log(`   ${row.indexname}`);
        console.log(`   ${row.indexdef}\n`);
      });
    } else {
      console.log('❌ last_synced_at関連のインデックスが見つかりません\n');
    }

    console.log('-'.repeat(60) + '\n');

    // 3. 実際のデータを1件取得してカラムを確認
    console.log('3️⃣ 実際のデータでカラムを確認中...\n');
    
    const dataQuery = `
      SELECT *
      FROM buyers
      LIMIT 1;
    `;

    const dataResult = await client.query(dataQuery);
    
    if (dataResult.rows.length > 0) {
      const actualColumns = Object.keys(dataResult.rows[0]);
      console.log(`📋 実際のデータに含まれるカラム数: ${actualColumns.length}\n`);
      
      const hasLastSynced = actualColumns.includes('last_synced_at');
      const hasSynced = actualColumns.includes('synced_at');
      
      if (hasLastSynced) {
        console.log('✅ データに last_synced_at カラムが含まれています');
        console.log(`   値: ${dataResult.rows[0].last_synced_at || 'NULL'}`);
      } else {
        console.log('❌ データに last_synced_at カラムが含まれていません');
      }
      
      console.log();
      
      if (hasSynced) {
        console.log('ℹ️  データに synced_at カラムが含まれています');
        console.log(`   値: ${dataResult.rows[0].synced_at || 'NULL'}`);
      }
    } else {
      console.log('⚠️  buyersテーブルにデータがありません');
    }

    console.log('\n' + '='.repeat(60));
    console.log('診断結果サマリー');
    console.log('='.repeat(60) + '\n');

    if (lastSyncedColumn) {
      console.log('✅ PostgreSQLデータベースには last_synced_at カラムが存在します');
      console.log();
      console.log('📌 重要: Supabase APIで「MISSING」と表示される場合:');
      console.log();
      console.log('   これはPostgRESTのスキーマキャッシュの問題です。');
      console.log('   データベースにはカラムが存在しますが、');
      console.log('   PostgRESTがまだ古いスキーマ情報をキャッシュしています。');
      console.log();
      console.log('🔧 解決方法:');
      console.log();
      console.log('   1. Supabaseダッシュボードで以下のSQLを実行:');
      console.log('      NOTIFY pgrst, \'reload schema\';');
      console.log();
      console.log('   2. それでも解決しない場合、Supabaseプロジェクトを一時停止して再起動');
      console.log('      (Settings → General → Pause project → Resume project)');
      console.log();
      console.log('   3. 数分待ってから再度テスト');
      console.log();
    } else {
      console.log('❌ PostgreSQLデータベースに last_synced_at カラムが存在しません');
      console.log();
      console.log('🔧 解決方法:');
      console.log();
      console.log('   Supabase SQL Editorで以下を実行してください:');
      console.log();
      console.log('   ALTER TABLE buyers');
      console.log('     ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;');
      console.log();
      console.log('   CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at');
      console.log('     ON buyers(last_synced_at DESC);');
      console.log();
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:\n');
    console.error(error.message);
    console.log();
    
    if (error.message.includes('connect')) {
      console.log('💡 ヒント: DATABASE_URL環境変数を確認してください');
      console.log('   正しいフォーマット: postgresql://user:password@host:port/database');
    }
  } finally {
    await client.end();
    console.log('\n接続を閉じました');
  }
}

checkColumnDirectly()
  .then(() => {
    console.log('\n完了');
    process.exit(0);
  })
  .catch((err) => {
    console.error('致命的エラー:', err);
    process.exit(1);
  });
