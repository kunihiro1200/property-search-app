import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testFailedInquiry() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== failed状態の問合せをpendingに戻してテスト ===\n');

  // failed状態の問合せを取得
  const { data: failedInquiries } = await supabase
    .from('property_inquiries')
    .select('*')
    .eq('sheet_sync_status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!failedInquiries || failedInquiries.length === 0) {
    console.log('failed状態の問合せがありません');
    return;
  }

  const inquiry = failedInquiries[0];
  console.log('ID:', inquiry.id);
  console.log('名前:', inquiry.name);
  console.log('物件番号:', inquiry.property_number);
  console.log('再試行回数:', inquiry.sync_retry_count);
  console.log('');

  // pendingに戻す
  console.log('pendingに戻します...');
  await supabase
    .from('property_inquiries')
    .update({ sheet_sync_status: 'pending' })
    .eq('id', inquiry.id);

  console.log('✅ pendingに戻しました');
  console.log('');
  console.log('次に、Cron Jobエンドポイントを呼び出してください:');
  console.log('npx ts-node test-cron-endpoint.ts');
}

testFailedInquiry().catch(console.error);
