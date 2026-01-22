import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function createSyncTablesDirect() {
  // DATABASE_URLから直接PostgreSQLに接続
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL接続成功');

    // sync_logsテーブル作成
    console.log('\n1. sync_logsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sync_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        records_processed INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,
        error_message TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ sync_logsテーブル作成完了');

    // error_logsテーブル作成
    console.log('\n2. error_logsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.error_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sync_log_id UUID REFERENCES public.sync_logs(id),
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        context JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ error_logsテーブル作成完了');

    // sync_healthテーブル作成
    console.log('\n3. sync_healthテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.sync_health (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        last_successful_sync TIMESTAMPTZ,
        last_failed_sync TIMESTAMPTZ,
        consecutive_failures INTEGER DEFAULT 0,
        health_status TEXT NOT NULL CHECK (health_status IN ('healthy', 'degraded', 'unhealthy')),
        last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ sync_healthテーブル作成完了');

    // sellersテーブルにsynced_to_sheet_atカラム追加
    console.log('\n4. sellersテーブルにsynced_to_sheet_atカラムを追加中...');
    await client.query(`
      ALTER TABLE public.sellers 
      ADD COLUMN IF NOT EXISTS synced_to_sheet_at TIMESTAMPTZ;
    `);
    console.log('✅ synced_to_sheet_atカラム追加完了');

    // migrationsテーブル作成
    console.log('\n5. migrationsテーブルを作成中...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ migrationsテーブル作成完了');

    // マイグレーション記録を挿入
    console.log('\n6. マイグレーション記録を挿入中...');
    await client.query(`
      INSERT INTO public.migrations (name) 
      VALUES ('039_add_sync_health')
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ マイグレーション記録挿入完了');

    // PostgRESTにスキーマリロードを通知
    console.log('\n7. PostgRESTにスキーマリロードを通知中...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    await client.query(`NOTIFY pgrst, 'reload config';`);
    console.log('✅ スキーマリロード通知完了');

    console.log('\n✅ すべてのテーブル作成が完了しました！');
    console.log('\n次のステップ:');
    console.log('1. 約30秒待ってください');
    console.log('2. 以下のコマンドで確認してください:');
    console.log('   npx ts-node check-sync-tables-simple.ts');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n接続を閉じました');
  }
}

createSyncTablesDirect();
