import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkLatestInquiry() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== 最新の問合せを確認 ===\n');

  // 最新の問合せを取得
  const { data: inquiries, error } = await supabase
    .from('property_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!inquiries || inquiries.length === 0) {
    console.log('問合せが見つかりません');
    return;
  }

  console.log(`最新の${inquiries.length}件の問合せ:\n`);

  for (const inquiry of inquiries) {
    const createdAtUtc = new Date(inquiry.created_at);
    const createdAtJst = new Date(createdAtUtc.getTime() + 9 * 60 * 60 * 1000);
    
    console.log('---');
    console.log('ID:', inquiry.id);
    console.log('名前:', inquiry.name);
    console.log('物件番号:', inquiry.property_number || '(なし)');
    console.log('作成日時 (UTC):', createdAtUtc.toISOString());
    console.log('作成日時 (JST):', createdAtJst.toISOString().replace('T', ' ').substring(0, 19));
    console.log('同期状態:', inquiry.sheet_sync_status);
    console.log('買主番号:', inquiry.buyer_number || '(未設定)');
    console.log('再試行回数:', inquiry.sync_retry_count || 0);
    console.log('');
  }

  // pending状態の問合せを確認
  const { data: pendingInquiries } = await supabase
    .from('property_inquiries')
    .select('*')
    .eq('sheet_sync_status', 'pending')
    .order('created_at', { ascending: true });

  console.log('\n=== pending状態の問合せ ===');
  console.log(`件数: ${pendingInquiries?.length || 0}`);
  
  if (pendingInquiries && pendingInquiries.length > 0) {
    console.log('\n詳細:');
    for (const inquiry of pendingInquiries) {
      const createdAtUtc = new Date(inquiry.created_at);
      const createdAtJst = new Date(createdAtUtc.getTime() + 9 * 60 * 60 * 1000);
      console.log(`- ${inquiry.name} (作成: ${createdAtJst.toISOString().replace('T', ' ').substring(0, 19)} JST)`);
    }
  }
}

checkLatestInquiry().catch(console.error);
