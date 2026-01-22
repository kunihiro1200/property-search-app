// hidden_imagesカラムの存在確認スクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkHiddenImagesColumn() {
  console.log('🔍 property_listingsテーブルのhidden_imagesカラムを確認中...\n');

  try {
    // テーブルの構造を確認
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 property_listingsテーブルのカラム一覧:');
      columns.forEach(col => console.log(`  - ${col}`));
      
      console.log('\n');
      
      if (columns.includes('hidden_images')) {
        console.log('✅ hidden_imagesカラムは存在します');
        
        // サンプルデータを確認
        const sampleData = data[0] as any;
        console.log(`\n📊 サンプルデータ:`);
        console.log(`  hidden_images: ${JSON.stringify(sampleData.hidden_images)}`);
      } else {
        console.log('❌ hidden_imagesカラムが存在しません！');
        console.log('\n💡 解決方法:');
        console.log('  1. マイグレーション077を実行してください');
        console.log('  2. または以下のSQLを直接実行してください:');
        console.log('\n```sql');
        console.log('ALTER TABLE property_listings');
        console.log("ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';");
        console.log('```\n');
      }
    } else {
      console.log('⚠️ property_listingsテーブルにデータがありません');
    }
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkHiddenImagesColumn();
