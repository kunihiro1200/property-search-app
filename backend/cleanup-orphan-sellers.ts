/**
 * スプレッドシートに存在しない売主をDBから削除するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function cleanupOrphanSellers() {
  console.log('=== スプレッドシートに存在しない売主を削除 ===\n');

  try {
    // Google Sheets クライアントを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const allRows = await sheetsClient.readAll();
    console.log(`✅ ${allRows.length}行のデータを取得しました\n`);

    // スプレッドシートの売主番号をセットに格納
    const sheetSellerNumbers = new Set<string>();
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber) {
        sheetSellerNumbers.add(String(sellerNumber).trim());
      }
    }
    console.log(`📋 スプレッドシートの売主数: ${sheetSellerNumbers.size}件\n`);

    // DBから全売主番号を取得（ページネーションで全件取得）
    let dbSellers: { id: string; seller_number: string }[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, seller_number')
        .order('seller_number', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error('DB取得エラー:', error.message);
        return;
      }
      
      if (!data || data.length === 0) break;
      
      dbSellers = dbSellers.concat(data);
      page++;
      
      if (data.length < pageSize) break;
    }

    console.log(`📋 DBの売主数: ${dbSellers.length}件\n`);

    // スプレッドシートに存在しない売主を特定
    const orphanSellers: { id: string; seller_number: string }[] = [];
    for (const seller of dbSellers || []) {
      if (!sheetSellerNumbers.has(seller.seller_number)) {
        orphanSellers.push(seller);
      }
    }

    console.log(`🔍 スプレッドシートに存在しない売主: ${orphanSellers.length}件\n`);

    if (orphanSellers.length === 0) {
      console.log('✅ 削除対象の売主はありません');
      return;
    }

    // 削除対象を表示
    console.log('削除対象:');
    for (const seller of orphanSellers) {
      console.log(`  - ${seller.seller_number}`);
    }
    console.log('');

    // 削除実行
    let deletedCount = 0;
    let errorCount = 0;

    for (const seller of orphanSellers) {
      try {
        // 関連する物件を削除
        const { error: propError } = await supabase
          .from('properties')
          .delete()
          .eq('seller_id', seller.id);

        if (propError) {
          console.log(`  ⚠️ ${seller.seller_number}: 物件削除エラー - ${propError.message}`);
        }

        // 関連するアクティビティを削除
        const { error: actError } = await supabase
          .from('activities')
          .delete()
          .eq('seller_id', seller.id);

        if (actError) {
          console.log(`  ⚠️ ${seller.seller_number}: アクティビティ削除エラー - ${actError.message}`);
        }

        // 関連する予約を削除
        const { error: apptError } = await supabase
          .from('appointments')
          .delete()
          .eq('seller_id', seller.id);

        if (apptError) {
          console.log(`  ⚠️ ${seller.seller_number}: 予約削除エラー - ${apptError.message}`);
        }

        // 売主を削除
        const { error: sellerError } = await supabase
          .from('sellers')
          .delete()
          .eq('id', seller.id);

        if (sellerError) {
          console.log(`  ❌ ${seller.seller_number}: 売主削除エラー - ${sellerError.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ ${seller.seller_number}: 削除完了`);
          deletedCount++;
        }
      } catch (error: any) {
        console.log(`  ❌ ${seller.seller_number}: エラー - ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n=== 削除結果 ===');
    console.log(`  削除成功: ${deletedCount}件`);
    console.log(`  エラー: ${errorCount}件`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

cleanupOrphanSellers().catch(console.error);
