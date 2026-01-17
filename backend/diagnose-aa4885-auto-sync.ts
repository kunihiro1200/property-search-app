/**
 * AA4885自動同期診断スクリプト
 * 
 * バックエンド再起動後もAA4885が同期されない原因を診断します。
 * 
 * 診断項目:
 * 1. 環境変数の確認（AUTO_SYNC_ENABLED）
 * 2. 自動同期サービスの初期化状態
 * 3. スプレッドシートからAA4885のデータ取得
 * 4. DBにAA4885が存在するか確認
 * 5. 物件リストテーブルにAA4885が存在するか確認
 * 6. 不足売主検出ロジックの動作確認
 */

import { getEnhancedAutoSyncService, isAutoSyncEnabled } from './src/services/EnhancedAutoSyncService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnose() {
  console.log('🔍 AA4885自動同期診断を開始します...\n');

  // ========================================
  // 1. 環境変数の確認
  // ========================================
  console.log('📋 Step 1: 環境変数の確認');
  console.log('─────────────────────────────────');
  const autoSyncEnabled = isAutoSyncEnabled();
  const autoSyncInterval = process.env.AUTO_SYNC_INTERVAL_MINUTES || '5';
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';
  
  console.log(`AUTO_SYNC_ENABLED: ${autoSyncEnabled ? '✅ 有効' : '❌ 無効'}`);
  console.log(`AUTO_SYNC_INTERVAL_MINUTES: ${autoSyncInterval}分`);
  console.log(`GOOGLE_SHEETS_SPREADSHEET_ID: ${spreadsheetId ? '✅ 設定済み' : '❌ 未設定'}`);
  console.log(`GOOGLE_SHEETS_SHEET_NAME: ${sheetName}`);
  
  if (!autoSyncEnabled) {
    console.log('\n❌ 自動同期が無効になっています！');
    console.log('   .envファイルでAUTO_SYNC_ENABLED=trueに設定してください。');
    return;
  }
  
  if (!spreadsheetId) {
    console.log('\n❌ スプレッドシートIDが設定されていません！');
    return;
  }

  // ========================================
  // 2. 自動同期サービスの初期化
  // ========================================
  console.log('\n📋 Step 2: 自動同期サービスの初期化');
  console.log('─────────────────────────────────');
  
  try {
    const service = getEnhancedAutoSyncService();
    await service.initialize();
    console.log('✅ 自動同期サービスの初期化に成功しました');
  } catch (error: any) {
    console.log('❌ 自動同期サービスの初期化に失敗しました');
    console.log(`   エラー: ${error.message}`);
    return;
  }

  // ========================================
  // 3. スプレッドシートからAA4885を検索
  // ========================================
  console.log('\n📋 Step 3: スプレッドシートからAA4885を検索');
  console.log('─────────────────────────────────');
  
  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allRows = await sheetsClient.readAll();
    const aa4885Row = allRows.find(row => row['売主番号'] === 'AA4885');
    
    if (aa4885Row) {
      console.log('✅ スプレッドシートにAA4885が存在します');
      console.log(`   売主番号: ${aa4885Row['売主番号']}`);
      console.log(`   物件番号: ${aa4885Row['物件番号']}`);
      console.log(`   状況: ${aa4885Row['状況（当社）']}`);
      console.log(`   ATBB状態: ${aa4885Row['ATBB状態']}`);
    } else {
      console.log('❌ スプレッドシートにAA4885が見つかりません');
      console.log('   スプレッドシートを確認してください。');
      return;
    }
  } catch (error: any) {
    console.log('❌ スプレッドシートの読み取りに失敗しました');
    console.log(`   エラー: ${error.message}`);
    return;
  }

  // ========================================
  // 4. DBのsellersテーブルでAA4885を確認
  // ========================================
  console.log('\n📋 Step 4: DBのsellersテーブルでAA4885を確認');
  console.log('─────────────────────────────────');
  
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA4885')
    .single();
  
  if (sellerError) {
    if (sellerError.code === 'PGRST116') {
      console.log('❌ sellersテーブルにAA4885が存在しません');
      console.log('   → これが問題の原因です！自動同期で追加されるべきです。');
    } else {
      console.log(`❌ sellersテーブルの確認中にエラーが発生しました: ${sellerError.message}`);
    }
  } else {
    console.log('✅ sellersテーブルにAA4885が存在します');
    console.log(`   ID: ${seller.id}`);
    console.log(`   物件番号: ${seller.property_number}`);
    console.log(`   状況: ${seller.status}`);
  }

  // ========================================
  // 5. DBのproperty_listingsテーブルでAA4885を確認
  // ========================================
  console.log('\n📋 Step 5: DBのproperty_listingsテーブルでAA4885を確認');
  console.log('─────────────────────────────────');
  
  const { data: propertyListing, error: plError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('seller_number', 'AA4885')
    .single();
  
  if (plError) {
    if (plError.code === 'PGRST116') {
      console.log('❌ property_listingsテーブルにAA4885が存在しません');
      console.log('   → sellersテーブルに追加された後、property_listingsにも同期されます。');
    } else {
      console.log(`❌ property_listingsテーブルの確認中にエラーが発生しました: ${plError.message}`);
    }
  } else {
    console.log('✅ property_listingsテーブルにAA4885が存在します');
    console.log(`   物件番号: ${propertyListing.property_number}`);
    console.log(`   ATBB状態: ${propertyListing.atbb_status}`);
  }

  // ========================================
  // 6. 不足売主検出ロジックの動作確認
  // ========================================
  console.log('\n📋 Step 6: 不足売主検出ロジックの動作確認');
  console.log('─────────────────────────────────');
  
  try {
    const syncService = getEnhancedAutoSyncService();
    const missingSellers = await syncService.detectMissingSellers();
    
    console.log(`検出された不足売主数: ${missingSellers.length}件`);
    
    const aa4885IsMissing = missingSellers.includes('AA4885');
    
    if (aa4885IsMissing) {
      console.log('✅ AA4885が不足売主として検出されました');
      console.log('   → 次回の自動同期で追加されるはずです。');
    } else {
      if (missingSellers.length > 0) {
        console.log('⚠️  AA4885は不足売主として検出されませんでした');
        console.log(`   検出された不足売主の例: ${missingSellers.slice(0, 5).join(', ')}`);
      } else {
        console.log('✅ 不足売主は検出されませんでした（すべて同期済み）');
      }
    }
  } catch (error: any) {
    console.log('❌ 不足売主検出に失敗しました');
    console.log(`   エラー: ${error.message}`);
  }

  // ========================================
  // 7. 診断結果のサマリー
  // ========================================
  console.log('\n📊 診断結果サマリー');
  console.log('═════════════════════════════════');
  
  const sellerExists = !sellerError || sellerError.code !== 'PGRST116';
  const plExists = !plError || plError.code !== 'PGRST116';
  
  if (!sellerExists && !plExists) {
    console.log('❌ 問題: AA4885がDBに存在しません');
    console.log('\n🔧 推奨される対処法:');
    console.log('   1. バックエンドが正常に起動しているか確認');
    console.log('   2. 自動同期が実際に動作しているかログを確認');
    console.log('   3. 手動で同期を実行してみる:');
    console.log('      npm run ts-node backend/force-sync-aa4885.ts');
    console.log('   4. 自動同期の次回実行を待つ（5分間隔）');
  } else if (sellerExists && !plExists) {
    console.log('⚠️  部分的な問題: sellersテーブルには存在するが、property_listingsテーブルには存在しません');
    console.log('\n🔧 推奨される対処法:');
    console.log('   1. PropertyListingSyncServiceを実行:');
    console.log('      npm run ts-node backend/sync-property-listings.ts');
  } else {
    console.log('✅ AA4885はDBに正常に存在します');
    console.log('   問題は解決済みの可能性があります。');
  }
  
  console.log('\n✅ 診断完了');
}

diagnose().catch(console.error);
