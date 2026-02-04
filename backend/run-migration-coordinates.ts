import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running migration: 20260204_add_coordinates_to_sellers.sql');
    
    // マイグレーションファイルを読み込む
    const migrationPath = path.resolve(__dirname, 'supabase/migrations/20260204_add_coordinates_to_sellers.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    // マイグレーションを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      
      // 直接SQLを実行してみる
      console.log('🔄 Trying direct SQL execution...');
      
      // 各SQL文を個別に実行
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement) {
          console.log('Executing:', statement.substring(0, 50) + '...');
          const { error: execError } = await supabase.rpc('exec_sql', { sql: statement });
          if (execError) {
            console.error('Error:', execError);
          }
        }
      }
    } else {
      console.log('✅ Migration completed successfully');
    }
    
    // 確認: sellersテーブルのカラムを確認
    console.log('\n🔍 Verifying sellers table columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('sellers')
      .select('latitude, longitude')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Verification failed:', columnsError);
    } else {
      console.log('✅ Columns verified:', Object.keys(columns?.[0] || {}));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMigration();
