import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
  // Supabase URLからPostgreSQL接続文字列を構築
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  
  // Supabase URLからホスト名を抽出
  const host = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const connectionString = `postgresql://postgres.${host}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
  
  console.log('🔄 Connecting to database...');
  console.log('Host:', host);
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // マイグレーションファイルを読み込む
    const migrationPath = path.resolve(__dirname, 'supabase/migrations/20260204_add_coordinates_to_sellers.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('🔄 Running migration: 20260204_add_coordinates_to_sellers.sql');
    
    // マイグレーションを実行
    await client.query(migrationSql);
    
    console.log('✅ Migration completed successfully');
    
    // 確認: sellersテーブルのカラムを確認
    console.log('\n🔍 Verifying sellers table columns...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sellers' 
      AND column_name IN ('latitude', 'longitude')
      ORDER BY column_name;
    `);
    
    console.log('✅ Columns verified:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
