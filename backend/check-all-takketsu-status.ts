import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAllTakketsuStatus() {
  console.log('=== "他決"を含むすべての状況を確認 ===\n');

  try {
    // "他決"を含むすべてのレコードを取得
    const { data, error } = await supabase
      .from('sellers')
      .select('status')
      .like('status', '%他決%')
      .not('status', 'is', null);

    if (error) {
      console.error('エラー:', error);
      throw error;
    }

    // ユニークな状況をカウント
    const statusCount = new Map<string, number>();
    data?.forEach(row => {
      if (row.status) {
        statusCount.set(row.status, (statusCount.get(row.status) || 0) + 1);
      }
    });

    console.log('すべての"他決"を含む状況:');
    console.log('─'.repeat(60));
    Array.from(statusCount.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}件`);
      });
    console.log('─'.repeat(60));
    console.log(`合計: ${data?.length || 0}件\n`);

    // 2025年11月で"他決"を含み、未訪問のレコード
    const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString();
    const endDate = new Date(Date.UTC(2025, 11, 0, 23, 59, 59, 999)).toISOString();
    
    const { data: novData, error: novError } = await supabase
      .from('sellers')
      .select('seller_number, contract_year_month, status, visit_assignee')
      .gte('contract_year_month', startDate)
      .lte('contract_year_month', endDate)
      .like('status', '%他決%')
      .or('visit_assignee.is.null,visit_assignee.eq.')
      .order('status', { ascending: true });

    if (novError) {
      console.error('エラー:', novError);
      throw novError;
    }

    console.log('\n2025年11月の"他決"（未訪問）:');
    console.log('─'.repeat(80));
    console.log('売主番号 | 契約年月 | 状況 | 営担');
    console.log('─'.repeat(80));
    
    novData?.forEach(row => {
      const contractDate = row.contract_year_month ? new Date(row.contract_year_month).toISOString().split('T')[0] : 'null';
      console.log(
        `${(row.seller_number || 'null').padEnd(10)} | ` +
        `${contractDate.padEnd(10)} | ` +
        `${(row.status || 'null').padEnd(30)} | ` +
        `${row.visit_assignee || 'null'}`
      );
    });
    console.log('─'.repeat(80));
    console.log(`合計: ${novData?.length || 0}件`);

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkAllTakketsuStatus();
