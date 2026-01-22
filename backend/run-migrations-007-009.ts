import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigrations() {
  console.log('🚀 マイグレーション007と009を実行します...\n');

  try {
    // マイグレーション007を実行
    console.log('📝 マイグレーション007を実行中...');
    const migration007Path = path.join(__dirname, 'migrations', '007_phase1_seller_enhancements.sql');
    const migration007SQL = fs.readFileSync(migration007Path, 'utf-8');
    
    const { error: error007 } = await supabase.rpc('exec_sql', { sql: migration007SQL });
    
    if (error007) {
      console.error('❌ マイグレーション007エラー:', error007);
      console.log('\n⚠️  直接SQLを実行する必要があります。');
      console.log('   Supabase Dashboardで以下のSQLを実行してください:');
      console.log(`   ${migration007Path}`);
    } else {
      console.log('✅ マイグレーション007完了');
    }

    // マイグレーション009を実行
    console.log('\n📝 マイグレーション009を実行中...');
    const migration009Path = path.join(__dirname, 'migrations', '009_full_seller_fields_expansion.sql');
    const migration009SQL = fs.readFileSync(migration009Path, 'utf-8');
    
    const { error: error009 } = await supabase.rpc('exec_sql', { sql: migration009SQL });
    
    if (error009) {
      console.error('❌ マイグレーション009エラー:', error009);
      console.log('\n⚠️  直接SQLを実行する必要があります。');
      console.log('   Supabase Dashboardで以下のSQLを実行してください:');
      console.log(`   ${migration009Path}`);
    } else {
      console.log('✅ マイグレーション009完了');
    }

    console.log('\n🎯 次のステップ:');
    console.log('   1. Supabase Dashboard (https://supabase.com/dashboard) にアクセス');
    console.log('   2. プロジェクトを選択');
    console.log('   3. SQL Editor を開く');
    console.log('   4. 以下のファイルの内容をコピー＆ペーストして実行:');
    console.log(`      - ${migration007Path}`);
    console.log(`      - ${migration009Path}`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

runMigrations()
  .then(() => {
    console.log('\n✅ 処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
