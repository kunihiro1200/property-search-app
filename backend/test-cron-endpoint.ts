import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testCronEndpoint() {
  console.log('=== Cron Jobエンドポイントをテスト ===\n');

  // まず、pending状態の問合せを作成
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 最新の問合せをpendingに戻す
  const { data: latestInquiry } = await supabase
    .from('property_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latestInquiry) {
    console.log('最新の問合せをpendingに戻します...');
    console.log('ID:', latestInquiry.id);
    console.log('名前:', latestInquiry.name);
    
    await supabase
      .from('property_inquiries')
      .update({ 
        sheet_sync_status: 'pending',
        buyer_number: null
      })
      .eq('id', latestInquiry.id);
    
    console.log('✅ pendingに戻しました\n');
  }

  // Cron Jobエンドポイントを呼び出す
  console.log('Cron Jobエンドポイントを呼び出します...');
  console.log('URL: http://localhost:3000/api/cron/sync-inquiries');
  console.log('Authorization: Bearer', process.env.CRON_SECRET);
  console.log('');

  try {
    const response = await axios.get('http://localhost:3000/api/cron/sync-inquiries', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    console.log('✅ レスポンス:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error('❌ エラー:');
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('データ:', error.response.data);
    } else {
      console.error(error.message);
    }
  }

  // 結果を確認
  console.log('\n=== 結果を確認 ===\n');
  
  if (latestInquiry) {
    const { data: updatedInquiry } = await supabase
      .from('property_inquiries')
      .select('*')
      .eq('id', latestInquiry.id)
      .single();

    if (updatedInquiry) {
      console.log('ID:', updatedInquiry.id);
      console.log('名前:', updatedInquiry.name);
      console.log('同期状態:', updatedInquiry.sheet_sync_status);
      console.log('買主番号:', updatedInquiry.buyer_number || '(未設定)');
      console.log('再試行回数:', updatedInquiry.sync_retry_count || 0);
    }
  }
}

testCronEndpoint().catch(console.error);
