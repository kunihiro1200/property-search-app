/**
 * AA13226 売主リスト確認
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13226Seller() {
  console.log('=== AA13226 売主リスト確認 ===\n');

  try {
    // sellersテーブルを確認
    console.log('📊 sellersテーブルを確認中...');
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('property_number, site, site_url')
      .eq('property_number', 'AA13226')
      .single();

    if (error) {
      console.log('❌ sellersテーブルにAA13226が見つかりません');
      console.log(`   エラー: ${error.message}`);
    } else if (seller) {
      console.log('✅ sellersテーブルにAA13226が見つかりました');
      console.log(`  property_number: ${seller.property_number}`);
      console.log(`  site: ${seller.site || '(未設定)'}`);
      console.log(`  site_url: ${seller.site_url || '(未設定)'}`);
      
      if (!seller.site && !seller.site_url) {
        console.log('\n❌ siteとsite_urlの両方が未設定です');
        console.log('\n💡 解決策:');
        console.log('  売主リストスプレッドシートのsiteまたはsite_urlカラムに格納先URLを設定');
      }
    }

    // work_tasksテーブルを確認
    console.log('\n📊 work_tasksテーブルを確認中...');
    const { data: workTask, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('property_number, storage_url')
      .eq('property_number', 'AA13226')
      .single();

    if (workTaskError) {
      console.log('❌ work_tasksテーブルにAA13226が見つかりません');
      console.log(`   エラー: ${workTaskError.message}`);
    } else if (workTask) {
      console.log('✅ work_tasksテーブルにAA13226が見つかりました');
      console.log(`  property_number: ${workTask.property_number}`);
      console.log(`  storage_url: ${workTask.storage_url || '(未設定)'}`);
      
      if (!workTask.storage_url) {
        console.log('\n❌ storage_urlが未設定です');
        console.log('\n💡 解決策:');
        console.log('  業務リストスプレッドシート（物件シート）の「格納先URL」列に値を設定');
      }
    }

    // サマリー
    console.log('\n📊 サマリー');
    console.log('─'.repeat(60));
    
    const hasSellerData = seller && (seller.site || seller.site_url);
    const hasWorkTaskData = workTask && workTask.storage_url;

    if (!hasSellerData && !hasWorkTaskData) {
      console.log('❌ どちらのテーブルにも格納先URLが設定されていません');
      console.log('\n推奨される解決策:');
      console.log('  1. 業務リストスプレッドシート（物件シート）の「格納先URL」列に値を設定');
      console.log('  2. WorkTaskSyncServiceを実行してwork_tasksテーブルに同期');
      console.log('  3. または、売主リストスプレッドシートのsiteカラムに値を設定');
    } else if (hasSellerData) {
      console.log('✅ sellersテーブルに格納先URLがあります');
      console.log('   PropertyListingSyncServiceを実行してproperty_listingsに同期してください');
    } else if (hasWorkTaskData) {
      console.log('✅ work_tasksテーブルに格納先URLがあります');
      console.log('   この値をproperty_listings.storage_locationにコピーする必要があります');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('確認完了\n');
}

// 実行
checkAA13226Seller()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
