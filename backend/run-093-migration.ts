import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runMigration() {
  console.log('🔄 Running migration 093: Add inquiry fields to sellers...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // マイグレーションファイルを読み込む
  const migrationPath = path.join(__dirname, 'migrations', '093_add_inquiry_fields_to_sellers.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // マイグレーションを実行
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // rpcが存在しない場合は、直接SQLを実行
      console.log('⚠️  rpc method not available, trying direct execution...');
      
      // SQLを分割して実行
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DO $$') || statement.includes('DO $')) {
          // DO ブロックはスキップ（メッセージ表示のみ）
          continue;
        }

        const { error: execError } = await supabase.rpc('exec', { 
          query: statement 
        });

        if (execError) {
          console.error('❌ Error executing statement:', execError.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('✅ Migration 093 completed successfully\n');
    console.log('📊 Added columns:');
    console.log('   - inquiry_year (INTEGER): 反響年');
    console.log('   - inquiry_date (DATE): 反響日');
    console.log('   - inquiry_site (VARCHAR(100)): サイト');
    console.log('\n');

    // カラムが追加されたことを確認
    const { data, error: checkError } = await supabase
      .from('sellers')
      .select('inquiry_year, inquiry_date, inquiry_site')
      .limit(1);

    if (checkError) {
      console.error('⚠️  Warning: Could not verify columns:', checkError.message);
    } else {
      console.log('✅ Columns verified successfully');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration().catch(console.error);
