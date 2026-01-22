import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVisitData() {
  console.log('=== データベースの訪問予約データを確認 ===\n');

  try {
    // 訪問日が設定されているデータを取得
    const { data: sellersWithVisit, error } = await supabase
      .from('sellers')
      .select('id, seller_number, name, appointment_date, visit_date, visit_time, visit_assignee, visit_valuation_acquirer, assigned_to')
      .not('appointment_date', 'is', null)
      .limit(5);

    if (error) {
      console.error('エラー:', error);
      return;
    }

    console.log(`訪問予約がある売主: ${sellersWithVisit?.length || 0}件\n`);

    if (sellersWithVisit && sellersWithVisit.length > 0) {
      sellersWithVisit.forEach((seller, index) => {
        console.log(`${index + 1}. 売主番号: ${seller.seller_number}`);
        console.log(`   名前: ${seller.name}`);
        console.log(`   appointment_date: ${seller.appointment_date}`);
        console.log(`   visit_date: ${seller.visit_date}`);
        console.log(`   visit_time: ${seller.visit_time}`);
        console.log(`   visit_assignee: ${seller.visit_assignee}`);
        console.log(`   visit_valuation_acquirer: ${seller.visit_valuation_acquirer}`);
        console.log(`   assigned_to: ${seller.assigned_to}`);
        console.log('');
      });
    }

    // visit_dateとvisit_timeの列が存在するか確認
    console.log('=== テーブル構造を確認 ===');
    const { data: columns, error: columnsError } = await supabase
      .from('sellers')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('エラー:', columnsError);
      return;
    }

    if (columns && columns.length > 0) {
      const columnNames = Object.keys(columns[0]);
      console.log('\n訪問関連の列:');
      const visitColumns = columnNames.filter(col => 
        col.includes('visit') || col.includes('appointment') || col.includes('assigned')
      );
      visitColumns.forEach(col => {
        console.log(`- ${col}`);
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkVisitData()
  .then(() => {
    console.log('\n=== 確認完了 ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
