/**
 * テスト物件のスプレッドシートURL取得確認スクリプト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTestPropertiesUrls(): Promise<void> {
  try {
    const testPropertyIds = [
      '0f1595e6-b891-443f-b7c1-735b532cb4bb', // 土地
      'fb02f851-73de-4c9f-a309-d723fbdc2ea8'  // マンション
    ];
    
    console.log('テスト物件のスプレッドシートURL取得確認\n');
    console.log('='.repeat(80));
    
    for (const propertyId of testPropertyIds) {
      console.log(`\n物件ID: ${propertyId}`);
      console.log('-'.repeat(80));
      
      // property_listingsから物件情報を取得
      const { data: property, error: propertyError } = await supabase
        .from('property_listings')
        .select('property_number, property_type, storage_location')
        .eq('id', propertyId)
        .single();
      
      if (propertyError || !property) {
        console.log('❌ 物件が見つかりません');
        continue;
      }
      
      console.log(`物件番号: ${property.property_number}`);
      console.log(`物件タイプ: ${property.property_type}`);
      console.log(`storage_location: ${property.storage_location || 'なし'}`);
      
      // storage_locationがスプレッドシートURLか確認
      const hasSpreadsheetInStorage = property.storage_location && 
        property.storage_location.includes('/spreadsheets/d/');
      
      console.log(`storage_locationにスプレッドシートURL: ${hasSpreadsheetInStorage ? '✅ あり' : '❌ なし'}`);
      
      // work_tasksからspreadsheet_urlを取得
      const { data: workTask, error: workTaskError } = await supabase
        .from('work_tasks')
        .select('spreadsheet_url')
        .eq('property_number', property.property_number)
        .single();
      
      if (workTaskError || !workTask) {
        console.log('work_tasks: ❌ レコードが見つかりません');
      } else {
        console.log(`work_tasks.spreadsheet_url: ${workTask.spreadsheet_url ? '✅ あり' : '❌ なし'}`);
        if (workTask.spreadsheet_url) {
          console.log(`URL: ${workTask.spreadsheet_url.substring(0, 70)}...`);
        }
      }
      
      // 最終的に使用されるURL
      const finalUrl = hasSpreadsheetInStorage 
        ? property.storage_location 
        : workTask?.spreadsheet_url;
      
      console.log(`\n最終的に使用されるURL: ${finalUrl ? '✅ あり' : '❌ なし'}`);
      
      if (finalUrl) {
        // スプレッドシートIDを抽出
        const match = finalUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          console.log(`スプレッドシートID: ${match[1]}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

checkTestPropertiesUrls();
