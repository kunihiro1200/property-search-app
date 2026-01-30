/**
 * AA13489を強制同期するスクリプト
 * スプレッドシートからデータを取得してDBに同期
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getGoogleSheetsClient() {
  const keyPath = path.join(__dirname, 'google-service-account.json');
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

async function forceSyncAA13489() {
  console.log('🔄 AA13489を強制同期します...\n');

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // スプレッドシートからAA13489のデータを取得
  console.log('📊 スプレッドシートからデータを取得中...');
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:BZ', // B列から広範囲を取得
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  
  // AA13489の行を検索
  let aa13489Row: string[] | null = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'AA13489') { // B列が売主番号
      aa13489Row = rows[i];
      break;
    }
  }
  
  if (!aa13489Row) {
    console.log('❌ AA13489がスプレッドシートに見つかりません');
    return;
  }
  
  // ヘッダーとデータをマッピング
  const rowData: Record<string, string> = {};
  headers.forEach((header: string, index: number) => {
    if (aa13489Row![index]) {
      rowData[header] = aa13489Row![index];
    }
  });
  
  console.log('\n📋 スプレッドシートのAA13489データ:');
  console.log('-------------------');
  console.log(`売主番号: ${rowData['売主番号'] || '(空)'}`);
  console.log(`査定方法: ${rowData['査定方法'] || '(空)'}`);
  console.log(`連絡方法: ${rowData['連絡方法'] || '(空)'}`);
  console.log(`連絡取りやすい日、時間帯: ${rowData['連絡取りやすい日、時間帯'] || '(空)'}`);
  console.log(`電話担当（任意）: ${rowData['電話担当（任意）'] || '(空)'}`);
  console.log(`次電日: ${rowData['次電日'] || '(空)'}`);
  console.log(`状況（当社）: ${rowData['状況（当社）'] || '(空)'}`);
  console.log(`Pinrich: ${rowData['Pinrich'] || '(空)'}`);
  
  // DBを更新
  console.log('\n🔄 データベースを更新中...');
  
  const updateData: Record<string, any> = {};
  
  // 査定方法
  if (rowData['査定方法']) {
    updateData.valuation_method = rowData['査定方法'];
  }
  
  // 連絡方法
  if (rowData['連絡方法']) {
    updateData.contact_method = rowData['連絡方法'];
  }
  
  // 連絡取りやすい日、時間帯
  if (rowData['連絡取りやすい日、時間帯']) {
    updateData.preferred_contact_time = rowData['連絡取りやすい日、時間帯'];
  }
  
  // 電話担当（任意）
  if (rowData['電話担当（任意）']) {
    updateData.phone_contact_person = rowData['電話担当（任意）'];
  }
  
  // Pinrich
  if (rowData['Pinrich']) {
    updateData.pinrich_status = rowData['Pinrich'];
  }
  
  console.log('\n📝 更新データ:', updateData);
  
  if (Object.keys(updateData).length === 0) {
    console.log('⚠️ 更新するデータがありません');
    return;
  }
  
  const { error } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('seller_number', 'AA13489');
  
  if (error) {
    console.error('❌ 更新エラー:', error.message);
    return;
  }
  
  console.log('✅ AA13489を更新しました');
  
  // 更新後のデータを確認
  console.log('\n📋 更新後のデータベースの状態:');
  const { data: updatedSeller } = await supabase
    .from('sellers')
    .select('seller_number, valuation_method, contact_method, preferred_contact_time, phone_contact_person, pinrich_status, status, next_call_date')
    .eq('seller_number', 'AA13489')
    .single();
  
  if (updatedSeller) {
    console.log('-------------------');
    console.log(`売主番号: ${updatedSeller.seller_number}`);
    console.log(`査定方法: ${updatedSeller.valuation_method || '(空)'}`);
    console.log(`連絡方法: ${updatedSeller.contact_method || '(空)'}`);
    console.log(`連絡取りやすい日、時間帯: ${updatedSeller.preferred_contact_time || '(空)'}`);
    console.log(`電話担当（任意）: ${updatedSeller.phone_contact_person || '(空)'}`);
    console.log(`次電日: ${updatedSeller.next_call_date || '(空)'}`);
    console.log(`状況（当社）: ${updatedSeller.status || '(空)'}`);
    console.log(`Pinrich: ${updatedSeller.pinrich_status || '(空)'}`);
    
    // ステータス判定
    console.log('\n🎯 予想されるステータス:');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isFollowingUp = updatedSeller.status && updatedSeller.status.includes('追客中');
    if (!isFollowingUp) {
      console.log('  (ステータスなし - 追客中ではないため)');
      return;
    }
    
    let isNextCallDateToday = false;
    if (updatedSeller.next_call_date) {
      const nextCallDate = new Date(updatedSeller.next_call_date);
      nextCallDate.setHours(0, 0, 0, 0);
      isNextCallDateToday = nextCallDate <= today;
    }
    
    if (updatedSeller.contact_method && updatedSeller.contact_method.trim() !== '' && isNextCallDateToday) {
      console.log(`  → 当日TEL(${updatedSeller.contact_method})`);
    } else if (updatedSeller.preferred_contact_time && updatedSeller.preferred_contact_time.trim() !== '' && isNextCallDateToday) {
      console.log(`  → 当日TEL(${updatedSeller.preferred_contact_time})`);
    } else {
      console.log('  → その他のステータス');
    }
  }
}

forceSyncAA13489().catch(console.error);
