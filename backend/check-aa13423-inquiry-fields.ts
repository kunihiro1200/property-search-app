import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA13423InquiryFields() {
  console.log('🔍 AA13423の反響年・サイトフィールドを確認中...\n');

  // 1. データベースから取得
  console.log('📊 データベースの状態:');
  const { data: seller, error: dbError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13423')
    .single();

  if (dbError) {
    console.error('❌ データベースエラー:', dbError);
  } else if (!seller) {
    console.log('⚠️  データベースにAA13423が見つかりません');
  } else {
    console.log(`   売主番号: ${seller.seller_number}`);
    console.log(`   ID: ${seller.id}`);
    
    // inquiry_yearカラムが存在するか確認
    if ('inquiry_year' in seller) {
      console.log(`   反響年 (inquiry_year): ${seller.inquiry_year || '❌ NULL'}`);
    } else {
      console.log('   反響年 (inquiry_year): ❌ カラムが存在しません');
    }
    
    // inquiry_siteカラムが存在するか確認
    if ('inquiry_site' in seller) {
      console.log(`   サイト (inquiry_site): ${seller.inquiry_site || '❌ NULL'}`);
    } else {
      console.log('   サイト (inquiry_site): ❌ カラムが存在しません');
    }
    
    // 旧siteカラム
    if ('site' in seller) {
      console.log(`   サイト (site - 旧): ${seller.site || 'NULL'}`);
    }
    
    console.log(`   反響日 (inquiry_date): ${seller.inquiry_date || 'NULL'}`);
    console.log(`   問合元 (inquiry_source): ${seller.inquiry_source || 'NULL'}`);
  }

  // 2. スプレッドシートから取得
  console.log('\n📋 スプレッドシートの状態:');
  try {
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const allData = await sheetsClient.getAllData();
    
    // ヘッダー行を取得
    const headers = allData[0];
    console.log('\n   📝 スプレッドシートのヘッダー（反響年・サイト関連）:');
    headers.forEach((header: string, index: number) => {
      if (header.includes('反響') || header.includes('サイト')) {
        console.log(`      列${String.fromCharCode(65 + index)}: "${header}"`);
      }
    });

    // AA13423の行を探す
    const sellerNumberIndex = headers.indexOf('売主番号');
    const inquiryYearIndex = headers.indexOf('反響年');
    const siteIndex = headers.indexOf('サイト');
    const inquiryDateIndex = headers.indexOf('反響日付');

    console.log(`\n   📍 カラムインデックス:`);
    console.log(`      売主番号: ${sellerNumberIndex >= 0 ? `列${String.fromCharCode(65 + sellerNumberIndex)}` : '❌ 見つかりません'}`);
    console.log(`      反響年: ${inquiryYearIndex >= 0 ? `列${String.fromCharCode(65 + inquiryYearIndex)}` : '❌ 見つかりません'}`);
    console.log(`      サイト: ${siteIndex >= 0 ? `列${String.fromCharCode(65 + siteIndex)}` : '❌ 見つかりません'}`);
    console.log(`      反響日付: ${inquiryDateIndex >= 0 ? `列${String.fromCharCode(65 + inquiryDateIndex)}` : '❌ 見つかりません'}`);

    const aa13423Row = allData.find((row: any[]) => row[sellerNumberIndex] === 'AA13423');

    if (!aa13423Row) {
      console.log('\n   ⚠️  スプレッドシートにAA13423が見つかりません');
    } else {
      console.log(`\n   ✅ AA13423のデータ:`);
      console.log(`      売主番号: ${aa13423Row[sellerNumberIndex]}`);
      console.log(`      反響年: ${inquiryYearIndex >= 0 ? (aa13423Row[inquiryYearIndex] || '❌ 空') : '❌ カラムなし'}`);
      console.log(`      サイト: ${siteIndex >= 0 ? (aa13423Row[siteIndex] || '❌ 空') : '❌ カラムなし'}`);
      console.log(`      反響日付: ${inquiryDateIndex >= 0 ? (aa13423Row[inquiryDateIndex] || '空') : 'カラムなし'}`);
    }
  } catch (sheetError: any) {
    console.error('❌ スプレッドシートエラー:', sheetError.message);
  }

  // 3. 結論
  console.log('\n🎯 診断結果:');
  if (dbError && dbError.message.includes('does not exist')) {
    console.log('   ❌ データベースに inquiry_year または inquiry_site カラムが存在しません');
    console.log('   💡 解決策: マイグレーションを実行する必要があります');
  } else if (seller && !seller.inquiry_year && !seller.inquiry_site) {
    console.log('   ⚠️  カラムは存在しますが、データが空です');
    console.log('   💡 解決策: スプレッドシートから同期する必要があります');
  }
}

checkAA13423InquiryFields()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
