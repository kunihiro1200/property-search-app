// CC23のathome_dataを正しい構造に修正
// [フォルダURL, パノラマURL]の2項目配列にする
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { GyomuDriveFolderService } from './src/services/GyomuDriveFolderService';

// .envファイルを読み込む
dotenv.config();

async function fixCC23AthomeDataStructure(propertyNumber: string) {
  try {
    console.log(`\n========================================`);
    console.log(`${propertyNumber}のathome_dataを正しい構造に修正`);
    console.log(`========================================\n`);
    
    // ========================================
    // ステップ1: 個別スプシを検索
    // ========================================
    console.log(`[Step 1] 業務依頼フォルダから個別スプシを検索...`);
    
    const gyomuDriveFolderService = new GyomuDriveFolderService();
    const spreadsheetUrl = await gyomuDriveFolderService.findSpreadsheetByPropertyNumber(propertyNumber);
    
    if (!spreadsheetUrl) {
      console.error(`❌ 個別スプシが見つかりませんでした`);
      return;
    }
    
    console.log(`✅ 個別スプシが見つかりました: ${spreadsheetUrl}`);
    
    // スプレッドシートIDを抽出
    const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      throw new Error('スプレッドシートIDを抽出できませんでした');
    }
    const spreadsheetId = spreadsheetIdMatch[1];
    console.log(`   スプレッドシートID: ${spreadsheetId}`);
    
    // ========================================
    // ステップ2: athomeシートからN1を取得
    // ========================================
    console.log(`\n[Step 2] athomeシートからN1（パノラマURL）を取得...`);
    
    const individualSheetClient = new GoogleSheetsClient({
      spreadsheetId: spreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
    });
    
    await individualSheetClient.authenticate();
    console.log(`✅ 個別スプシ認証成功`);
    
    // N1セルのデータを取得
    const data = await individualSheetClient.readRange('N1:N1');
    
    if (data.length === 0) {
      console.error(`❌ N1のデータが取得できませんでした`);
      return;
    }
    
    const rowData = data[0];
    console.log(`✅ N1のデータを取得しました`);
    console.log(`   取得したデータ:`, rowData);
    
    // N1（パノラマURL）を取得
    let panoramaUrl = null;
    
    // N列のデータを取得（複数の可能性を試す）
    const possibleNKeys = ['N1', 'N', Object.keys(rowData)[0]];
    for (const key of possibleNKeys) {
      if (rowData[key]) {
        panoramaUrl = rowData[key];
        console.log(`✅ N1（パノラマURL）を取得: ${panoramaUrl}`);
        break;
      }
    }
    
    // ========================================
    // ステップ3: 正しい配列構造を作成
    // ========================================
    console.log(`\n[Step 3] 正しい配列構造を作成...`);
    
    const athomeDataArray: string[] = [];
    
    // フォルダURLは現在のデータベースから取得
    const propertyDetailsService = new PropertyDetailsService();
    const currentDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    let folderUrl = '';
    if (currentDetails.athome_data && Array.isArray(currentDetails.athome_data) && currentDetails.athome_data.length > 0) {
      folderUrl = currentDetails.athome_data[0] || '';
      console.log(`✅ 現在のフォルダURL: ${folderUrl}`);
    }
    
    // フォルダURLがパノラマURLの場合は空にする
    if (folderUrl && folderUrl.includes('vrpanorama.athome.jp')) {
      console.log(`⚠️ フォルダURLがパノラマURLになっているため、空にします`);
      folderUrl = '';
    }
    
    athomeDataArray.push(folderUrl);
    console.log(`✅ [0] フォルダURL: ${folderUrl || '(empty)'}`);
    
    if (panoramaUrl) {
      athomeDataArray.push(panoramaUrl);
      console.log(`✅ [1] パノラマURL: ${panoramaUrl}`);
    } else {
      console.warn(`⚠️ パノラマURLが見つかりませんでした。空文字列を追加します。`);
      athomeDataArray.push('');
    }
    
    console.log(`\n作成した配列:`, athomeDataArray);
    console.log(`配列の長さ: ${athomeDataArray.length}`);
    
    // ========================================
    // ステップ4: データベースに保存
    // ========================================
    console.log(`\n[Step 4] データベースに保存...`);
    
    const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      athome_data: athomeDataArray,
    });
    
    if (success) {
      console.log(`✅ データベースに保存しました`);
    } else {
      console.error(`❌ データベースへの保存に失敗しました`);
      return;
    }
    
    // ========================================
    // ステップ5: 保存されたデータを確認
    // ========================================
    console.log(`\n[Step 5] 保存されたデータを確認...`);
    
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
    console.log(`✅ 修正完了`);
    console.log(`========================================\n`);
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

// CC23のathome_dataを修正
fixCC23AthomeDataStructure('CC23')
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
