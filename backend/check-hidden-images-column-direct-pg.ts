import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHiddenImagesColumn() {
  console.log('=== hidden_imagesカラム存在確認(直接PostgreSQL) ===\n');

  try {
    // 1. テーブルの全カラムを取得
    console.log('1. property_listingsテーブルの全カラムを取得:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ エラー:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      console.log('✅ カラム一覧:', columns);
      console.log('\n📊 カラム数:', columns.length);
      
      if (columns.includes('hidden_images')) {
        console.log('✅ hidden_imagesカラムが存在します!');
      } else {
        console.log('❌ hidden_imagesカラムが見つかりません');
        console.log('\n利用可能なカラム:');
        columns.forEach(col => console.log(`  - ${col}`));
      }
    } else {
      console.log('⚠️ データが0件です');
    }

    // 2. hidden_imagesカラムを直接SELECTしてみる
    console.log('\n2. hidden_imagesカラムを直接SELECT:');
    const { data: hiddenData, error: hiddenError } = await supabase
      .from('property_listings')
      .select('id, hidden_images')
      .limit(5);

    if (hiddenError) {
      console.error('❌ エラー:', hiddenError);
      console.log('→ カラムが存在しないか、権限がありません');
    } else {
      console.log('✅ 成功! データ:', hiddenData);
    }

  } catch (error) {
    console.error('❌ 予期しないエラー:', error);
  }
}

checkHiddenImagesColumn();
