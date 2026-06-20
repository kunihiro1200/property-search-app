import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
  console.log('🔄 マイグレーションを実行中...\n');

  const migrationPath = path.resolve(
    __dirname,
    'supabase/migrations/20260130_add_missing_property_fields_to_sellers.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📋 実行するSQL:');
  console.log(sql);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // SQLを実行
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ マイグレーション失敗:', error);
    
    // 直接実行を試みる
    console.log('\n🔄 直接実行を試みます...\n');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;
      
      console.log(`実行中: ${statement.substring(0, 100)}...`);
      
      const { error: execError } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });
      
      if (execError) {
        console.error(`❌ エラー: ${execError.message}`);
      } else {
        console.log('✅ 成功');
      }
    }
    
    return;
  }

  console.log('✅ マイグレーション成功！');
  console.log('結果:', data);
}

runMigration().catch(console.error);
