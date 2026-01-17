import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA12679() {
  console.log('=== AA12679をスプレッドシートから同期 ===\n');

  try {
    // Google Sheets API setup
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

    // Get all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AM`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('データが見つかりません');
      return;
    }

    const sellerNumberIdx = 1; // B列
    const statusIdx = 28; // AC列（状況（当社））
    const confidenceIdx = 7; // H列（確度）
    const contractYearMonthIdx = 38; // AM列（契約年月）

    // Find AA12679
    let foundRow: any = null;
    let rowNumber = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const sellerNumber = row[sellerNumberIdx] || '';
      
      if (sellerNumber === 'AA12679') {
        foundRow = row;
        rowNumber = i + 1;
        break;
      }
    }

    if (!foundRow) {
      console.log('❌ AA12679がスプレッドシートに見つかりません');
      return;
    }

    console.log(`✅ AA12679が見つかりました（行 ${rowNumber}）\n`);

    const status = foundRow[statusIdx] || '';
    const confidence = foundRow[confidenceIdx] || '';
    const contractYearMonth = foundRow[contractYearMonthIdx] || '';

    console.log('スプレッドシートのデータ:');
    console.log(`  状況: ${status}`);
    console.log(`  確度: ${confidence}`);
    console.log(`  契約年月: ${contractYearMonth}\n`);

    // Parse contract_year_month
    let contractDate: Date | null = null;
    if (contractYearMonth) {
      const dateStr = contractYearMonth.toString().trim();
      
      // Parse as YYYY/MM/DD or YYYY-MM-DD
      const parts = dateStr.split(/[/-]/);
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // 0-indexed
        const day = parseInt(parts[2]);
        
        // Use UTC to avoid timezone shifts
        contractDate = new Date(Date.UTC(year, month, day));
        
        if (isNaN(contractDate.getTime())) {
          console.log('⚠️ 契約年月の日付パースに失敗しました');
          contractDate = null;
        }
      } else {
        console.log('⚠️ 契約年月の形式が不正です:', dateStr);
      }
    }

    // Update database
    console.log('データベースを更新中...');
    
    const updateData: any = {
      status: status || null,
      confidence: confidence || null,
      contract_year_month: contractDate ? contractDate.toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('sellers')
      .update(updateData)
      .eq('seller_number', 'AA12679')
      .select();

    if (error) {
      console.error('❌ 更新エラー:', error);
      throw error;
    }

    console.log('✅ 更新成功\n');
    console.log('更新後のデータ:');
    if (data && data.length > 0) {
      const updated = data[0];
      console.log(`  売主番号: ${updated.seller_number}`);
      console.log(`  状況: ${updated.status}`);
      console.log(`  確度: ${updated.confidence}`);
      console.log(`  契約年月: ${updated.contract_year_month}`);
      console.log(`  更新日時: ${updated.updated_at}`);
    }

    // Verify the fix
    console.log('\n=== 修正の検証 ===\n');
    
    const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString();
    const endDate = new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)).toISOString();

    const { count, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('contract_year_month', startDate)
      .lte('contract_year_month', endDate)
      .like('status', '%他決%')
      .or('visit_assignee.is.null,visit_assignee.eq.')
      .not('confidence', 'in', '("D","ダブり")');

    if (countError) {
      console.error('検証エラー:', countError);
    } else {
      console.log(`2025年11月の他決（未訪問）: ${count}件`);
      console.log(`期待値: 6件`);
      
      if (count === 6) {
        console.log('✅ 期待値と一致しました！');
      } else {
        console.log(`⚠️ まだ${6 - (count || 0)}件の差異があります`);
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

syncAA12679();
