import dotenv from 'dotenv';
import { GyomuListService } from './src/services/GyomuListService';
import { google } from 'googleapis';

dotenv.config();

/**
 * AA9743の業務リストとスプレッドシートを確認
 */

async function checkGyomuAndSpreadsheet() {
  console.log('🔍 AA9743の業務リストとスプレッドシートを確認中...\n');

  try {
    // 1. 業務リストからスプシURLを取得
    console.log('📊 Step 1: 業務リストからスプシURLを取得');
    const gyomuListService = new GyomuListService();
    const gyomuData = await gyomuListService.getByPropertyNumber('AA9743');
    
    if (!gyomuData) {
      console.log('❌ 業務リストにAA9743が見つかりません');
      return;
    }
    
    console.log('✅ 業務リストデータ:');
    console.log('- Property Number:', gyomuData.propertyNumber);
    console.log('- Spreadsheet URL:', gyomuData.spreadsheetUrl || '❌ NULL');
    console.log('- Storage URL:', gyomuData.storageUrl || '❌ NULL');
    console.log('');
    
    if (!gyomuData.spreadsheetUrl) {
      console.log('❌ スプシURLが登録されていません');
      console.log('解決策: 業務リストの「スプシURL」列にスプレッドシートのURLを登録してください');
      return;
    }
    
    // 2. スプレッドシートIDを抽出
    console.log('📊 Step 2: スプレッドシートIDを抽出');
    const spreadsheetUrl = gyomuData.spreadsheetUrl;
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    
    if (!match) {
      console.log('❌ スプレッドシートIDを抽出できません');
      console.log('URL:', spreadsheetUrl);
      return;
    }
    
    const spreadsheetId = match[1];
    console.log('✅ Spreadsheet ID:', spreadsheetId);
    console.log('');
    
    // 3. スプレッドシートのシート一覧を取得
    console.log('📊 Step 3: スプレッドシートのシート一覧を取得');
    
    // サービスアカウント認証
    let keyFile: any;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      keyFile = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (keyFile.private_key) {
        keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
      }
    } else {
      const fs = await import('fs');
      const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
      keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // シート一覧を取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    console.log('✅ シート一覧:');
    spreadsheet.data.sheets?.forEach((sheet, index) => {
      const title = sheet.properties?.title || '';
      console.log(`${index + 1}. "${title}" (末尾空白: ${title !== title.trim() ? '⚠️ あり' : 'なし'})`);
    });
    console.log('');
    
    // 4. athomeシートのN1セルを確認（複数パターン）
    console.log('📊 Step 4: athomeシートのN1セルを確認');
    
    const sheetNamePatterns = [
      'athome ',    // 末尾スペース1つ
      'athome  ',   // 末尾スペース2つ
      'athome',     // スペースなし
      'Athome ',
      'Athome  ',
      'Athome',
      'ATHOME ',
      'ATHOME  ',
      'ATHOME',
      'at home ',
      'At Home ',
    ];
    
    let foundPanoramaUrl = false;
    
    for (const sheetName of sheetNamePatterns) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!N1`,
        });
        
        const value = response.data.values?.[0]?.[0];
        
        if (value && typeof value === 'string' && value.trim()) {
          console.log(`✅ シート名 "${sheetName}" でパノラマURLを発見:`);
          console.log('   URL:', value.trim());
          foundPanoramaUrl = true;
          break;
        } else if (response.data.values) {
          console.log(`⚠️ シート名 "${sheetName}" のN1セルは空です`);
        }
      } catch (error: any) {
        // このシート名では見つからなかった
        continue;
      }
    }
    
    if (!foundPanoramaUrl) {
      console.log('\n❌ どのシート名パターンでもパノラマURLが見つかりませんでした');
      console.log('\n考えられる原因:');
      console.log('1. athomeシートのN1セルが空');
      console.log('2. シート名が想定外のパターン（上記のシート一覧を確認）');
      console.log('3. スプレッドシートへのアクセス権限がない');
      console.log('\n解決策:');
      console.log('- スプレッドシートを開いてathomeシートのN1セルにパノラマURLを入力');
      console.log('- サービスアカウントにスプレッドシートの閲覧権限を付与');
    }
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkGyomuAndSpreadsheet();
