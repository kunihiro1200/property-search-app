import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA13129CurrentState() {
  console.log('=== AA13129の現在の状態を確認 ===\n');

  try {
    // 1. property_listingsテーブルから確認
    const { data: propertyListing, error: plError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA13129')
      .single();

    if (plError) {
      console.error('❌ property_listingsテーブルのエラー:', plError.message);
    } else if (propertyListing) {
      console.log('✅ property_listingsテーブル:');
      console.log('  - ID:', propertyListing.id);
      console.log('  - 物件番号:', propertyListing.property_number);
      console.log('  - storage_location:', propertyListing.storage_location || 'NULL');
      console.log('  - site_display:', propertyListing.site_display);
      console.log('  - hidden_images:', propertyListing.hidden_images);
      console.log('');
    }

    // 2. work_tasksテーブルから確認
    const { data: workTask, error: wtError } = await supabase
      .from('work_tasks')
      .select('*')
      .eq('property_number', 'AA13129')
      .single();

    if (wtError) {
      console.error('❌ work_tasksテーブルのエラー:', wtError.message);
    } else if (workTask) {
      console.log('✅ work_tasksテーブル:');
      console.log('  - ID:', workTask.id);
      console.log('  - 物件番号:', workTask.property_number);
      console.log('  - storage_url:', workTask.storage_url || 'NULL');
      console.log('');
    }

    // 3. 画像取得テスト
    if (propertyListing?.storage_location) {
      console.log('📸 storage_locationから画像取得をテスト:');
      console.log('  URL:', propertyListing.storage_location);
      
      // URLからフォルダIDを抽出
      const match = propertyListing.storage_location.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        console.log('  フォルダID:', match[1]);
      } else {
        console.log('  ⚠️ フォルダIDを抽出できませんでした');
      }
    } else if (workTask?.storage_url) {
      console.log('📸 storage_urlから画像取得をテスト:');
      console.log('  URL:', workTask.storage_url);
      
      // URLからフォルダIDを抽出
      const match = workTask.storage_url.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match) {
        console.log('  フォルダID:', match[1]);
      } else {
        console.log('  ⚠️ フォルダIDを抽出できませんでした');
      }
    } else {
      console.log('❌ storage_locationもstorage_urlも設定されていません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n=== 確認完了 ===');
}

checkAA13129CurrentState();
