/**
 * AA18物件の現在の状態を確認するスクリプト
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 AA18物件の現在の状態を確認中...\n');

  try {
    // property_listingsテーブルからAA18を検索
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('*')
      .ilike('property_number', '%AA18%');

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    console.log(`✅ 検索結果: ${properties?.length || 0}件\n`);

    if (!properties || properties.length === 0) {
      console.log('❌ AA18物件が見つかりませんでした');
      console.log('\n💡 確認事項:');
      console.log('   1. property_listingsテーブルにAA18が存在するか');
      console.log('   2. property_numberの値を確認（大文字小文字、スペースなど）');
      return;
    }

    // 見つかった物件を表示
    properties.forEach((prop, index) => {
      console.log(`\n物件 ${index + 1}:`);
      console.log(`  property_number: "${prop.property_number}"`);
      console.log(`  storage_location: ${prop.storage_location || '(未設定)'}`);
      console.log(`  site_display: ${prop.site_display || '(未設定)'}`);
      console.log(`  property_type: ${prop.property_type || '(未設定)'}`);
      console.log(`  address: ${prop.address || '(未設定)'}`);
      console.log(`  created_at: ${prop.created_at}`);
    });

    // storage_locationが未設定の場合
    const needsStorageLocation = properties.filter(p => !p.storage_location);
    if (needsStorageLocation.length > 0) {
      console.log('\n\n⚠️ storage_locationが未設定の物件:');
      needsStorageLocation.forEach(prop => {
        console.log(`  - ${prop.property_number}`);
      });
      
      console.log('\n💡 次のステップ:');
      console.log('   1. Google DriveでAA18のフォルダを探す');
      console.log('   2. フォルダURLを取得');
      console.log('   3. 以下のSQLで設定:');
      console.log(`\n   UPDATE property_listings`);
      console.log(`   SET storage_location = 'YOUR_FOLDER_URL'`);
      console.log(`   WHERE property_number = 'AA18';`);
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

main();
