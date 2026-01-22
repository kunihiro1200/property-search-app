import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function finalVerification() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   訪問取得日フィールド修正 - 最終検証                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. スプレッドシートから確認
    console.log('📊 1. スプレッドシートのデータ確認');
    console.log('─────────────────────────────────────────────────────────');
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const rows = await sheetsClient.readAll();
    
    const columnName = '訪問取得日\n年/月/日';
    const nov2025Rows = rows.filter(row => {
      const date = row[columnName];
      if (!date) return false;
      const dateStr = String(date);
      return dateStr.includes('2025/11/') || dateStr.startsWith('11/');
    });

    console.log(`   スプレッドシート総行数: ${rows.length} 件`);
    console.log(`   2025年11月の訪問取得日: ${nov2025Rows.length} 件`);
    console.log(`   ✅ 期待値: 24件\n`);

    // 2. データベースから確認
    console.log('💾 2. データベースのデータ確認');
    console.log('─────────────────────────────────────────────────────────');
    
    const startDate = '2025-11-01';
    const endDate = '2025-11-30T23:59:59';

    const { count: dbCount, error: dbError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('visit_acquisition_date', startDate)
      .lte('visit_acquisition_date', endDate)
      .not('confidence', 'in', '("D","ダブり")');

    if (dbError) {
      console.error('   ❌ エラー:', dbError.message);
    } else {
      console.log(`   データベースの訪問取得日: ${dbCount || 0} 件`);
      console.log(`   ✅ 期待値: 24件\n`);
    }

    // 3. サービス層から確認
    console.log('⚙️  3. PerformanceMetricsService の動作確認');
    console.log('─────────────────────────────────────────────────────────');
    
    const service = new PerformanceMetricsService();
    const metrics = await service.calculateMetrics('2025-11');

    console.log(`   訪問査定取得数: ${metrics.visitAppraisalCount} 件`);
    console.log(`   訪問査定取得割合: ${metrics.visitAppraisalRate.toFixed(2)}%`);
    console.log(`   ✅ 期待値: 24件\n`);

    // 4. 最終判定
    console.log('🎯 4. 最終判定');
    console.log('─────────────────────────────────────────────────────────');
    
    const allMatch = nov2025Rows.length === 24 && 
                     dbCount === 24 && 
                     metrics.visitAppraisalCount === 24;

    if (allMatch) {
      console.log('   ✅ すべてのテストが合格しました！');
      console.log('   ✅ スプレッドシート: 24件');
      console.log('   ✅ データベース: 24件');
      console.log('   ✅ サービス層: 24件');
      console.log('\n   🎉 修正は完全に成功しています！');
    } else {
      console.log('   ⚠️  一部のテストで不一致があります:');
      console.log(`   - スプレッドシート: ${nov2025Rows.length} 件 ${nov2025Rows.length === 24 ? '✅' : '❌'}`);
      console.log(`   - データベース: ${dbCount || 0} 件 ${dbCount === 24 ? '✅' : '❌'}`);
      console.log(`   - サービス層: ${metrics.visitAppraisalCount} 件 ${metrics.visitAppraisalCount === 24 ? '✅' : '❌'}`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   検証完了                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

finalVerification();
