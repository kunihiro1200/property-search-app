import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSyncStatus() {
  console.log('🔍 同期状態を確認中...\n');

  // 最新の売主データを取得
  const { data: recentSellers, error } = await supabase
    .from('sellers')
    .select('seller_number, name, inquiry_date, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('📊 最新の売主データ（更新日時順）:');
  console.log('売主番号 | 名前 | 問い合わせ日 | ステータス | 更新日時');
  console.log('-'.repeat(80));
  
  recentSellers?.forEach(seller => {
    console.log(
      `${seller.seller_number} | ${seller.name || '(未設定)'} | ${seller.inquiry_date || '(未設定)'} | ${seller.status || '(未設定)'} | ${seller.updated_at}`
    );
  });

  // 統計情報
  const { count: totalCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  const { count: todayCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', new Date().toISOString().split('T')[0]);

  console.log('\n📈 統計情報:');
  console.log(`総売主数: ${totalCount}`);
  console.log(`本日更新された売主数: ${todayCount}`);

  // 問い合わせ日が未設定の売主
  const { count: noInquiryDate } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('inquiry_date', null);

  console.log(`問い合わせ日が未設定: ${noInquiryDate}`);

  // ステータスが未設定の売主
  const { count: noStatus } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('status', null);

  console.log(`ステータスが未設定: ${noStatus}`);
}

checkSyncStatus().then(() => {
  console.log('\n✅ 確認完了');
  process.exit(0);
}).catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
