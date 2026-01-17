import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 マイグレーション078を実行中...\n');

  try {
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, '078_force_add_hidden_images.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 実行するSQL:');
    console.log(sql);
    console.log('\n');

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('❌ マイグレーション実行エラー:', error);
      throw error;
    }

    console.log('✅ マイグレーション078が正常に実行されました');
    console.log('結果:', data);

    // 30秒待機してスキーマキャッシュがリロードされるのを待つ
    console.log('\n⏳ スキーマキャッシュのリロードを待機中（30秒）...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 確認
    console.log('\n🔍 カラムの存在を確認中...');
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('hidden_images')
      .limit(1);

    if (checkError) {
      console.error('⚠️ 確認エラー:', checkError);
    } else {
      console.log('✅ hidden_imagesカラムにアクセスできました！');
      console.log('サンプルデータ:', checkData);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

runMigration();
