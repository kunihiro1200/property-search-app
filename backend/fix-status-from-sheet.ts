import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStatusFromSheet() {
  console.log('🔄 スプレッドシートからフィールドを修正中...\n');

  try {
    // Initialize Google Sheets client
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const columnMapper = new ColumnMapper();

    // Get all rows from spreadsheet
    console.log('📊 スプレッドシートからデータを取得中...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length} 行のデータを取得しました\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log('🔄 データベースを更新中...\n');

    for (const row of rows) {
      try {
        const sellerNumber = row['売主番号'];

        if (!sellerNumber) {
          skipped++;
          continue;
        }

        // Map spreadsheet data to database format
        const mappedData = columnMapper.mapToDatabase(row);

        // Get seller from database
        const { data: seller, error: fetchError } = await supabase
          .from('sellers')
          .select('id, status, inquiry_site, inquiry_date, confidence, next_call_date, contract_year_month, competitor_name, competitor_name_and_reason, exclusive_other_decision_factor')
          .eq('seller_number', sellerNumber)
          .maybeSingle();

        if (fetchError) {
          console.error(`❌ ${sellerNumber} の取得エラー:`, fetchError.message);
          errors++;
          continue;
        }

        if (!seller) {
          skipped++;
          continue;
        }

        // Check if any field needs updating
        const needsUpdate = 
          seller.status !== mappedData.status ||
          seller.inquiry_site !== mappedData.inquiry_site ||
          seller.inquiry_date !== mappedData.inquiry_date ||
          seller.confidence !== mappedData.confidence ||
          seller.next_call_date !== mappedData.next_call_date ||
          seller.contract_year_month !== mappedData.contract_year_month ||
          seller.competitor_name !== mappedData.competitor_name ||
          seller.competitor_name_and_reason !== mappedData.competitor_name_and_reason ||
          seller.exclusive_other_decision_factor !== mappedData.exclusive_other_decision_factor;

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('sellers')
            .update({
              status: mappedData.status || null,
              inquiry_site: mappedData.inquiry_site || null,
              inquiry_date: mappedData.inquiry_date || null,
              confidence: mappedData.confidence || null,
              next_call_date: mappedData.next_call_date || null,
              contract_year_month: mappedData.contract_year_month || null,
              competitor_name: mappedData.competitor_name || null,
              competitor_name_and_reason: mappedData.competitor_name_and_reason || null,
              exclusive_other_decision_factor: mappedData.exclusive_other_decision_factor || null,
            })
            .eq('id', seller.id);

          if (updateError) {
            console.error(`❌ ${sellerNumber} の更新エラー:`, updateError.message);
            errors++;
          } else {
            updated++;
            if (updated % 100 === 0) {
              console.log(`  ${updated} 件更新しました...`);
            }
            
            // 最初の10件は詳細を表示
            if (updated <= 10) {
              console.log(`  ${sellerNumber}: 更新しました`);
              if (seller.status !== mappedData.status) {
                console.log(`    状況（当社）: "${seller.status}" → "${mappedData.status}"`);
              }
            }
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ 行の処理エラー:`, error);
        errors++;
      }
    }

    console.log('\n✅ 修正完了！');
    console.log(`📊 サマリー:`);
    console.log(`  - 更新: ${updated} 件`);
    console.log(`  - スキップ: ${skipped} 件`);
    console.log(`  - エラー: ${errors} 件`);

    // 修正後の確認
    console.log('\n🔍 修正後の確認...\n');
    
    const { data: exclusiveSellers } = await supabase
      .from('sellers')
      .select('seller_number, status, inquiry_site, inquiry_date, confidence, next_call_date')
      .ilike('status', '%専任媒介%')
      .limit(5);

    if (exclusiveSellers && exclusiveSellers.length > 0) {
      console.log('「専任媒介」を含む売主（最初の5件）:');
      exclusiveSellers.forEach(seller => {
        console.log(`  ${seller.seller_number}:`);
        console.log(`    状況（当社）: "${seller.status}"`);
        console.log(`    サイト: "${seller.inquiry_site}"`);
        console.log(`    反響日付: "${seller.inquiry_date}"`);
        console.log(`    確度: "${seller.confidence}"`);
        console.log(`    次電日: "${seller.next_call_date}"`);
      });
    } else {
      console.log('「専任媒介」を含む売主が見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ 修正失敗:', error);
    throw error;
  }
}

fixStatusFromSheet().catch(console.error);
