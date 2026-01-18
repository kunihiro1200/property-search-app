import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function fixAA13424VisitAssignee() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔧 AA13424の営担（visit_assignee）を修正中...\n');

  // 現在の値を確認
  const { data: before } = await supabase
    .from('sellers')
    .select('seller_number, visit_assignee')
    .eq('seller_number', 'AA13424')
    .single();

  console.log('修正前:', before);

  // 正しい値に更新（スプレッドシートの値: I）
  const { data: after, error } = await supabase
    .from('sellers')
    .update({ visit_assignee: 'I' })
    .eq('seller_number', 'AA13424')
    .select('seller_number, visit_assignee')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('修正後:', after);
  console.log('\n✅ 修正完了');
}

fixAA13424VisitAssignee();
