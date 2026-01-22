// 直接PostgreSQLでproperty_detailsにアクセスするテスト
// PostgRESTをバイパスして、スキーマキャッシュ問題を完全に回避
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

function buildConnectionString(): string {
  const url = process.env.SUPABASE_URL!;
  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_KEY!;
  
  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
}

async function testDirectSQL() {
  console.log('🚀 Testing direct PostgreSQL access to property_details...\n');
  console.log('💡 Using pg package to bypass PostgREST schema cache\n');
  
  // DATABASE_URLを直接使用（buildConnectionString()は使わない）
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('📋 Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  const testPropertyNumber = 'TEST-PG-001';
  
  const client = await pool.connect();
  
  try {
    // 1. データを挿入（UPSERT）
    console.log('📝 Step 1: Inserting test data...');
    
    await client.query(
      `INSERT INTO public.property_details (
        property_number, property_about, recommended_comments, athome_data, favorite_comment, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (property_number) 
      DO UPDATE SET
        property_about = EXCLUDED.property_about,
        recommended_comments = EXCLUDED.recommended_comments,
        athome_data = EXCLUDED.athome_data,
        favorite_comment = EXCLUDED.favorite_comment,
        updated_at = NOW()`,
      [
        testPropertyNumber,
        'これは直接PostgreSQL経由のテストです',
        JSON.stringify(['直接PG推奨1', '直接PG推奨2']),
        JSON.stringify(['直接PG情報1', '直接PG情報2']),
        '直接PGお気に入り'
      ]
    );
    
    console.log('✅ Insert successful!');
    
    // 2. データを取得
    console.log('\n🔍 Step 2: Retrieving test data...');
    
    const selectResult = await client.query(
      `SELECT * FROM public.property_details WHERE property_number = $1`,
      [testPropertyNumber]
    );
    
    if (selectResult.rows.length === 0) {
      throw new Error('No data found after insert');
    }
    
    console.log('✅ Select successful!');
    console.log('📊 Retrieved data:', JSON.stringify(selectResult.rows[0], null, 2));
    
    // 3. データを更新
    console.log('\n📝 Step 3: Updating test data...');
    
    await client.query(
      `UPDATE public.property_details 
       SET property_about = $1, updated_at = NOW()
       WHERE property_number = $2`,
      ['更新されたテストデータ（PostgreSQL直接）', testPropertyNumber]
    );
    
    const updateResult = await client.query(
      `SELECT * FROM public.property_details WHERE property_number = $1`,
      [testPropertyNumber]
    );
    
    console.log('✅ Update successful!');
    console.log('📊 Updated data:', JSON.stringify(updateResult.rows[0], null, 2));
    
    // 4. 削除
    console.log('\n🗑️ Step 4: Cleaning up test data...');
    
    await client.query(
      `DELETE FROM public.property_details WHERE property_number = $1`,
      [testPropertyNumber]
    );
    
    console.log('✅ Delete successful!');
    
    console.log('\n🎉 All tests passed! Direct PostgreSQL access works perfectly.');
    console.log('\n💡 This approach completely bypasses PostgREST and avoids schema cache issues.');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('📋 Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
  
  process.exit(0);
}

testDirectSQL();
