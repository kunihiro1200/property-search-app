import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkNovember2025AssigneeI() {
  console.log('=== 2025年11月 営担"I"の詳細確認 ===\n');

  try {
    const startDate = new Date(2025, 10, 1).toISOString(); // 11月 = month 10
    const endDate = new Date(2025, 10, 30, 23, 59, 59).toISOString();
    
    // 営担が"I"で2025年11月のvisit_dateを持つレコードを取得
    const { data, error } = await supabase
      .from('sellers')
      .select('id, seller_number, name, visit_date, visit_assignee, status, confidence, created_at')
      .eq('visit_assignee', 'I')
      .gte('visit_date', startDate)
      .lte('visit_date', endDate)
      .not('confidence', 'in', '("D","ダブり")')
      .order('visit_date', { ascending: true });

    if (error) {
      console.error('エラー:', error);
      throw error;
    }

    console.log(`営担"I"で2025年11月のレコード: ${data?.length || 0}件\n`);
    
    if (data && data.length > 0) {
      console.log('すべてのレコード:');
      console.log('─'.repeat(120));
      console.log('No. | 売主番号 | 訪問日 | 営担 | 状況 | 確度 | ID | 作成日時');
      console.log('─'.repeat(120));
      
      data.forEach((row, index) => {
        const visitDate = row.visit_date ? new Date(row.visit_date).toISOString().split('T')[0] : 'null';
        const createdAt = row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'null';
        console.log(
          `${(index + 1).toString().padStart(3)} | ` +
          `${(row.seller_number || 'null').padEnd(10)} | ` +
          `${visitDate.padEnd(10)} | ` +
          `${(row.visit_assignee || 'null').padEnd(4)} | ` +
          `${(row.status || 'null').padEnd(15)} | ` +
          `${(row.confidence || 'null').padEnd(4)} | ` +
          `${row.id.toString().padEnd(6)} | ` +
          `${createdAt}`
        );
      });
      console.log('─'.repeat(120));

      // 重複チェック
      const sellerNumbers = data.map(row => row.seller_number);
      const duplicates = sellerNumbers.filter((item, index) => sellerNumbers.indexOf(item) !== index);
      
      if (duplicates.length > 0) {
        console.log('\n⚠️ 重複している売主番号:');
        const uniqueDuplicates = [...new Set(duplicates)];
        uniqueDuplicates.forEach(sellerNumber => {
          const duplicateRecords = data.filter(row => row.seller_number === sellerNumber);
          console.log(`\n  ${sellerNumber} (${duplicateRecords.length}件):`);
          duplicateRecords.forEach(row => {
            console.log(`    ID: ${row.id}, visit_date: ${row.visit_date}, created_at: ${row.created_at}`);
          });
        });
      } else {
        console.log('\n✅ 重複なし');
      }

      // 訪問日ごとの集計
      console.log('\n訪問日ごとの件数:');
      const dateCount = new Map<string, number>();
      data.forEach(row => {
        const date = row.visit_date ? new Date(row.visit_date).toISOString().split('T')[0] : 'null';
        dateCount.set(date, (dateCount.get(date) || 0) + 1);
      });
      
      Array.from(dateCount.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count}件`);
        });

      // 期待値との比較
      console.log('\n期待値との比較:');
      console.log(`  実際の件数: ${data.length}件`);
      console.log(`  期待値: 12件`);
      console.log(`  差分: ${data.length - 12}件`);
      
      if (data.length === 12) {
        console.log('  ✅ 期待値と一致');
      } else if (data.length === 13) {
        console.log('  ⚠️ 1件多い - 重複または余分なデータの可能性');
      } else {
        console.log(`  ⚠️ ${Math.abs(data.length - 12)}件の差異`);
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

checkNovember2025AssigneeI();
