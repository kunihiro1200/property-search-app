/**
 * AA10606 格納先URL問題の診断
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA10606() {
  console.log('=== AA10606 格納先URL問題の診断 ===\n');

  try {
    // property_listingsテーブルを確認
    console.log('📊 Step 1: property_listingsテーブルを確認');
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA10606')
      .single();

    if (propertyError) {
      console.log('❌ エラー:', propertyError.message);
      return;
    }

    if (!property) {
      console.log('❌ AA10606が見つかりません');
      return;
    }

    console.log('✅ AA10606が見つかりました');
    console.log(`  property_number: ${property.property_number}`);
    console.log(`  storage_location: ${property.storage_location || '(空)'}`);
    console.log('');

    // work_tasksテーブルを確認
    console.log('📊 Step 2: work_tasksテーブルを確認');
    const { data: workTask, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('*')
      .eq('property_number', 'AA10606')
      .single();

    if (workTaskError) {
      console.log('⚠️  work_tasksにデータがありません:', workTaskError.message);
      console.log('');
      console.log('💡 原因:');
      console.log('  work_tasksテーブルにAA10606のデータが存在しない');
      console.log('');
      console.log('💡 解決策:');
      console.log('  1. 業務リストスプレッドシートにAA10606が存在するか確認');
      console.log('  2. 業務リスト同期を実行');
      console.log('  3. または、property_listings.storage_locationを直接設定');
      return;
    }

    console.log('✅ work_tasksにデータがあります');
    console.log(`  property_number: ${workTask.property_number}`);
    console.log(`  storage_url: ${workTask.storage_url || '(空)'}`);
    console.log('');

    // 診断結果
    console.log('📊 診断結果サマリー');
    console.log('─'.repeat(60));
    
    if (!workTask.storage_url) {
      console.log('❌ work_tasks.storage_urlが空です');
      console.log('');
      console.log('💡 原因:');
      console.log('  業務リストスプレッドシートに格納先URLが入力されていない');
      console.log('');
      console.log('💡 解決策:');
      console.log('  1. 業務リストスプレッドシートに格納先URLを入力');
      console.log('  2. 業務リスト同期を実行');
      console.log('  3. または、property_listings.storage_locationを直接設定');
    } else if (!property.storage_location) {
      console.log('⚠️  動的フォールバックが動作していません');
      console.log('');
      console.log('💡 原因:');
      console.log('  バックエンドAPIの動的フォールバック機能が正しく動作していない');
      console.log('');
      console.log('💡 解決策:');
      console.log('  1. バックエンドサーバーを再起動');
      console.log('  2. バックエンドログを確認');
      console.log('  3. getByPropertyNumberメソッドを確認');
    } else {
      console.log('✅ 問題は見つかりませんでした');
    }

  } catch (error: any) {
    console.error('❌ 診断中にエラーが発生しました:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('診断完了\n');
}

// 実行
checkAA10606()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
