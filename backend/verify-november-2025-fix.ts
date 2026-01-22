import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyFix() {
  console.log('=== 2025年11月の修正を検証 ===\n');

  try {
    // Use UTC dates like the fixed service
    const startDate = new Date(Date.UTC(2025, 10, 1)).toISOString(); // November 1st UTC
    const endDate = new Date(Date.UTC(2025, 11, 0, 23, 59, 59, 999)).toISOString(); // November 30th UTC
    
    console.log(`Date range (UTC):`);
    console.log(`  Start: ${startDate}`);
    console.log(`  End: ${endDate}\n`);
    
    // 営担が"I"で2025年11月のvisit_dateを持つレコードを取得
    const { data, error } = await supabase
      .from('sellers')
      .select('id, seller_number, visit_date, visit_assignee')
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
      data.forEach((row, index) => {
        const visitDate = row.visit_date ? new Date(row.visit_date).toISOString().split('T')[0] : 'null';
        console.log(`  ${(index + 1).toString().padStart(2)}: ${row.seller_number} - ${visitDate}`);
      });

      console.log(`\n期待値: 12件`);
      console.log(`実際: ${data.length}件`);
      
      if (data.length === 12) {
        console.log('✅ 修正成功！期待値と一致しました。');
      } else {
        console.log(`⚠️ まだ差異があります: ${data.length - 12}件`);
      }
      
      // Check if October 31st record is excluded
      const hasOctober31 = data.some(row => {
        const date = new Date(row.visit_date!);
        return date.getUTCMonth() === 9 && date.getUTCDate() === 31; // October = month 9
      });
      
      if (hasOctober31) {
        console.log('⚠️ 10月31日のレコードがまだ含まれています');
      } else {
        console.log('✅ 10月31日のレコードは正しく除外されています');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

verifyFix();
