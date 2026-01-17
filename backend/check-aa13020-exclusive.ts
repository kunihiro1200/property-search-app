import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13020() {
  console.log('=== AA13020 の専任媒介データ確認 ===\n');

  try {
    // 1. スプレッドシートから確認
    console.log('1. スプレッドシートのデータ:');
    console.log('─────────────────────────────────────────────────────────');
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    const aa13020Row = rows.find(row => row['売主番号'] === 'AA13020');
    
    if (aa13020Row) {
      console.log('   売主番号: AA13020');
      console.log(`   状況（当社）: "${aa13020Row['状況（当社）']}"`);
      console.log(`   営担: "${aa13020Row['営担']}"`);
      console.log(`   訪問日 Y/M/D: "${aa13020Row['訪問日 Y/M/D']}"`);
      console.log(`   確度: "${aa13020Row['確度']}"`);
    } else {
      console.log('   ❌ AA13020 が見つかりませんでした');
    }

    // 2. データベースから確認
    console.log('\n2. データベースのデータ:');
    console.log('─────────────────────────────────────────────────────────');
    
    const { data: dbData, error: dbError } = await supabase
      .from('sellers')
      .select('seller_number, status, visit_assignee, visit_date, confidence')
      .eq('seller_number', 'AA13020')
      .single();

    if (dbError) {
      console.error('   ❌ エラー:', dbError.message);
    } else if (dbData) {
      console.log('   売主番号: AA13020');
      console.log(`   status: "${dbData.status}"`);
      console.log(`   visit_assignee: "${dbData.visit_assignee}"`);
      console.log(`   visit_date: "${dbData.visit_date}"`);
      console.log(`   confidence: "${dbData.confidence}"`);
    } else {
      console.log('   ❌ AA13020 が見つかりませんでした');
    }

    // 3. 差分の分析
    console.log('\n3. 差分の分析:');
    console.log('─────────────────────────────────────────────────────────');
    
    if (aa13020Row && dbData) {
      const issues = [];
      
      if (aa13020Row['状況（当社）'] !== dbData.status) {
        issues.push(`状況が異なる: スプシ="${aa13020Row['状況（当社）']}" vs DB="${dbData.status}"`);
      }
      
      if (aa13020Row['営担'] !== dbData.visit_assignee) {
        issues.push(`営担が異なる: スプシ="${aa13020Row['営担']}" vs DB="${dbData.visit_assignee}"`);
      }
      
      const sheetDate = aa13020Row['訪問日 Y/M/D'];
      const dbDate = dbData.visit_date;
      if (sheetDate && dbDate) {
        const sheetDateStr = new Date(sheetDate).toISOString().split('T')[0];
        const dbDateStr = dbDate.split('T')[0];
        if (sheetDateStr !== dbDateStr) {
          issues.push(`訪問日が異なる: スプシ="${sheetDateStr}" vs DB="${dbDateStr}"`);
        }
      }
      
      if (issues.length > 0) {
        console.log('   ⚠️  以下の差分が見つかりました:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('   ✅ スプレッドシートとデータベースのデータは一致しています');
      }
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

checkAA13020();
