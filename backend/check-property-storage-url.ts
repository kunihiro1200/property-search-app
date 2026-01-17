/**
 * 物件の格納先URLを確認するスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertyStorageUrl() {
  console.log('=== 物件の格納先URL確認 ===\n');

  // スクリーンショットのURL: localhost:5173/public/properties/593c43f9-8e10-4eea-8209-6484911f3364
  const propertyId = '593c43f9-8e10-4eea-8209-6484911f3364';

  try {
    // property_listingsから物件情報を取得
    const { data: property, error: propError } = await supabase
      .from('property_listings')
      .select('id, property_number')
      .eq('id', propertyId)
      .single();

    if (propError) {
      console.error('物件取得エラー:', propError);
      return;
    }

    console.log('物件情報:', property);

    // work_tasksからstorage_urlを取得
    const { data: workTask, error: workError } = await supabase
      .from('work_tasks')
      .select('id, property_number, storage_url')
      .eq('property_number', property.property_number)
      .single();

    if (workError) {
      console.error('work_tasks取得エラー:', workError);
      return;
    }

    console.log('\nwork_tasks情報:', workTask);
    console.log('\n格納先URL:', workTask?.storage_url);

    // フォルダIDを抽出
    if (workTask?.storage_url) {
      const folderIdRegex = /\/folders\/([a-zA-Z0-9_-]+)/;
      const match = workTask.storage_url.match(folderIdRegex);
      if (match && match[1]) {
        console.log('抽出されたフォルダID:', match[1]);
      }
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkPropertyStorageUrl();
