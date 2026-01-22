import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAA12903VisitData() {
  console.log('=== AA12903の訪問データを確認 ===\n');

  try {
    // データベースから直接取得
    const { data, error } = await supabase
      .from('sellers')
      .select('id, seller_number, name, appointment_date, visit_date, visit_time, visit_assignee, visit_valuation_acquirer, valuation_assignee, phone_assignee, assigned_to')
      .eq('seller_number', 'AA12903')
      .single();

    if (error) {
      console.log('❌ エラー:', error.message);
      return;
    }

    if (!data) {
      console.log('❌ AA12903が見つかりませんでした');
      return;
    }

    console.log('=== データベースの生データ ===');
    console.log('ID:', data.id);
    console.log('売主番号:', data.seller_number);
    console.log('名前 (暗号化):', data.name ? `${data.name.substring(0, 20)}...` : 'null');
    console.log('appointment_date:', data.appointment_date);
    console.log('visit_date:', data.visit_date);
    console.log('visit_time:', data.visit_time);
    console.log('visit_assignee:', data.visit_assignee);
    console.log('visit_valuation_acquirer:', data.visit_valuation_acquirer);
    console.log('valuation_assignee:', data.valuation_assignee);
    console.log('phone_assignee:', data.phone_assignee);
    console.log('assigned_to:', data.assigned_to);

    console.log('\n=== 訪問フィールドの状態 ===');
    const hasVisitDate = !!data.visit_date;
    const hasVisitTime = !!data.visit_time;
    const hasVisitAssignee = !!data.visit_assignee;
    const hasVisitValuationAcquirer = !!data.visit_valuation_acquirer;

    console.log('visit_date 存在:', hasVisitDate ? '✓' : '✗');
    console.log('visit_time 存在:', hasVisitTime ? '✓' : '✗');
    console.log('visit_assignee 存在:', hasVisitAssignee ? '✓' : '✗');
    console.log('visit_valuation_acquirer 存在:', hasVisitValuationAcquirer ? '✓' : '✗');

    if (hasVisitDate && hasVisitTime && hasVisitAssignee && hasVisitValuationAcquirer) {
      console.log('\n✅ すべての訪問フィールドが正しく設定されています');
    } else {
      console.log('\n⚠️  一部の訪問フィールドが空です');
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

verifyAA12903VisitData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
