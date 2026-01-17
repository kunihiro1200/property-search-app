/**
 * work_tasksテーブルでAA10606を検索
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function searchWorkTasks() {
  console.log('=== work_tasksテーブルでAA10606を検索 ===\n');

  try {
    // 完全一致検索
    console.log('📊 完全一致検索: property_number = "AA10606"');
    const { data: exact, error: exactError } = await supabase
      .from('work_tasks')
      .select('property_number, storage_url')
      .eq('property_number', 'AA10606');

    if (exactError) {
      console.log('❌ エラー:', exactError.message);
    } else {
      console.log(`✅ ${exact?.length || 0}件見つかりました`);
      if (exact && exact.length > 0) {
        exact.forEach(item => {
          console.log(`  - ${item.property_number}: ${item.storage_url || '(空)'}`);
        });
      }
    }
    console.log('');

    // 部分一致検索
    console.log('📊 部分一致検索: property_number LIKE "%10606%"');
    const { data: partial, error: partialError } = await supabase
      .from('work_tasks')
      .select('property_number, storage_url')
      .ilike('property_number', '%10606%');

    if (partialError) {
      console.log('❌ エラー:', partialError.message);
    } else {
      console.log(`✅ ${partial?.length || 0}件見つかりました`);
      if (partial && partial.length > 0) {
        partial.forEach(item => {
          console.log(`  - ${item.property_number}: ${item.storage_url || '(空)'}`);
        });
      }
    }
    console.log('');

    // 結論
    console.log('📊 結論');
    console.log('─'.repeat(60));
    if (!exact || exact.length === 0) {
      console.log('❌ work_tasksテーブルにAA10606が存在しません');
      console.log('');
      console.log('💡 原因:');
      console.log('  1. 業務リストスプレッドシートにAA10606が存在しない');
      console.log('  2. または、業務リスト同期がまだ実行されていない');
      console.log('');
      console.log('💡 解決策:');
      console.log('  1. 業務リストスプレッドシートを確認');
      console.log('  2. 業務リスト同期を実行');
      console.log('  3. または、property_listings.storage_locationを直接設定');
    } else {
      console.log('✅ work_tasksテーブルにAA10606が存在します');
    }

  } catch (error: any) {
    console.error('❌ 検索中にエラーが発生しました:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('検索完了\n');
}

// 実行
searchWorkTasks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
