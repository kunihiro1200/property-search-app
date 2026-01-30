/**
 * AA13407の「こちらの物件について」を同期するスクリプト
 * 
 * 取得元: 物件リストスプレッドシートのBQ列（●内覧前伝達事項）
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getGoogleSheetsClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function syncAA13407PropertyAbout() {
  console.log('=== AA13407 「こちらの物件について」同期 ===\n');
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID;
  
  // 物件リストスプレッドシートからデータを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '物件!A:CZ',
  });
  
  const rows = dataResponse.data.values || [];
  const headers = rows[0] || [];
  
  // BQ列のインデックス（68）
  const bqIndex = 68;
  
  // AA13407の行を探す
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const propertyNumber = row[1]; // B列 = インデックス1
    
    if (propertyNumber === 'AA13407') {
      const propertyAbout = row[bqIndex] || '';
      
      console.log(`📊 AA13407のデータ（行${i + 1}）:`);
      console.log(`  BQ列（●内覧前伝達事項）: ${propertyAbout ? '✅ あり' : '❌ なし'}`);
      if (propertyAbout) {
        console.log(`  内容: ${propertyAbout.substring(0, 100)}...`);
      }
      
      if (!propertyAbout) {
        console.log('\n⚠️ BQ列にデータがありません');
        return;
      }
      
      // property_listingsテーブルを更新
      console.log('\n📋 property_listingsテーブルを更新中...');
      const { error: listingsError } = await supabase
        .from('property_listings')
        .update({ property_about: propertyAbout })
        .eq('property_number', 'AA13407');
      
      if (listingsError) {
        console.error(`❌ property_listings更新エラー: ${listingsError.message}`);
      } else {
        console.log('✅ property_listings更新完了');
      }
      
      // property_detailsテーブルも更新
      console.log('\n📋 property_detailsテーブルを更新中...');
      const { error: detailsError } = await supabase
        .from('property_details')
        .update({ property_about: propertyAbout })
        .eq('property_number', 'AA13407');
      
      if (detailsError) {
        console.error(`❌ property_details更新エラー: ${detailsError.message}`);
      } else {
        console.log('✅ property_details更新完了');
      }
      
      // 更新後のデータを確認
      console.log('\n📋 更新後のデータを確認中...');
      const { data: updatedListings } = await supabase
        .from('property_listings')
        .select('property_number, property_about')
        .eq('property_number', 'AA13407')
        .single();
      
      const { data: updatedDetails } = await supabase
        .from('property_details')
        .select('property_number, property_about')
        .eq('property_number', 'AA13407')
        .single();
      
      console.log('\n📊 更新後のデータ:');
      console.log(`  property_listings.property_about: ${updatedListings?.property_about ? '✅ あり' : '❌ なし'}`);
      console.log(`  property_details.property_about: ${updatedDetails?.property_about ? '✅ あり' : '❌ なし'}`);
      
      break;
    }
  }
}

syncAA13407PropertyAbout().catch(console.error);
