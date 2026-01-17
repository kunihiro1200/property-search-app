/**
 * Migration 081 Direct PostgreSQL Verification Script
 * 
 * This script bypasses PostgREST and connects directly to PostgreSQL
 * to verify that Migration 081 columns actually exist in the database.
 * 
 * This eliminates confusion caused by PostgREST schema cache lag.
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

const EXPECTED_PROPERTIES_COLUMNS = [
  'id',
  'seller_id',
  'property_type',
  'land_area',
  'building_area',
  'land_area_verified',
  'building_area_verified',
  'construction_year',
  'structure',
  'property_address',
  'property_address_ieul_apartment',
  'current_status',
  'fixed_asset_tax_road_price',
  'floor_plan',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by'
];

const EXPECTED_VALUATIONS_COLUMNS = [
  'id',
  'property_id',
  'valuation_type',
  'valuation_amount_1',
  'valuation_amount_2',
  'valuation_amount_3',
  'calculation_method',
  'calculation_parameters',
  'valuation_report_url',
  'valuation_date',
  'created_by',
  'notes',
  'created_at'
];

async function verifyMigration081() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ エラー: DATABASE_URL 環境変数が設定されていません');
    console.error('');
    console.error('解決方法:');
    console.error('1. backend/.env ファイルを確認');
    console.error('2. DATABASE_URL=postgresql://... の行を追加');
    console.error('3. Supabaseダッシュボード → Project Settings → Database → Connection string から取得');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log('🔌 PostgreSQLに直接接続中...\n');
    await client.connect();
    console.log('✅ 接続成功\n');

    // Check properties table
    console.log('📋 properties テーブルを確認中...');
    const propertiesColumns = await client.query<ColumnInfo>(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'properties'
       ORDER BY ordinal_position`
    );

    if (propertiesColumns.rows.length === 0) {
      console.error('❌ properties テーブルが存在しません');
      console.error('');
      console.error('次のステップ:');
      console.error('1. backend/migrations/081_create_properties_and_valuations.sql を実行');
      console.error('2. または backend/migrations/run-081-migration.ts を実行');
      process.exit(1);
    }

    console.log(`✅ properties テーブルが存在します (${propertiesColumns.rows.length} カラム)`);
    console.log('');

    // Check for missing columns in properties
    const actualPropertiesColumns = propertiesColumns.rows.map(r => r.column_name);
    const missingPropertiesColumns = EXPECTED_PROPERTIES_COLUMNS.filter(
      col => !actualPropertiesColumns.includes(col)
    );

    if (missingPropertiesColumns.length > 0) {
      console.error('❌ properties テーブルに不足しているカラム:');
      missingPropertiesColumns.forEach(col => console.error(`   - ${col}`));
      console.error('');
      console.error('次のステップ:');
      console.error('1. backend/migrations/081_補完_add_missing_columns.sql を実行');
      console.error('2. または Supabase SQL Editor で直接実行');
      process.exit(1);
    }

    console.log('✅ properties の全ての期待されるカラムが存在します');
    console.log('');
    console.log('カラム一覧:');
    propertiesColumns.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(35)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');

    // Check valuations table
    console.log('📋 valuations テーブルを確認中...');
    const valuationsColumns = await client.query<ColumnInfo>(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'valuations'
       ORDER BY ordinal_position`
    );

    if (valuationsColumns.rows.length === 0) {
      console.error('❌ valuations テーブルが存在しません');
      console.error('');
      console.error('次のステップ:');
      console.error('1. backend/migrations/081_create_properties_and_valuations.sql を実行');
      console.error('2. または backend/migrations/run-081-migration.ts を実行');
      process.exit(1);
    }

    console.log(`✅ valuations テーブルが存在します (${valuationsColumns.rows.length} カラム)`);
    console.log('');

    // Check for missing columns in valuations
    const actualValuationsColumns = valuationsColumns.rows.map(r => r.column_name);
    const missingValuationsColumns = EXPECTED_VALUATIONS_COLUMNS.filter(
      col => !actualValuationsColumns.includes(col)
    );

    if (missingValuationsColumns.length > 0) {
      console.error('❌ valuations テーブルに不足しているカラム:');
      missingValuationsColumns.forEach(col => console.error(`   - ${col}`));
      console.error('');
      console.error('次のステップ:');
      console.error('1. backend/migrations/081_補完_add_missing_columns.sql を実行');
      console.error('2. または Supabase SQL Editor で直接実行');
      process.exit(1);
    }

    console.log('✅ valuations の全ての期待されるカラムが存在します');
    console.log('');
    console.log('カラム一覧:');
    valuationsColumns.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(35)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('');

    // Success!
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ 全ての検証に合格しました！');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 次のステップ:');
    console.log('');
    console.log('1. PostgRESTスキーマキャッシュを更新');
    console.log('   方法: Supabase SQL Editor で以下を実行');
    console.log('   ```sql');
    console.log('   NOTIFY pgrst, \'reload schema\';');
    console.log('   ```');
    console.log('');
    console.log('2. REST API経由での検証（オプション）');
    console.log('   ```bash');
    console.log('   npx ts-node migrations/verify-081-migration.ts');
    console.log('   ```');
    console.log('');
    console.log('3. Phase 2の実装を開始');
    console.log('   - TypeScript型定義の追加');
    console.log('   - PropertyService の実装');
    console.log('   - ValuationEngine の実装');
    console.log('');

  } catch (error) {
    console.error('❌ エラーが発生しました:');
    console.error(error);
    console.error('');
    console.error('トラブルシューティング:');
    console.error('1. DATABASE_URL が正しいか確認');
    console.error('2. データベースに接続できるか確認');
    console.error('3. ネットワーク接続を確認');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run verification
verifyMigration081().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});
