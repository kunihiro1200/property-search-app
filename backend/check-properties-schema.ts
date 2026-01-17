import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertiesSchema() {
  console.log('🔍 propertiesテーブルのスキーマを確認\n');

  // サンプルデータを1件取得してカラム名を確認
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  propertiesテーブルにデータがありません');
    console.log('   空のINSERTを試してカラム名を確認します...');
    
    // 空のINSERTを試してエラーメッセージからカラム名を確認
    const { error: insertError } = await supabase
      .from('properties')
      .insert({});
    
    if (insertError) {
      console.log('エラーメッセージ:', insertError.message);
    }
    return;
  }

  console.log('✅ 利用可能なカラム:');
  const columns = Object.keys(data[0]);
  columns.forEach((col, index) => {
    console.log(`   ${index + 1}. ${col}`);
  });
}

checkPropertiesSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
