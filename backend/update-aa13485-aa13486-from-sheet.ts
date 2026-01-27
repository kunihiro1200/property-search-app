/**
 * AA13485とAA13486をスプレッドシートから再同期
 */
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import { ColumnMapper } from './src/services/ColumnMapper';

// 環境変数を読み込む
dotenv.config({ path: '.env.local' });

async function updateSellersFromSheet() {
  try {
    console.log('🔄 Updating AA13485 and AA13486 from spreadsheet...\n');

    // Supabase設定
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Google Sheets設定
    const spreadsheetId = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';
    const sheetName = '売主リスト';
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ Google Sheets authenticated\n');

    // ColumnMapperを初期化
    const columnMapper = new ColumnMapper();

    // スプレッドシートから全行を取得
    const allRows = await sheetsClient.readAll();
    console.log(`📊 Total rows in spreadsheet: ${allRows.length}\n`);

    // AA13485とAA13486を検索
    const targetSellers = ['AA13485', 'AA13486'];
    
    for (const sellerNumber of targetSellers) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Processing: ${sellerNumber}`);
      console.log('='.repeat(80));

      // スプレッドシートから売主データを取得
      const row = allRows.find((r: any) => r['売主番号'] === sellerNumber);
      
      if (!row) {
        console.log(`❌ ${sellerNumber} not found in spreadsheet`);
        continue;
      }

      console.log('📋 Spreadsheet data:');
      console.log(`  Pinrich: ${row['Pinrich'] || '（空）'}`);
      console.log(`  不通: ${row['不通'] || '（空）'}`);
      console.log(`  状況（当社）: ${row['状況（当社）'] || '（空）'}`);
      console.log(`  次電日: ${row['次電日'] || '（空）'}`);
      console.log(`  訪問日 Y/M/D: ${row['訪問日 Y/M/D'] || '（空）'}`);
      console.log(`  電話担当（任意）: ${row['電話担当（任意）'] || '（空）'}`);

      // カラムマッピングを適用
      const mappedData = columnMapper.mapToDatabase(row);

      // is_unreachableをbooleanに変換
      // スプレッドシートの「不通」カラムの値:
      // - 空欄 → false
      // - 「通電OK」 → false
      // - その他の値（例: 「不通」） → true
      let isUnreachable: boolean | null = null;
      const notReachableValue = row['不通'];
      if (!notReachableValue || notReachableValue.trim() === '' || notReachableValue === '通電OK') {
        isUnreachable = false;
      } else {
        isUnreachable = true;
      }

      // 更新データを準備
      const updateData: any = {
        pinrich_status: mappedData.pinrich_status || null,
        is_unreachable: isUnreachable,
        status: mappedData.status || null,
        next_call_date: mappedData.next_call_date || null,
        phone_assignee: mappedData.phone_assignee || null,
        updated_at: new Date().toISOString(),
      };

      // 訪問日をフォーマット
      const visitDate = row['訪問日 Y/M/D'];
      if (visitDate) {
        const str = String(visitDate).trim();
        // YYYY/MM/DD 形式の場合
        if (str.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
          const [year, month, day] = str.split('/');
          updateData.visit_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      console.log('\n📝 Update data:');
      console.log(JSON.stringify(updateData, null, 2));

      // データベースを更新
      const { data, error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('seller_number', sellerNumber)
        .select();

      if (error) {
        console.error(`❌ Error updating ${sellerNumber}:`, error.message);
        continue;
      }

      console.log(`✅ ${sellerNumber} updated successfully`);
      
      // 更新後のデータを確認
      const { data: updatedSeller } = await supabase
        .from('sellers')
        .select('seller_number, pinrich_status, is_unreachable, status, next_call_date, visit_date, phone_assignee')
        .eq('seller_number', sellerNumber)
        .single();

      if (updatedSeller) {
        console.log('\n📊 Updated database data:');
        console.log(`  Pinrich: ${updatedSeller.pinrich_status || '（空）'}`);
        console.log(`  不通: ${updatedSeller.is_unreachable || '（空）'}`);
        console.log(`  状況: ${updatedSeller.status || '（空）'}`);
        console.log(`  次電日: ${updatedSeller.next_call_date || '（空）'}`);
        console.log(`  訪問日: ${updatedSeller.visit_date || '（空）'}`);
        console.log(`  電話担当: ${updatedSeller.phone_assignee || '（空）'}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Update completed');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateSellersFromSheet();
