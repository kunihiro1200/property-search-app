import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resyncBuyer6666() {
  console.log('=== 買主番号6666の再同期 ===\n');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 買主番号の列インデックスを探す
  const buyerNumberIndex = headers.indexOf('買主番号');
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  
  // 買主番号6666を探す
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (String(buyerNumber).trim() === '6666') {
      console.log('買主番号6666が見つかりました\n');
      
      // カラムマッパーを使用してデータを変換
      const columnMapper = new BuyerColumnMapper();
      const data = columnMapper.mapSpreadsheetToDatabase(headers, row);
      
      console.log('=== マッピング後のデータ ===');
      console.log('buyer_number:', data.buyer_number);
      console.log('name:', data.name);
      console.log('viewing_result_follow_up:', data.viewing_result_follow_up ? `"${String(data.viewing_result_follow_up).substring(0, 100)}..."` : 'null');
      console.log('viewing_result_follow_up (長さ):', data.viewing_result_follow_up ? String(data.viewing_result_follow_up).length : 0);
      console.log('follow_up_assignee:', data.follow_up_assignee);
      
      // データベースに更新
      console.log('\n=== データベースに更新中 ===');
      const { error } = await supabase
        .from('buyers')
        .upsert(
          { 
            ...data, 
            synced_at: new Date().toISOString(),
            db_updated_at: new Date().toISOString()
          },
          { onConflict: 'buyer_number' }
        )
        .select();

      if (error) {
        console.error('更新エラー:', error);
      } else {
        console.log('更新成功！');
        
        // 更新後のデータを確認
        const { data: buyer, error: fetchError } = await supabase
          .from('buyers')
          .select('buyer_number, name, viewing_result_follow_up, follow_up_assignee, synced_at')
          .eq('buyer_number', '6666')
          .single();
          
        if (fetchError) {
          console.error('確認エラー:', fetchError);
        } else {
          console.log('\n=== 更新後のデータベース値 ===');
          console.log('buyer_number:', buyer.buyer_number);
          console.log('name:', buyer.name);
          console.log('viewing_result_follow_up:', buyer.viewing_result_follow_up ? `"${String(buyer.viewing_result_follow_up).substring(0, 100)}..."` : 'null');
          console.log('viewing_result_follow_up (長さ):', buyer.viewing_result_follow_up ? String(buyer.viewing_result_follow_up).length : 0);
          console.log('follow_up_assignee:', buyer.follow_up_assignee);
          console.log('synced_at:', buyer.synced_at);
        }
      }
      
      break;
    }
  }
}

resyncBuyer6666().catch(console.error);
