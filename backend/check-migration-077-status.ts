import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMigrationStatus() {
  console.log('🔍 マイグレーション077の状態を確認中...\n');

  // 1. マイグレーション履歴を確認
  const { data: migrations, error: migError } = await supabase
    .from('schema_migrations')
    .select('*')
    .like('version', '%077%')
    .order('version', { ascending: false });

  if (migError) {
    console.log('⚠️ マイグレーション履歴テーブルが見つかりません');
  } else {
    console.log('📋 マイグレーション履歴:');
    console.log(migrations);
  }

  // 2. property_listingsテーブルの構造を確認
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'property_listings' })
    .single();

  if (colError) {
    console.log('\n⚠️ カラム情報の取得に失敗:', colError.message);
  } else {
    console.log('\n📊 property_listingsテーブルのカラム:');
    console.log(columns);
  }

  // 3. 直接SQLでカラムの存在を確認
  const { data: directCheck, error: directError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'property_listings'
        AND column_name = 'hidden_images'
      `
    });

  if (directError) {
    console.log('\n⚠️ 直接SQLチェック失敗:', directError.message);
  } else {
    console.log('\n🔍 hidden_imagesカラムの直接確認:');
    console.log(directCheck);
  }
}

checkMigrationStatus().catch(console.error);
