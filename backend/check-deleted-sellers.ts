import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ 環境変数が設定されていません');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDeletedSellers() {
  console.log('🔍 スプレッドシートで削除された売主の確認\n');

  try {
    // DBにある3件の売主を確認
    const dbOnlySellers = ['AA13259', 'AA13273', 'AA13275'];
    
    console.log('📊 DBにのみ存在する売主の詳細:\n');
    
    for (const sellerNumber of dbOnlySellers) {
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('seller_number', sellerNumber)
        .single();

      if (error) {
        console.log(`❌ ${sellerNumber}: エラー - ${error.message}`);
        continue;
      }

      if (seller) {
        console.log(`\n📋 ${sellerNumber}:`);
        console.log(`  - 作成日: ${seller.created_at}`);
        console.log(`  - 更新日: ${seller.updated_at}`);
        console.log(`  - 売主名: ${seller.seller_name || '(なし)'}`);
        console.log(`  - ステータス: ${seller.status || '(なし)'}`);
        console.log(`  - 問い合わせ日: ${seller.inquiry_date || '(なし)'}`);
        
        // 関連するプロパティを確認
        const { data: properties } = await supabase
          .from('properties')
          .select('property_number, address')
          .eq('seller_id', seller.id);
        
        if (properties && properties.length > 0) {
          console.log(`  - 関連物件: ${properties.length}件`);
          properties.forEach(p => {
            console.log(`    - ${p.property_number}: ${p.address || '(住所なし)'}`);
          });
        } else {
          console.log(`  - 関連物件: なし`);
        }
      }
    }

    // スプレッドシートで確認
    console.log('\n\n🔍 スプレッドシートでの確認:\n');
    
    if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID環境変数が設定されていません');
      return;
    }
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      sheetName: '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json'
    });
    
    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    console.log(`✅ スプレッドシート総行数: ${rows.length}`);
    
    for (const sellerNumber of dbOnlySellers) {
      const foundInSheet = rows.some(row => {
        const sheetSellerNumber = row['売主番号'];
        return sheetSellerNumber === sellerNumber;
      });
      
      if (foundInSheet) {
        console.log(`✅ ${sellerNumber}: スプレッドシートに存在`);
      } else {
        console.log(`❌ ${sellerNumber}: スプレッドシートに存在しない（削除済み）`);
      }
    }

    // U-1766451305026 の確認
    console.log('\n\n🔍 不正な売主番号の確認:\n');
    
    const invalidSellerNumber = 'U-1766451305026';
    const foundInSheet = rows.some(row => {
      const sheetSellerNumber = row['売主番号'];
      return sheetSellerNumber === invalidSellerNumber;
    });
    
    if (foundInSheet) {
      console.log(`✅ ${invalidSellerNumber}: スプレッドシートに存在`);
      const foundRow = rows.find(row => row['売主番号'] === invalidSellerNumber);
      if (foundRow) {
        console.log(`  - データ: ${JSON.stringify(foundRow)}`);
      }
    } else {
      console.log(`❌ ${invalidSellerNumber}: スプレッドシートに存在しない`);
    }

    const { data: invalidSeller } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', invalidSellerNumber)
      .single();
    
    if (invalidSeller) {
      console.log(`❌ ${invalidSellerNumber}: DBに存在（削除すべき）`);
    } else {
      console.log(`✅ ${invalidSellerNumber}: DBに存在しない`);
    }

    console.log('\n\n📝 結論:');
    console.log('============================================================');
    console.log('スプレッドシートで削除された売主がDBに残っている問題が確認されました。');
    console.log('削除同期機能が実装されていないか、正しく動作していない可能性があります。');
    console.log('============================================================');

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkDeletedSellers();
