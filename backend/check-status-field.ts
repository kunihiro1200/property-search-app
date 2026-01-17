import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStatusField() {
  console.log('🔍 状況（当社）フィールドの値を確認中...\n');

  // 最近更新された売主を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('売主データが見つかりません');
    return;
  }

  console.log('最近更新された売主の状況（当社）フィールド:\n');
  sellers.forEach((seller) => {
    console.log(`売主番号: ${seller.seller_number}`);
    console.log(`名前: ${seller.name}`);
    console.log(`状況（当社）: "${seller.status}"`);
    console.log('---');
  });

  // 「専任媒介」を含む売主を検索
  const { data: exclusiveSellers, error: exclusiveError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status')
    .ilike('status', '%専任媒介%')
    .limit(5);

  if (!exclusiveError && exclusiveSellers && exclusiveSellers.length > 0) {
    console.log('\n「専任媒介」を含む売主:\n');
    exclusiveSellers.forEach((seller) => {
      console.log(`売主番号: ${seller.seller_number}`);
      console.log(`名前: ${seller.name}`);
      console.log(`状況（当社）: "${seller.status}"`);
      console.log('---');
    });
  }

  // 「追客中」を含む売主を検索
  const { data: followUpSellers, error: followUpError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status')
    .ilike('status', '%追客中%')
    .limit(5);

  if (!followUpError && followUpSellers && followUpSellers.length > 0) {
    console.log('\n「追客中」を含む売主:\n');
    followUpSellers.forEach((seller) => {
      console.log(`売主番号: ${seller.seller_number}`);
      console.log(`名前: ${seller.name}`);
      console.log(`状況（当社）: "${seller.status}"`);
      console.log('---');
    });
  }
}

checkStatusField().catch(console.error);
