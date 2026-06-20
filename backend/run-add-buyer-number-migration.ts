import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  console.log('🔄 マイグレーションを実行中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // SQLファイルを読み込む
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add-buyer-number-to-inquiries.sql'),
      'utf-8'
    );

    console.log('📝 SQL:');
    console.log(sql);
    console.log('');

    // SQLを実行
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ マイグレーション失敗:', error);
      return;
    }

    console.log('✅ マイグレーション成功！');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

runMigration();
