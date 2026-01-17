/**
 * 買主番号 6663, 6660, 6655 のスプレッドシートとDBのデータを比較
 */
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function compareBuyerData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
  
  // ヘッダーを取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!1:1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // 列インデックスを特定
  const buyerNumberColIndex = headers.findIndex((h: string) => h === '買主番号');
  const nameColIndex = headers.findIndex((h: string) => h === '●氏名・会社名');
  const phoneColIndex = headers.findIndex((h: string) => h === '●電話番号\n（ハイフン不要）');
  const emailColIndex = headers.findIndex((h: string) => h === '●メアド');
  const propertyNumberColIndex = headers.findIndex((h: string) => h === '物件番号');
  const latestStatusColIndex = headers.findIndex((h: string) => h === '★最新状況\n');
  const desiredAreaColIndex = headers.findIndex((h: string) => h === '★エリア');
  const distributionTypeColIndex = headers.findIndex((h: string) => h === '配信種別');
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '買主リスト!A2:GZ',
  });
  const rows = dataResponse.data.values || [];
  
  const targetNumbers = ['6663', '6660', '6655'];
  
  console.log('='.repeat(80));
  console.log('買主データ比較: スプレッドシート vs データベース');
  console.log('='.repeat(80));
  
  for (const targetNum of targetNumbers) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`買主番号: ${targetNum}`);
    console.log('='.repeat(40));
    
    // スプレッドシートからデータを取得
    let sheetData: any = null;
    for (const row of rows) {
      const buyerNumber = String(row[buyerNumberColIndex] || '').trim();
      if (buyerNumber === targetNum) {
        sheetData = {
          name: row[nameColIndex] || '',
          phone: row[phoneColIndex] || '',
          email: row[emailColIndex] || '',
          propertyNumber: row[propertyNumberColIndex] || '',
          latestStatus: row[latestStatusColIndex] || '',
          desiredArea: row[desiredAreaColIndex] || '',
          distributionType: row[distributionTypeColIndex] || '',
        };
        break;
      }
    }
    
    // データベースからデータを取得
    const { data: dbData } = await supabase
      .from('buyers')
      .select('name, phone_number, email, property_number, latest_status, desired_area, distribution_type')
      .eq('buyer_number', targetNum)
      .single();
    
    console.log('\n【スプレッドシート】');
    if (sheetData) {
      console.log(`  氏名: ${sheetData.name}`);
      console.log(`  電話番号: ${sheetData.phone}`);
      console.log(`  メアド: ${sheetData.email}`);
      console.log(`  物件番号: ${sheetData.propertyNumber}`);
      console.log(`  最新状況: ${sheetData.latestStatus}`);
      console.log(`  エリア: ${sheetData.desiredArea}`);
      console.log(`  配信種別: ${sheetData.distributionType}`);
    } else {
      console.log('  データなし');
    }
    
    console.log('\n【データベース】');
    if (dbData) {
      console.log(`  氏名: ${dbData.name || '(空)'}`);
      console.log(`  電話番号: ${dbData.phone_number || '(空)'}`);
      console.log(`  メアド: ${dbData.email || '(空)'}`);
      console.log(`  物件番号: ${dbData.property_number || '(空)'}`);
      console.log(`  最新状況: ${dbData.latest_status || '(空)'}`);
      console.log(`  エリア: ${dbData.desired_area || '(空)'}`);
      console.log(`  配信種別: ${dbData.distribution_type || '(空)'}`);
    } else {
      console.log('  データなし');
    }
    
    // 差分を確認
    console.log('\n【差分】');
    if (sheetData && dbData) {
      const diffs: string[] = [];
      if (sheetData.name !== (dbData.name || '')) diffs.push(`氏名: "${sheetData.name}" vs "${dbData.name || ''}"`);
      if (sheetData.phone !== (dbData.phone_number || '')) diffs.push(`電話番号: "${sheetData.phone}" vs "${dbData.phone_number || ''}"`);
      if (sheetData.email !== (dbData.email || '')) diffs.push(`メアド: "${sheetData.email}" vs "${dbData.email || ''}"`);
      if (sheetData.propertyNumber !== (dbData.property_number || '')) diffs.push(`物件番号: "${sheetData.propertyNumber}" vs "${dbData.property_number || ''}"`);
      if (sheetData.latestStatus !== (dbData.latest_status || '')) diffs.push(`最新状況: "${sheetData.latestStatus}" vs "${dbData.latest_status || ''}"`);
      if (sheetData.desiredArea !== (dbData.desired_area || '')) diffs.push(`エリア: "${sheetData.desiredArea}" vs "${dbData.desired_area || ''}"`);
      if (sheetData.distributionType !== (dbData.distribution_type || '')) diffs.push(`配信種別: "${sheetData.distributionType}" vs "${dbData.distribution_type || ''}"`);
      
      if (diffs.length > 0) {
        diffs.forEach(d => console.log(`  ⚠️ ${d}`));
      } else {
        console.log('  ✅ 差分なし');
      }
    }
  }
}

compareBuyerData().catch(console.error);
