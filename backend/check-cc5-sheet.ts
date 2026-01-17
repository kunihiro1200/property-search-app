/**
 * CC5物件のスプレッドシートを確認
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCC5Sheet(): Promise<void> {
  try {
    console.log('CC5物件のスプレッドシートを確認中...\n');
    
    // work_tasksからspreadsheet_urlを取得
    const { data: workTask, error } = await supabase
      .from('work_tasks')
      .select('spreadsheet_url, storage_url')
      .eq('property_number', 'CC5')
      .single();
    
    if (error || !workTask) {
      console.log('❌ work_tasksにCC5が見つかりません');
      return;
    }
    
    console.log('work_tasks情報:');
    console.log(`  spreadsheet_url: ${workTask.spreadsheet_url || 'なし'}`);
    console.log(`  storage_url: ${workTask.storage_url || 'なし'}`);
    console.log('');
    
    if (!workTask.spreadsheet_url) {
      console.log('❌ spreadsheet_urlが設定されていません');
      return;
    }
    
    const spreadsheetUrl = workTask.spreadsheet_url;
    
    // スプレッドシートIDを抽出
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      console.log('❌ スプレッドシートIDを抽出できません');
      console.log(`URL: ${spreadsheetUrl}`);
      return;
    }
    
    const spreadsheetId = match[1];
    console.log(`スプレッドシートID: ${spreadsheetId}`);
    
    // シート名を確認
    const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    const client = new GoogleSheetsClient({
      spreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath,
    });
    
    await client.authenticate();
    const sheets = (client as any).sheets;
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('\n利用可能なシート:');
    for (const sheet of response.data.sheets) {
      const title = sheet.properties.title;
      console.log(`  - "${title}" (長さ: ${title.length}文字)`);
      
      if (title.toLowerCase().includes('athome')) {
        console.log(`    ⭐ athome関連シート`);
        console.log(`    文字コード: ${Array.from(title).map(c => c.charCodeAt(0)).join(', ')}`);
      }
    }
    
    // B142セルの値を取得してみる
    console.log('\n='.repeat(80));
    console.log('B142セル（戸建てのお気に入り文言）の値を取得:');
    console.log('='.repeat(80));
    
    const rangeFormats = [
      "'athome '!B142",
      "athome!B142",
    ];
    
    for (const range of rangeFormats) {
      console.log(`\nテスト中: ${range}`);
      
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });
        
        const values = response.data.values;
        console.log(`  ✅ 成功`);
        console.log(`  値: ${values && values[0] ? values[0][0] : 'なし'}`);
      } catch (error: any) {
        console.log(`  ❌ 失敗: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

checkCC5Sheet();
