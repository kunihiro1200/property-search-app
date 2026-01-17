import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA5128_2WorkTasks() {
  console.log('=== AA5128-2 業務リスト確認 ===\n');

  try {
    // 1. work_tasksテーブルを確認
    console.log('1. work_tasksテーブルでAA5128-2を検索中...');
    const { data: workTask, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('*')
      .eq('property_number', 'AA5128-2')
      .maybeSingle();

    if (workTaskError) {
      console.error('❌ work_tasks検索エラー:', workTaskError);
    } else if (!workTask) {
      console.log('❌ work_tasksテーブルにAA5128-2が見つかりません');
      console.log('');
      console.log('これが問題の原因です！');
      console.log('業務リスト（業務依頼）スプレッドシートにAA5128-2が存在しないか、');
      console.log('または同期されていない可能性があります。');
    } else {
      console.log('✅ work_tasksテーブルにAA5128-2が存在します:');
      console.log('  - ID:', workTask.id);
      console.log('  - 物件番号:', workTask.property_number);
      console.log('  - 格納先URL:', workTask.storage_url || '未設定');
      console.log('  - スプシURL:', workTask.spreadsheet_url || '未設定');
    }
    console.log('');

    // 2. property_listingsテーブルを確認
    console.log('2. property_listingsテーブルでAA5128-2を確認中...');
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location, atbb_status')
      .eq('property_number', 'AA5128-2')
      .single();

    if (propertyError) {
      console.error('❌ property_listings検索エラー:', propertyError);
    } else {
      console.log('✅ property_listingsテーブル:');
      console.log('  - ID:', property.id);
      console.log('  - 物件番号:', property.property_number);
      console.log('  - 格納先URL:', property.storage_location || '未設定');
      console.log('  - ATBB状態:', property.atbb_status);
    }
    console.log('');

    // 3. 結論
    console.log('=== 結論 ===');
    if (!workTask && !property.storage_location) {
      console.log('❌ 問題: 格納先URLがどこにも存在しません');
      console.log('');
      console.log('解決策:');
      console.log('  1. 業務リスト（業務依頼）スプレッドシートにAA5128-2を追加');
      console.log('  2. または、property_listingsテーブルのstorage_locationを直接設定');
      console.log('  3. または、Google Driveから自動取得（すでに実行済み）');
    } else if (workTask && workTask.storage_url) {
      console.log('✅ 業務リストに格納先URLが存在します');
      console.log('   システムは自動的にこのURLを使用するはずです');
    } else if (property.storage_location) {
      console.log('✅ property_listingsに格納先URLが存在します');
      console.log('   システムはこのURLを使用します');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkAA5128_2WorkTasks();
