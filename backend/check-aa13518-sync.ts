import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: './backend/.env.local' });
dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA13518() {
  console.log('=== AA13518の同期状態確認 ===\n');

  // データベースで確認
  const { data, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status, inquiry_date, created_at')
    .eq('seller_number', 'AA13518')
    .single();

  if (error) {
    console.log('❌ AA13518はデータベースに存在しません');
    console.log('エラー:', error.message);
  } else {
    console.log('✅ AA13518はデータベースに存在します');
    console.log('データ:', data);
  }

  // 最新の売主番号を確認
  console.log('\n=== 最新の売主番号確認 ===');
  const { data: latestSellers, error: latestError } = await supabase
    .from('sellers')
    .select('seller_number, name, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (latestError) {
    console.error('エラー:', latestError);
  } else {
    console.log('最新10件の売主:');
    latestSellers?.forEach(s => {
      console.log(`  ${s.seller_number}: ${s.name} (${s.created_at})`);
    });
  }

  // AA13510以降の売主を確認
  console.log('\n=== AA13510以降の売主確認 ===');
  const { data: recentSellers, error: recentError } = await supabase
    .from('sellers')
    .select('seller_number, name, created_at')
    .gte('seller_number', 'AA13510')
    .order('seller_number', { ascending: true });

  if (recentError) {
    console.error('エラー:', recentError);
  } else {
    console.log(`AA13510以降の売主: ${recentSellers?.length}件`);
    recentSellers?.forEach(s => {
      console.log(`  ${s.seller_number}: ${s.name}`);
    });
  }
}

checkAA13518();
