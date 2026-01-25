// 公開物件のパノラマURLを自動同期
// 「公開物件」= atbb_statusが以下のいずれか:
//   - '専任・公開中'
//   - '一般・公開中'
//   - '非公開（配信メールのみ）'
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';
import { GyomuDriveFolderService } from './src/services/GyomuDriveFolderService';

// .envファイルを読み込む
dotenv.config();

// Supabaseクライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
                  panoramaUrl = String(rowData[key]);
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

async function syncPublicPropertiesPanorama() {
  try {
    console.log(`\n========================================`);
    console.log(`公開物件のパノラマURLを自動同期`);
    console.log(`========================================\n`);
    
    // 公開物件を取得（atbb_statusが以下のいずれか）
    // - '専任・公開中'
    // - '一般・公開中'
    // - '非公開（配信メールのみ）'
    const { data: publicProperties, error } = await supabase
      .from('property_listings')
      .select('property_number')
      .in('atbb_status', [
        '専任・公開中',
        '一般・公開中',
        '非公開（配信メールのみ）'
      ])
      .order('property_number', { ascending: true });
    
    if (error) {
      console.error(`❌ データベースエラー:`, error);
      throw error;
    }
    
    if (!publicProperties || publicProperties.length === 0) {
      console.log(`⚠️ 公開物件が見つかりませんでした`);
      return;
    }
    
    console.log(`📊 公開物件数: ${publicProperties.length}件\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    
    for (const property of publicProperties) {
      const propertyNumber = property.property_number;
      
      // パノラマURLが既に存在するかチェック
      const propertyDetailsService = new PropertyDetailsService();
      const currentDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
      
      // athome_dataの2番目の要素（パノラマURL）が既に存在する場合はスキップ
      if (currentDetails.athome_data && 
          Array.isArray(currentDetails.athome_data) && 
          currentDetails.athome_data.length > 1 && 
          currentDetails.athome_data[1]) {
        console.log(`⏭️ ${propertyNumber}: パノラマURL既存（スキップ）`);
        skippedCount++;
        continue;
      }
      
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
    console.log(`スキップ: ${skippedCount}件`);
    console.log(`合計: ${publicProperties.length}件`);
    console.log(`========================================\n`);
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

// 公開物件のパノラマURLを自動同期
syncPublicPropertiesPanorama()
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
