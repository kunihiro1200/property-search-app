/**
 * 特定のスプレッドシートのシート名を確認
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSpecificSheets(): Promise<void> {
  try {
    const propertyNumbers = ['AA10018', 'AA10106'];
    
    console.log('特定物件のスプレッドシートを確認中...\n');
    
    for (const propertyNumber of propertyNumbers) {
      console.log('='.repeat(80));
      console.log(`物件番号: ${propertyNumber}`);
      console.log('='.repeat(80));
      
      // work_tasksからspreadsheet_urlを取得
      const { data: workTask, error } = await supabase
        .from('work_tasks')
        .select('spreadsheet_url')
        .eq('property_number', propertyNumber)
        .single();
      
      if (error || !workTask || !workTask.spreadsheet_url) {
        console.log('❌ スプレッドシートURLが見つかりません\n');
        continue;
      }
      
      const spreadsheetUrl = workTask.spreadsheet_url;
      console.log(`スプレッドシートURL: ${spreadsheetUrl.substring(0, 60)}...`);
      
      // スプレッドシートIDを抽出
      const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        console.log('❌ スプレッドシートIDを抽出できません\n');
        continue;
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
      
      console.log('');
    }
    
  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

checkSpecificSheets();
