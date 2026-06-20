// CC5のathome_dataを個別物件スプレッドシートのathomeシートN1セルから同期
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GyomuListService } from './src/services/GyomuListService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { google } from 'googleapis';

// .envファイルを読み込む
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAthomeDataFromIndividualSheet(propertyNumber: string) {
  try {
    console.log(`\n========================================`);
    console.log(`${propertyNumber}のathome_dataを個別物件スプレッドシートから同期`);
    console.log(`========================================\n`);
    
    console.log(`[Step 1] 業務リストからスプシURLを取得...`);
    
    // 業務リストからスプシURLを取得
    const gyomuListService = new GyomuListService();
    const gyomuData = await gyomuListService.getByPropertyNumber(propertyNumber);
    
    if (!gyomuData || !gyomuData.spreadsheetUrl) {
      console.error(`❌ 業務リストにスプシURLが見つかりません: ${propertyNumber}`);
      return;
    }
    
    console.log(`✅ スプシURLを取得しました: ${gyomuData.spreadsheetUrl}`);
    
    // スプレッドシートIDを抽出
    const spreadsheetIdMatch = gyomuData.spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      console.error(`❌ スプレッドシートIDを抽出できません: ${gyomuData.spreadsheetUrl}`);
      return;
    }
    
    const spreadsheetId = spreadsheetIdMatch[1];
    console.log(`✅ スプレッドシートID: ${spreadsheetId}`);
    
    console.log(`\n[Step 2] athomeシートのN1セルを読み取り...`);
    
    // Google Sheets APIで認証
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // athomeシートのN1セルを読み取り（複数のシート名パターンを試す）
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
    
    let athomeDataValue: any = null;
    let foundSheetName: string | null = null;
    
    for (const sheetName of sheetNamePatterns) {
      try {
        console.log(`  試行中: "${sheetName}!N1"`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!N1`,
        });
        
        const value = response.data.values?.[0]?.[0];
        
        if (value) {
          athomeDataValue = value;
          foundSheetName = sheetName;
          console.log(`✅ シート "${sheetName}" のN1セルにデータが見つかりました`);
          break;
        }
      } catch (error: any) {
        // このシート名では見つからなかったので次を試す
        continue;
      }
    }
    
    if (!athomeDataValue) {
      console.error(`❌ athomeシートのN1セルにデータが見つかりません`);
      console.log(`試したシート名:`, sheetNamePatterns);
      return;
    }
    
    console.log(`\n[Step 3] N1セルのデータを解析...`);
    console.log(`データ型: ${typeof athomeDataValue}`);
    console.log(`データ内容:`, athomeDataValue);
    
    // athome_dataをパース
    let athomeDataArray: any[] = [];
    
    if (typeof athomeDataValue === 'string') {
      try {
        // JSON配列としてパース
        athomeDataArray = JSON.parse(athomeDataValue);
        console.log(`✅ JSON配列としてパースしました`);
      } catch (e) {
        // パースに失敗した場合は、カンマ区切りとして扱う
        athomeDataArray = athomeDataValue.split(',').map((s: string) => s.trim());
        console.log(`✅ カンマ区切りとしてパースしました`);
      }
    } else if (Array.isArray(athomeDataValue)) {
      athomeDataArray = athomeDataValue;
      console.log(`✅ 既に配列です`);
    } else {
      console.error(`❌ athome_dataの形式が不正です: ${typeof athomeDataValue}`);
      return;
    }
    
    console.log(`\nathome_data配列:`, athomeDataArray);
    console.log(`配列の長さ: ${athomeDataArray.length}`);
    
    if (athomeDataArray.length > 0) {
      console.log(`  [0] フォルダURL: ${athomeDataArray[0]}`);
    }
    if (athomeDataArray.length > 1) {
      console.log(`  [1] パノラマURL: ${athomeDataArray[1]}`);
    }
    
    console.log(`\n[Step 4] データベースに保存...`);
    
    // PropertyDetailsServiceを使用してデータベースに保存
    const propertyDetailsService = new PropertyDetailsService();
    
    const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      athome_data: athomeDataArray,
    });
    
    if (success) {
      console.log(`✅ データベースに保存しました`);
    } else {
      console.error(`❌ データベースへの保存に失敗しました`);
      return;
    }
    
    console.log(`\n[Step 5] 保存されたデータを確認...`);
    
    // 保存されたデータを確認
    const savedDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log(`\n保存されたデータ:`);
    console.log(`  property_number: ${savedDetails.property_number}`);
    console.log(`  athome_data: ${JSON.stringify(savedDetails.athome_data)}`);
    console.log(`  athome_data配列の長さ: ${savedDetails.athome_data?.length || 0}`);
    
    if (savedDetails.athome_data && Array.isArray(savedDetails.athome_data)) {
      if (savedDetails.athome_data.length > 0) {
        console.log(`  [0] フォルダURL: ${savedDetails.athome_data[0]}`);
      }
      if (savedDetails.athome_data.length > 1) {
        console.log(`  [1] パノラマURL: ${savedDetails.athome_data[1]}`);
      }
    }
    
    console.log(`\n========================================`);
    console.log(`✅ 同期完了`);
    console.log(`========================================\n`);
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

// CC5のathome_dataを同期
syncAthomeDataFromIndividualSheet('CC5')
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
