import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkWithConfidence() {
  console.log('=== 2025年11月 他決（未訪問）- 確度フィルターなし ===\n');

  try {
    const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString();
    const endDate = new Date(Date.UTC(2025, 11, 0, 23, 59, 59, 999)).toISOString();
    
    // 確度フィルターなしで取得
    const { data: allData, error: allError } = await supabase
      .from('sellers')
      .select('seller_number, contract_year_month, status, visit_assignee, confidence')
      .gte('contract_year_month', startDate)
      .lte('contract_year_month', endDate)
      .like('status', '%他決%')
      .or('visit_assignee.is.null,visit_assignee.eq.')
      .order('contract_year_month', { ascending: true });

    if (allError) {
      console.error('エラー:', allError);
      throw allError;
    }

    console.log(`確度フィルターなし: ${allData?.length || 0}件\n`);
    
    if (allData && allData.length > 0) {
      console.log('すべてのレコード:');
      console.log('─'.repeat(100));
      console.log('No. | 売主番号 | 契約年月 | 状況 | 営担 | 確度');
      console.log('─'.repeat(100));
      
      allData.forEach((row, index) => {
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
      console.log('─'.repeat(100));
    }

    // 確度D・ダブりを除外
    const { data: filteredData, error: filteredError } = await supabase
      .from('sellers')
      .select('seller_number, contract_year_month, status, visit_assignee, confidence')
      .gte('contract_year_month', startDate)
      .lte('contract_year_month', endDate)
      .like('status', '%他決%')
      .or('visit_assignee.is.null,visit_assignee.eq.')
      .not('confidence', 'in', '("D","ダブり")')
      .order('contract_year_month', { ascending: true });

    if (filteredError) {
      console.error('エラー:', filteredError);
      throw filteredError;
    }

    console.log(`\n確度D・ダブりを除外: ${filteredData?.length || 0}件`);
    
    console.log('\n期待値との比較:');
    console.log(`  確度フィルターなし: ${allData?.length || 0}件`);
    console.log(`  確度D・ダブり除外: ${filteredData?.length || 0}件`);
    console.log(`  期待値: 6件`);

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkWithConfidence();
