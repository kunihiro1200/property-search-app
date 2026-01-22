import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkNovember2025CompetitorLossUnvisited() {
  console.log('=== 2025年11月 他決（未訪問）の詳細確認 ===\n');

  try {
    // Use UTC dates
    const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString(); // November 1st UTC
    const endDate = new Date(Date.UTC(2025, 11, 0, 23, 59, 59, 999)).toISOString(); // November 30th UTC
    
    console.log(`Date range (UTC):`);
    console.log(`  Start: ${startDate}`);
    console.log(`  End: ${endDate}\n`);
    
    // 条件:
    // 1. contract_year_month が2025年11月
    // 2. status に "他決" を含む
    // 3. visit_assignee が空欄（null または空文字列）
    const { data, error } = await supabase
      .from('sellers')
      .select('id, seller_number, name, contract_year_month, status, visit_assignee, confidence')
      .gte('contract_year_month', startDate)
      .lte('contract_year_month', endDate)
      .like('status', '%他決%')
      .or('visit_assignee.is.null,visit_assignee.eq.')
      .order('contract_year_month', { ascending: true });

    if (error) {
      console.error('エラー:', error);
      throw error;
    }

    console.log(`他決（未訪問）のレコード: ${data?.length || 0}件\n`);
    
    if (data && data.length > 0) {
      console.log('すべてのレコード:');
      console.log('─'.repeat(120));
      console.log('No. | 売主番号 | 契約年月 | 状況 | 営担 | 確度');
      console.log('─'.repeat(120));
      
      data.forEach((row, index) => {
        const contractDate = row.contract_year_month ? new Date(row.contract_year_month).toISOString().split('T')[0] : 'null';
        console.log(
          `${(index + 1).toString().padStart(3)} | ` +
          `${(row.seller_number || 'null').padEnd(10)} | ` +
          `${contractDate.padEnd(10)} | ` +
          `${(row.status || 'null').padEnd(20)} | ` +
          `${(row.visit_assignee || 'null').padEnd(4)} | ` +
          `${(row.confidence || 'null').padEnd(4)}`
        );
      });
      console.log('─'.repeat(120));

      // 確度別の集計
      console.log('\n確度別の件数:');
      const confidenceCount = new Map<string, number>();
      data.forEach(row => {
        const conf = row.confidence || 'null';
        confidenceCount.set(conf, (confidenceCount.get(conf) || 0) + 1);
      });
      
      Array.from(confidenceCount.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([confidence, count]) => {
          console.log(`  ${confidence}: ${count}件`);
        });

      // 状況別の集計
      console.log('\n状況別の件数:');
      const statusCount = new Map<string, number>();
      data.forEach(row => {
        const stat = row.status || 'null';
        statusCount.set(stat, (statusCount.get(stat) || 0) + 1);
      });
      
      Array.from(statusCount.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          console.log(`  ${status}: ${count}件`);
        });

      // 期待値との比較
      console.log('\n期待値との比較:');
      console.log(`  実際の件数: ${data.length}件`);
      console.log(`  期待値: 6件`);
      console.log(`  差分: ${data.length - 6}件`);
      
      if (data.length === 6) {
        console.log('  ✅ 期待値と一致');
      } else {
        console.log(`  ⚠️ ${Math.abs(data.length - 6)}件の差異`);
      }
    }

    // 現在のサービスの実装（inquiry_date使用）での結果も確認
    console.log('\n\n=== 現在の実装（inquiry_date使用）での結果 ===\n');
    
    const { count: currentCount, error: currentError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .gte('inquiry_date', startDate)
      .lte('inquiry_date', endDate)
      .or('visit_assignee.is.null,visit_assignee.eq.')
      .in('status', ['他決→追客', '他決→追客不要']);

    if (currentError) {
      console.error('エラー:', currentError);
    } else {
      console.log(`現在の実装での件数: ${currentCount}件`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkNovember2025CompetitorLossUnvisited();
