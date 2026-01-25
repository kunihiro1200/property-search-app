// 公開サイトに表示される全物件のパノラマURLを自動同期（V2）
// 業務リストの「スプシURL」があるものだけ、そのスプシのathomeシートのN1セルから取得
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

// .envファイルを読み込む（backendディレクトリの.env）
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Supabaseクライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncPanoramaUrlForProperty(propertyNumber: string): Promise<boolean> {
  try {
    console.log(`\n--- ${propertyNumber} ---`);
    
    let panoramaUrl: string | null = null;
    let spreadsheetUrl: string | null = null;
    
    // ========================================
    // ステップ1: 業務依頼シートから「スプシURL」を取得
    // ========================================
    try {
      const gyomuListClient = new GoogleSheetsClient({
        spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g', // 業務依頼
        sheetName: '業務依頼',
        serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      });
      
      await gyomuListClient.authenticate();
      
      // 物件番号で行を検索
      const rowIndex = await gyomuListClient.findRowByColumn('物件番号', propertyNumber);
      
      if (rowIndex) {
        // 全列のデータを取得
        const allData = await gyomuListClient.readRange(`A${rowIndex}:ZZ${rowIndex}`);
        
        if (allData.length > 0) {
          const rowData = allData[0];
          
          // 「スプシURL」列を取得
          const possibleSpreadsheetUrlKeys = ['スプシURL', 'spreadsheet_url', 'スプレッドシートURL'];
          
          for (const key of possibleSpreadsheetUrlKeys) {
            if (rowData[key]) {
              spreadsheetUrl = String(rowData[key]);
              console.log(`✅ 業務リストに「スプシURL」があります: ${spreadsheetUrl}`);
              break;
            }
          }
        }
      }
      
      if (!spreadsheetUrl) {
        console.log(`⚠️ 業務リストに「スプシURL」がありません（スキップ）`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ 業務リストの取得エラー: ${error.message}`);
      return false;
    }
    
    // ========================================
    // ステップ2: スプシURLからスプレッドシートIDを抽出
    // ========================================
    const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      console.log(`❌ スプシURLからスプレッドシートIDを抽出できません: ${spreadsheetUrl}`);
      return false;
    }
    
    const spreadsheetId = spreadsheetIdMatch[1];
    console.log(`📄 スプレッドシートID: ${spreadsheetId}`);
    
    // ========================================
    // ステップ3: athomeシートのN1セルからパノラマURLを取得
    // ========================================
    try {
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
            console.log(`✅ パノラマURL取得: ${panoramaUrl}`);
            break;
          }
        }
      }
      
      if (!panoramaUrl) {
        console.log(`⚠️ athomeシートのN1セルにパノラマURLがありません`);
        return false;
      }
    } catch (error: any) {
      console.error(`❌ athomeシートの取得エラー: ${error.message}`);
      return false;
    }
    
    // ========================================
    // ステップ4: データベースに保存
    // ========================================
    console.log(`💾 データベースに保存中...`);
    
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

async function syncAllPublicPropertiesPanorama() {
  try {
    console.log(`\n========================================`);
    console.log(`公開サイトに表示される全物件のパノラマURLを自動同期（V2）`);
    console.log(`ルール: 業務リストの「スプシURL」があるものだけ同期`);
    console.log(`========================================\n`);
    
    // データベースから公開サイトに表示される全物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️ 物件が見つかりませんでした');
      return;
    }
    
    console.log(`📊 対象物件数: ${properties.length}件\n`);
    
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    
    for (const property of properties) {
      const propertyNumber = property.property_number;
      
      if (!propertyNumber) {
        console.log(`⚠️ 物件番号が空です（スキップ）`);
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
    console.log(`合計: ${properties.length}件`);
    console.log(`========================================\n`);
    
  } catch (error: any) {
    console.error(`\n❌ エラーが発生しました:`, error);
    console.error(`エラー詳細:`, {
      message: error.message,
      stack: error.stack,
    });
  }
}

// 公開サイトに表示される全物件のパノラマURLを自動同期
syncAllPublicPropertiesPanorama()
  .then(() => {
    console.log('スクリプト実行完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('スクリプト実行エラー:', error);
    process.exit(1);
  });
