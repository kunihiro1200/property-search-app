// CC5のathome_dataをGoogle SheetsのN1セルから同期
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

// .envファイルを読み込む
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAthomeDataFromN1(propertyNumber: string) {
  try {
    console.log(`\n========================================`);
    console.log(`CC5のathome_dataをN1セルから同期`);
    console.log(`========================================\n`);
    
    console.log(`[Step 1] Google Sheetsに接続...`);
    
    // Google Sheetsクライアントを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    console.log(`✅ Google Sheets認証成功`);
    
    console.log(`\n[Step 2] 物件番号で行を検索: ${propertyNumber}`);
    
    // 物件番号で行を検索
    const rowIndex = await sheetsClient.findRowByColumn('物件番号', propertyNumber);
    
    if (!rowIndex) {
      console.error(`❌ 物件が見つかりません: ${propertyNumber}`);
      return;
    }
    
    console.log(`✅ 物件が見つかりました: 行 ${rowIndex}`);
    
    console.log(`\n[Step 3] N1セルのデータを取得...`);
    
    // N1セルのデータを取得（N列は14番目の列）
    // A=1, B=2, ..., N=14
    const allData = await sheetsClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
    
    if (allData.length === 0) {
      console.error(`❌ 行データが取得できません`);
      return;
    }
    
    const rowData = allData[0];
    console.log(`✅ 行データを取得しました`);
    console.log(`利用可能なカラム:`, Object.keys(rowData).slice(0, 20).join(', '), '...');
    
    // N1セルのデータを取得（カラム名を確認）
    // 実際のカラム名を確認するため、全てのキーを表示
    console.log(`\n全てのカラム名:`);
    Object.keys(rowData).forEach((key, index) => {
      console.log(`  ${index + 1}. "${key}"`);
    });
    
    // N列のデータを取得（複数の可能性を試す）
    const possibleKeys = [
      'athome_data',
      'N1',
      'N',
      '●athome_data',
      'athomeデータ',
    ];
    
    let athomeDataValue = null;
    let foundKey = null;
    
    for (const key of possibleKeys) {
      if (rowData[key]) {
        athomeDataValue = rowData[key];
        foundKey = key;
        break;
      }
    }
    
    // 見つからない場合は、N列の位置（14番目）から直接取得
    if (!athomeDataValue) {
      const keys = Object.keys(rowData);
      if (keys.length >= 14) {
        foundKey = keys[13]; // 0-indexed, N列は14番目
        athomeDataValue = rowData[foundKey];
      }
    }
    
    if (!athomeDataValue) {
      console.error(`❌ N1セルのデータが見つかりません`);
      console.log(`試したキー:`, possibleKeys);
      return;
    }
    
    console.log(`✅ N1セルのデータを取得しました`);
    console.log(`カラム名: "${foundKey}"`);
    console.log(`データ型: ${typeof athomeDataValue}`);
    console.log(`データ内容:`, athomeDataValue);
    
    // athome_dataをパース（JSON配列として保存されている場合）
    let athomeDataArray: any[] = [];
    
    if (typeof athomeDataValue === 'string') {
      try {
        // JSON配列としてパース
        athomeDataArray = JSON.parse(athomeDataValue);
        console.log(`✅ JSON配列としてパースしました`);
      } catch (e) {
        // パースに失敗した場合は、カンマ区切りとして扱う
        athomeDataArray = athomeDataValue.split(',').map(s => s.trim());
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
syncAthomeDataFromN1('CC5')
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
