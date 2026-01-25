// CC23のathome_dataを包括的に取得・同期
// 1. 業務リストスプレッドシートから取得を試みる
// 2. 見つからない場合は、業務依頼フォルダから物件番号を含むスプシを検索
// 3. 個別スプシの「athome」シートのN1セルから取得
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { GyomuDriveFolderService } from './src/services/GyomuDriveFolderService';

// .envファイルを読み込む
dotenv.config();

async function syncAthomeDataComprehensive(propertyNumber: string) {
  try {
    console.log(`\n========================================`);
    console.log(`${propertyNumber}のathome_dataを包括的に取得・同期`);
    console.log(`========================================\n`);
    
    let athomeDataArray: any[] = [];
    let source = '';
    
    // ========================================
    // ステップ1: 業務リストスプレッドシートから取得を試みる
    // ========================================
    console.log(`[Step 1] 業務リストスプレッドシートから取得を試みる...`);
    
    try {
      const gyomuListClient = new GoogleSheetsClient({
        spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
        sheetName: '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      });
      
      await gyomuListClient.authenticate();
      console.log(`✅ 業務リストスプレッドシート認証成功`);
      
      // 物件番号で行を検索
      const rowIndex = await gyomuListClient.findRowByColumn('物件番号', propertyNumber);
      
      if (rowIndex) {
        console.log(`✅ 業務リストで物件が見つかりました: 行 ${rowIndex}`);
        
        // N列のデータを取得
        const allData = await gyomuListClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
        
        if (allData.length > 0) {
          const rowData = allData[0];
          
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
          
          if (athomeDataValue) {
            console.log(`✅ 業務リストからathome_dataを取得しました`);
            console.log(`   カラム名: "${foundKey}"`);
            console.log(`   データ型: ${typeof athomeDataValue}`);
            
            // athome_dataをパース
            if (typeof athomeDataValue === 'string') {
              try {
                athomeDataArray = JSON.parse(athomeDataValue);
                console.log(`✅ JSON配列としてパースしました`);
              } catch (e) {
                athomeDataArray = athomeDataValue.split(',').map(s => s.trim());
                console.log(`✅ カンマ区切りとしてパースしました`);
              }
            } else if (Array.isArray(athomeDataValue)) {
              athomeDataArray = athomeDataValue;
              console.log(`✅ 既に配列です`);
            }
            
            source = '業務リストスプレッドシート';
          }
        }
      } else {
        console.log(`⚠️ 業務リストに物件が見つかりませんでした`);
      }
    } catch (error: any) {
      console.error(`❌ 業務リストからの取得に失敗:`, error.message);
    }
    
    // ========================================
    // ステップ2: 業務リストで見つからない場合、業務依頼フォルダから検索
    // ========================================
    if (athomeDataArray.length === 0) {
      console.log(`\n[Step 2] 業務依頼フォルダから物件番号を含むスプシを検索...`);
      
      try {
        const gyomuDriveFolderService = new GyomuDriveFolderService();
        const spreadsheetUrl = await gyomuDriveFolderService.findSpreadsheetByPropertyNumber(propertyNumber);
        
        if (spreadsheetUrl) {
          console.log(`✅ 個別スプシが見つかりました: ${spreadsheetUrl}`);
          
          // スプレッドシートIDを抽出
          const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (!spreadsheetIdMatch) {
            throw new Error('スプレッドシートIDを抽出できませんでした');
          }
          const spreadsheetId = spreadsheetIdMatch[1];
          console.log(`   スプレッドシートID: ${spreadsheetId}`);
          
          // ========================================
          // ステップ3: 個別スプシの「athome」シートのN1セルから取得
          // ========================================
          console.log(`\n[Step 3] 個別スプシの「athome」シートのN1セルから取得...`);
          
          const individualSheetClient = new GoogleSheetsClient({
            spreadsheetId: spreadsheetId,
            sheetName: 'athome',
            serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
          });
          
          await individualSheetClient.authenticate();
          console.log(`✅ 個別スプシ認証成功`);
          
          // N1セルのデータを取得
          const n1Data = await individualSheetClient.readRange('N1:N1');
          
          if (n1Data.length > 0 && n1Data[0]) {
            const n1Value = n1Data[0]['N1'] || n1Data[0]['N'] || Object.values(n1Data[0])[0];
            
            if (n1Value) {
              console.log(`✅ N1セルからathome_dataを取得しました`);
              console.log(`   データ型: ${typeof n1Value}`);
              console.log(`   データ内容:`, n1Value);
              
              // athome_dataをパース
              if (typeof n1Value === 'string') {
                try {
                  athomeDataArray = JSON.parse(n1Value);
                  console.log(`✅ JSON配列としてパースしました`);
                } catch (e) {
                  athomeDataArray = n1Value.split(',').map(s => s.trim());
                  console.log(`✅ カンマ区切りとしてパースしました`);
                }
              } else if (Array.isArray(n1Value)) {
                athomeDataArray = n1Value;
                console.log(`✅ 既に配列です`);
              }
              
              source = `個別スプシ（${spreadsheetUrl}）`;
            } else {
              console.log(`⚠️ N1セルが空です`);
            }
          } else {
            console.log(`⚠️ N1セルのデータが取得できませんでした`);
          }
        } else {
          console.log(`⚠️ 業務依頼フォルダに物件番号を含むスプシが見つかりませんでした`);
        }
      } catch (error: any) {
        console.error(`❌ 業務依頼フォルダからの取得に失敗:`, error.message);
      }
    }
    
    // ========================================
    // ステップ4: データベースに保存
    // ========================================
    if (athomeDataArray.length === 0) {
      console.log(`\n❌ athome_dataが取得できませんでした`);
      console.log(`\n対処方法:`);
      console.log(`1. 業務リストスプレッドシートの「物件」シートに${propertyNumber}が存在するか確認`);
      console.log(`2. 業務依頼フォルダに${propertyNumber}を含むスプレッドシートが存在するか確認`);
      console.log(`3. 個別スプシの「athome」シートのN1セルにデータが入力されているか確認`);
      return;
    }
    
    console.log(`\n[Step 4] データベースに保存...`);
    console.log(`取得元: ${source}`);
    console.log(`athome_data配列:`, athomeDataArray);
    console.log(`配列の長さ: ${athomeDataArray.length}`);
    
    if (athomeDataArray.length > 0) {
      console.log(`  [0] フォルダURL: ${athomeDataArray[0]}`);
    }
    if (athomeDataArray.length > 1) {
      console.log(`  [1] パノラマURL: ${athomeDataArray[1]}`);
    }
    
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

// CC23のathome_dataを同期
syncAthomeDataComprehensive('CC23')
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
