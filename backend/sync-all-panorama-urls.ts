// 全物件のパノラマURLを同期
// 業務リストまたは個別スプシのathomeシートのN1セルから取得
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { GyomuDriveFolderService } from './src/services/GyomuDriveFolderService';

// .envファイルを読み込む
dotenv.config();

async function syncPanoramaUrlForProperty(propertyNumber: string): Promise<boolean> {
  try {
    console.log(`\n--- ${propertyNumber} ---`);
    
    let panoramaUrl: string | null = null;
    let source = '';
    
    // ========================================
    // ステップ1: 業務リストスプレッドシートから取得を試みる
    // ========================================
    try {
      const gyomuListClient = new GoogleSheetsClient({
        spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
        sheetName: '物件',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      });
      
      await gyomuListClient.authenticate();
      
      // 物件番号で行を検索
      const rowIndex = await gyomuListClient.findRowByColumn('物件番号', propertyNumber);
      
      if (rowIndex) {
        // N列のデータを取得
        const allData = await gyomuListClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
        
        if (allData.length > 0) {
          const rowData = allData[0];
          
          // N列のデータを取得
          const possibleKeys = ['athome_data', 'N1', 'N', '●athome_data', 'athomeデータ'];
          
          for (const key of possibleKeys) {
            if (rowData[key]) {
              const value = rowData[key];
              
              // JSON配列としてパース
              if (typeof value === 'string') {
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed) && parsed.length > 1) {
                    panoramaUrl = parsed[1];
                    source = '業務リスト';
                    break;
                  }
                } catch (e) {
                  // パース失敗は無視
                }
              }
            }
          }
          
          // 見つからない場合は、N列の位置（14番目）から直接取得
          if (!panoramaUrl) {
            const keys = Object.keys(rowData);
            if (keys.length >= 14) {
              const foundKey = keys[13];
              const value = rowData[foundKey];
              
              if (typeof value === 'string') {
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed) && parsed.length > 1) {
                    panoramaUrl = parsed[1];
                    source = '業務リスト';
                  }
                } catch (e) {
                  // パース失敗は無視
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      // エラーは無視して次のステップへ
    }
    
    // ========================================
    // ステップ2: 業務リストで見つからない場合、個別スプシから検索
    // ========================================
    if (!panoramaUrl) {
      try {
        const gyomuDriveFolderService = new GyomuDriveFolderService();
        const spreadsheetUrl = await gyomuDriveFolderService.findSpreadsheetByPropertyNumber(propertyNumber);
        
        if (spreadsheetUrl) {
          // スプレッドシートIDを抽出
          const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (spreadsheetIdMatch) {
            const spreadsheetId = spreadsheetIdMatch[1];
            
            // athomeシートのN1セルから取得
            const individualSheetClient = new GoogleSheetsClient({
              spreadsheetId: spreadsheetId,
              sheetName: 'athome',
              serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
            });
            
            await individualSheetClient.authenticate();
            
            // N1セルのデータを取得
            const data = await individualSheetClient.readRange('N1:N1');
            
            if (data.length > 0) {
              const rowData = data[0];
              
              // N列のデータを取得
              const possibleNKeys = ['N1', 'N', Object.keys(rowData)[0]];
              for (const key of possibleNKeys) {
                if (rowData[key]) {
                  panoramaUrl = rowData[key];
                  source = '個別スプシ';
                  break;
                }
              }
            }
          }
        }
      } catch (error: any) {
        // エラーは無視
      }
    }
    
    // ========================================
    // ステップ3: データベースに保存
    // ========================================
    if (!panoramaUrl) {
      console.log(`⚠️ パノラマURLが見つかりませんでした`);
      return false;
    }
    
    console.log(`✅ パノラマURL取得: ${panoramaUrl} (取得元: ${source})`);
    
    // 現在のデータベースから取得
    const propertyDetailsService = new PropertyDetailsService();
    const currentDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    let folderUrl = '';
    if (currentDetails.athome_data && Array.isArray(currentDetails.athome_data) && currentDetails.athome_data.length > 0) {
      folderUrl = currentDetails.athome_data[0] || '';
    }
    
    // フォルダURLがパノラマURLの場合は空にする
    if (folderUrl && folderUrl.includes('vrpanorama.athome.jp')) {
      folderUrl = '';
    }
    
    // 正しい配列構造を作成
    const athomeDataArray = [folderUrl, panoramaUrl];
    
    // データベースに保存
    const success = await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      athome_data: athomeDataArray,
    });
    
    if (success) {
      console.log(`✅ データベースに保存しました`);
      return true;
    } else {
      console.log(`❌ データベースへの保存に失敗しました`);
      return false;
    }
    
  } catch (error: any) {
    console.error(`❌ エラー: ${error.message}`);
    return false;
  }
}

async function syncAllPanoramaUrls() {
  try {
    console.log(`\n========================================`);
    console.log(`全物件のパノラマURLを同期`);
    console.log(`========================================\n`);
    
    // 対象物件リスト（CC5以外のCC物件）
    const propertyNumbers = [
      'CC23',
      'CC6',
      'CC9',
      'CC21',
      'CC22',
      // 必要に応じて追加
    ];
    
    let successCount = 0;
    let failCount = 0;
    
    for (const propertyNumber of propertyNumbers) {
      const success = await syncPanoramaUrlForProperty(propertyNumber);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // API制限を避けるため、少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n========================================`);
    console.log(`✅ 同期完了`);
    console.log(`成功: ${successCount}件`);
    console.log(`失敗: ${failCount}件`);
    console.log(`========================================\n`);
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

// 全物件のパノラマURLを同期
syncAllPanoramaUrls()
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
