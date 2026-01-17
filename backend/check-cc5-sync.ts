/**
 * CC5物件の同期状況を診断
 * 
 * スプレッドシート「物件」シートとproperty_listingsテーブルの同期状況を確認
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function main() {
  console.log('🔍 CC5物件の同期状況を診断中...\n');

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Google Sheets接続
  const sheetsConfig = {
    spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
    sheetName: PROPERTY_LIST_SHEET_NAME,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };

  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  // 1. スプレッドシートからCC5を検索
  console.log('📊 Step 1: スプレッドシート「物件」シートを確認');
  const allRows = await sheetsClient.readAll();
  
  const cc5Row = allRows.find(row => {
    const propertyNumber = String(row['物件番号'] || '').trim();
    return propertyNumber === 'CC5';
  });

  if (cc5Row) {
    console.log('✅ スプレッドシートにCC5が存在します');
    console.log('   物件番号:', cc5Row['物件番号']);
    console.log('   所在地:', cc5Row['所在地'] || cc5Row['物件所在地'] || '(なし)');
    console.log('   種別:', cc5Row['種別'] || '(なし)');
    console.log('   売買価格:', cc5Row['売買価格'] || '(なし)');
    console.log('   ATBB状況:', cc5Row['ATBB状況'] || '(なし)');
  } else {
    console.log('❌ スプレッドシートにCC5が見つかりません');
    console.log('   → スプレッドシートに物件番号「CC5」の行が存在するか確認してください');
    return;
  }

  // 2. データベースからCC5を検索
  console.log('\n📊 Step 2: データベース(property_listings)を確認');
  const { data: dbProperty, error: dbError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC5')
    .single();

  if (dbError) {
    if (dbError.code === 'PGRST116') {
      console.log('❌ データベースにCC5が見つかりません');
      console.log('   → 同期が必要です');
    } else {
      console.log('❌ データベースエラー:', dbError.message);
    }
  } else {
    console.log('✅ データベースにCC5が存在します');
    console.log('   ID:', dbProperty.id);
    console.log('   物件番号:', dbProperty.property_number);
    console.log('   所在地:', dbProperty.address || '(なし)');
    console.log('   種別:', dbProperty.property_type || '(なし)');
    console.log('   売買価格:', dbProperty.sales_price || dbProperty.price || '(なし)');
    console.log('   ATBB状況:', dbProperty.atbb_status || '(なし)');
    console.log('   作成日時:', dbProperty.created_at);
    console.log('   更新日時:', dbProperty.updated_at);
  }

  // 3. 全物件数を確認
  console.log('\n📊 Step 3: 全体の同期状況を確認');
  
  // スプレッドシートの物件数
  const spreadsheetPropertyNumbers = new Set<string>();
  for (const row of allRows) {
    const propertyNumber = String(row['物件番号'] || '').trim();
    // 物件番号が空でなければすべて取得（AA, BB, CC, 久原など、すべての形式をサポート）
    if (propertyNumber) {
      spreadsheetPropertyNumbers.add(propertyNumber);
    }
  }
  console.log(`   スプレッドシート物件数: ${spreadsheetPropertyNumbers.size}`);

  // データベースの物件数
  const { count: dbCount, error: countError } = await supabase
    .from('property_listings')
    .select('property_number', { count: 'exact', head: true });

  if (!countError) {
    console.log(`   データベース物件数: ${dbCount}`);
    
    if (spreadsheetPropertyNumbers.size > (dbCount || 0)) {
      const missing = spreadsheetPropertyNumbers.size - (dbCount || 0);
      console.log(`   ⚠️  ${missing}件の物件が同期されていません`);
    }
  }

  // 4. 診断結果と推奨アクション
  console.log('\n📋 診断結果:');
  
  if (!dbProperty) {
    console.log('❌ CC5はスプレッドシートに存在しますが、データベースに同期されていません');
    console.log('\n💡 推奨アクション:');
    console.log('   1. 自動同期を待つ（5分ごとに実行）');
    console.log('   2. または手動で同期を実行:');
    console.log('      curl -X POST http://localhost:3000/api/property-listings/sync-new');
  } else {
    console.log('✅ CC5は正常に同期されています');
    console.log('\n💡 ブラウザで表示されない場合:');
    console.log('   1. ブラウザをハードリロード（Ctrl+Shift+R / Cmd+Shift+R）');
    console.log('   2. フィルター設定を確認（担当者、ステータス、検索条件）');
    console.log('   3. ページネーションを確認（別のページにある可能性）');
  }

  console.log('\n✅ 診断完了');
}

main().catch(console.error);
