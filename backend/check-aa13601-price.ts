/**
 * AA13601の価格データを確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAA13601Price() {
  console.log('🔍 AA13601の価格データを確認中...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // データベースから取得
    const { data: dbData, error: dbError } = await supabase
      .from('property_listings')
      .select('property_number, sales_price, listing_price, address, atbb_status, updated_at')
      .eq('property_number', 'AA13601')
      .single();

    if (dbError) {
      console.error('❌ データベースエラー:', dbError.message);
      return;
    }

    if (!dbData) {
      console.log('❌ AA13601がデータベースに見つかりません');
      return;
    }

    console.log('📊 データベースの現在の値:');
    console.log(`  property_number: ${dbData.property_number}`);
    console.log(`  sales_price: ${dbData.sales_price} (売買価格/BS列→J列)`);
    console.log(`  listing_price: ${dbData.listing_price} (売出価格/e列)`);
    console.log(`  address: ${dbData.address}`);
    console.log(`  atbb_status: ${dbData.atbb_status}`);
    console.log(`  updated_at: ${dbData.updated_at}`);

    // スプレッドシートから取得
    console.log('\n📋 スプレッドシートから確認中...');
    const { GoogleSheetsClient } = await import('./api/src/services/GoogleSheetsClient');
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
      sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();

    const aa13601Row = rows.find(row => row['物件番号'] === 'AA13601');

    if (!aa13601Row) {
      console.log('❌ AA13601がスプレッドシートに見つかりません');
      return;
    }

    console.log('\n📋 スプレッドシートの値:');
    console.log(`  物件番号: ${aa13601Row['物件番号']}`);
    console.log(`  価格 (BS列): ${aa13601Row['価格'] || '(なし)'}`);
    console.log(`  売買価格 (J列): ${aa13601Row['売買価格'] || '(なし)'}`);
    console.log(`  売出価格 (e列): ${aa13601Row['売出価格'] || '(なし)'}`);
    console.log(`  所在地: ${aa13601Row['所在地'] || '(なし)'}`);
    console.log(`  atbb成約済み/非公開: ${aa13601Row['atbb成約済み/非公開'] || '(なし)'}`);

    // 期待される値を計算
    const expectedSalesPrice = aa13601Row['価格']
      ? parseFloat(String(aa13601Row['価格']).replace(/,/g, ''))
      : aa13601Row['売買価格']
      ? parseFloat(String(aa13601Row['売買価格']).replace(/,/g, ''))
      : null;

    console.log('\n🎯 期待される値:');
    console.log(`  sales_price: ${expectedSalesPrice} (BS列→J列の優先順位)`);

    // 比較
    console.log('\n📊 比較:');
    if (dbData.sales_price === expectedSalesPrice) {
      console.log('  ✅ sales_priceは正しく同期されています');
    } else {
      console.log('  ❌ sales_priceが一致しません');
      console.log(`     データベース: ${dbData.sales_price}`);
      console.log(`     期待値: ${expectedSalesPrice}`);
      console.log(`     差分: ${(expectedSalesPrice || 0) - (dbData.sales_price || 0)}`);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

checkAA13601Price();
