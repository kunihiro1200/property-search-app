/**
 * 買主ID 6663, 6660, 6655 の同期状態を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function checkBuyersSync() {
  const targetBuyerIds = [6663, 6660, 6655];
  
  console.log('='.repeat(60));
  console.log('買主同期状態確認: ID 6663, 6660, 6655');
  console.log('='.repeat(60));
  
  // 1. データベースの状態を確認
  console.log('\n【1. データベースの状態】');
  
  for (const buyerId of targetBuyerIds) {
    const { data: buyer, error } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_id', buyerId)
      .single();
    
    if (error) {
      console.log(`\n買主ID ${buyerId}: データベースに存在しません`);
      console.log(`  エラー: ${error.message}`);
    } else if (buyer) {
      console.log(`\n買主ID ${buyerId}: データベースに存在`);
      console.log(`  名前: ${buyer.name || '(未設定)'}`);
      console.log(`  メール: ${buyer.email || '(未設定)'}`);
      console.log(`  電話: ${buyer.phone || '(未設定)'}`);
      console.log(`  物件番号: ${buyer.property_number || '(未設定)'}`);
      console.log(`  last_synced_at: ${buyer.last_synced_at || '(未設定)'}`);
      console.log(`  created_at: ${buyer.created_at}`);
      console.log(`  updated_at: ${buyer.updated_at}`);
    }
  }
  
  // 2. スプレッドシートの状態を確認
  console.log('\n' + '='.repeat(60));
  console.log('【2. スプレッドシートの状態】');
  
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
    
    // 買主シートのヘッダーを取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A1:BZ1',
    });
    const headers = headerResponse.data.values?.[0] || [];
    
    // 買主IDの列インデックスを特定
    const buyerIdColIndex = headers.findIndex((h: string) => 
      h === '買主ID' || h === '買主番号' || h === 'ID' || h === 'No' || h === 'No.'
    );
    
    console.log(`\nヘッダー列数: ${headers.length}`);
    console.log(`買主ID列インデックス: ${buyerIdColIndex} (列名: ${headers[buyerIdColIndex] || '不明'})`);
    
    // 全データを取得して対象の買主を探す
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A2:BZ10000',
    });
    const rows = dataResponse.data.values || [];
    
    console.log(`\nスプレッドシート総行数: ${rows.length}`);
    
    // 対象の買主IDを探す
    for (const targetId of targetBuyerIds) {
      let found = false;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowBuyerId = buyerIdColIndex >= 0 ? row[buyerIdColIndex] : row[0];
        
        if (String(rowBuyerId) === String(targetId)) {
          found = true;
          console.log(`\n買主ID ${targetId}: スプレッドシート行 ${i + 2} に存在`);
          
          // 主要なフィールドを表示
          const nameColIndex = headers.findIndex((h: string) => h === '氏名' || h === '名前');
          const emailColIndex = headers.findIndex((h: string) => h === 'メールアドレス' || h === 'メール');
          const phoneColIndex = headers.findIndex((h: string) => h === '電話番号' || h === '電話');
          const propertyColIndex = headers.findIndex((h: string) => h === '物件番号' || h === '案件番号');
          
          console.log(`  名前: ${nameColIndex >= 0 ? row[nameColIndex] || '(空)' : '(列不明)'}`);
          console.log(`  メール: ${emailColIndex >= 0 ? row[emailColIndex] || '(空)' : '(列不明)'}`);
          console.log(`  電話: ${phoneColIndex >= 0 ? row[phoneColIndex] || '(空)' : '(列不明)'}`);
          console.log(`  物件番号: ${propertyColIndex >= 0 ? row[propertyColIndex] || '(空)' : '(列不明)'}`);
          
          // 行の全データを表示（デバッグ用）
          console.log(`  行データ (最初の10列): ${row.slice(0, 10).join(' | ')}`);
          break;
        }
      }
      
      if (!found) {
        console.log(`\n買主ID ${targetId}: スプレッドシートに存在しません`);
      }
    }
    
  } catch (error) {
    console.error('スプレッドシート読み取りエラー:', error);
  }
  
  // 3. 最新の買主IDを確認
  console.log('\n' + '='.repeat(60));
  console.log('【3. データベースの最新買主ID】');
  
  const { data: latestBuyers } = await supabase
    .from('buyers')
    .select('buyer_id, name, created_at')
    .order('buyer_id', { ascending: false })
    .limit(10);
  
  if (latestBuyers) {
    console.log('\n最新10件の買主:');
    for (const b of latestBuyers) {
      console.log(`  ID: ${b.buyer_id}, 名前: ${b.name || '(未設定)'}, 作成日: ${b.created_at}`);
    }
  }
  
  // 4. 買主総数の比較
  console.log('\n' + '='.repeat(60));
  console.log('【4. 買主総数の比較】');
  
  const { count: dbCount } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`データベースの買主数: ${dbCount}`);
}

checkBuyersSync().catch(console.error);
