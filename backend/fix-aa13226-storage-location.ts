/**
 * AA13226 格納先URL修正スクリプト
 * 
 * work_tasksテーブルのstorage_urlをproperty_listingsテーブルのstorage_locationにコピーします。
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA13226StorageLocation() {
  console.log('=== AA13226 格納先URL修正 ===\n');

  try {
    // 1. property_listingsの現在のデータを確認
    console.log('📊 property_listingsテーブルを確認中...');
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', 'AA13226')
      .single();

    if (propertyError || !property) {
      console.log('❌ property_listingsにAA13226が見つかりません');
      return;
    }

    console.log('✅ property_listingsにAA13226が見つかりました');
    console.log(`  ID: ${property.id}`);
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  現在のstorage_location: ${property.storage_location || '(未設定)'}`);

    // 2. work_tasksからstorage_urlを取得
    console.log('\n📊 work_tasksテーブルからstorage_urlを取得中...');
    const { data: workTask, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('property_number, storage_url')
      .eq('property_number', 'AA13226')
      .single();

    if (workTaskError || !workTask) {
      console.log('❌ work_tasksにAA13226が見つかりません');
      return;
    }

    if (!workTask.storage_url) {
      console.log('❌ work_tasks.storage_urlが未設定です');
      console.log('\n💡 解決策:');
      console.log('  1. check-aa13226-work-task.ts を実行してスプレッドシートから同期');
      console.log('  2. スプレッドシートの「格納先URL」列に値を設定');
      return;
    }

    console.log('✅ work_tasksにstorage_urlが設定されています');
    console.log(`  storage_url: ${workTask.storage_url}`);

    // 3. storage_locationを更新
    console.log('\n📝 property_listings.storage_locationを更新中...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ storage_location: workTask.storage_url })
      .eq('property_number', 'AA13226');

    if (updateError) {
      console.log('❌ 更新に失敗しました:', updateError.message);
      return;
    }

    console.log('✅ 更新完了！');
    console.log(`\n設定された格納先URL:`);
    console.log(`  ${workTask.storage_url}`);
    
    console.log('\n次のステップ:');
    console.log('  1. ブラウザで公開物件サイトを開く');
    console.log('     http://localhost:5173/public/properties/AA13226');
    console.log('  2. 画像が表示されることを確認');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('完了\n');
}

// 実行
fixAA13226StorageLocation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
