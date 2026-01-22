/**
 * Property Listings REST API Sync Script (Temporary Solution)
 * 
 * このスクリプトはREST APIを使用して物件リストを同期します。
 * 完全なREST API-based syncの実装が完了するまでの一時的な解決策です。
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

interface PropertyListingUpdate {
  property_number: string;
  atbb_status?: string;
  storage_location?: string;
  [key: string]: any;
}

async function syncPropertyListingsViaRest() {
  console.log('🔄 REST APIを使用した物件リスト同期を開始します...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Supabaseクライアントを初期化しました\n');

  // Step 1: Get property listings from Google Sheets
  console.log('📋 ステップ1: Googleスプレッドシートからデータを取得');
  
  // Import PropertyListingSyncService to reuse existing logic
  try {
    const { PropertyListingSyncService } = await import('./src/services/PropertyListingSyncService');
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');

    const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const PROPERTY_LIST_SHEET_NAME = '物件';

    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const syncService = new PropertyListingSyncService(sheetsClient);

    console.log('✅ Googleスプレッドシートに接続しました\n');

    // Step 2: Detect updated property listings
    console.log('📋 ステップ2: 更新が必要な物件を検出');
    const updatedProperties = await syncService.detectUpdatedPropertyListings();

    if (updatedProperties.length === 0) {
      console.log('✅ 更新が必要な物件はありません\n');
      return;
    }

    console.log(`✅ ${updatedProperties.length} 件の物件に更新が必要です\n`);

    // Step 3: Update property listings via REST API
    console.log('📋 ステップ3: REST APIを使用して物件を更新');
    
    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ property_number: string; error: string }> = [];

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < updatedProperties.length; i += batchSize) {
      const batch = updatedProperties.slice(i, i + batchSize);
      
      console.log(`   バッチ ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatedProperties.length / batchSize)}: ${batch.length} 件を処理中...`);

      for (const property of batch) {
        try {
          // Update via REST API
          const { error } = await supabase
            .from('property_listings')
            .update({
              atbb_status: property.atbb_status,
              storage_location: property.storage_location,
              public_url: property.public_url,
              seller_name: property.seller_name,
              address: property.address,
              price: property.price,
              land_area: property.land_area,
              building_area: property.building_area,
              property_type: property.property_type,
              status: property.status,
              updated_at: new Date().toISOString()
            })
            .eq('property_number', property.property_number);

          if (error) {
            throw error;
          }

          successCount++;
          console.log(`      ✅ ${property.property_number}: 更新成功`);

        } catch (error: any) {
          failCount++;
          errors.push({
            property_number: property.property_number,
            error: error.message
          });
          console.error(`      ❌ ${property.property_number}: ${error.message}`);
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < updatedProperties.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 4: Report results
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 同期結果サマリー');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   対象物件数: ${updatedProperties.length} 件`);
    console.log(`   ✅ 成功: ${successCount} 件`);
    console.log(`   ❌ 失敗: ${failCount} 件`);
    console.log(`   成功率: ${((successCount / updatedProperties.length) * 100).toFixed(1)}%`);
    console.log('');

    if (errors.length > 0) {
      console.log('❌ エラー詳細:');
      errors.forEach(({ property_number, error }) => {
        console.log(`   - ${property_number}: ${error}`);
      });
      console.log('');
    }

    if (successCount > 0) {
      console.log('✅ 同期が完了しました！');
      console.log('');
      console.log('📋 次のステップ:');
      console.log('   1. 公開物件サイトで表示を確認');
      console.log('   2. 必要に応じて再度同期を実行');
      console.log('   3. REST API-based syncの完全実装を検討');
      console.log('      詳細: .kiro/specs/property-listing-sync-alternative-approach/');
      console.log('');
    }

  } catch (error: any) {
    console.error('❌ 同期処理中にエラーが発生しました:');
    console.error(`   ${error.message}`);
    console.error('\n詳細:');
    console.error(error);
    process.exit(1);
  }
}

syncPropertyListingsViaRest().catch((error) => {
  console.error('\n予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});
