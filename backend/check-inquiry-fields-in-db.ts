import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInquiryFields() {
  console.log('🔍 データベースの inquiry_year と inquiry_site を確認します...\n');

  // 最新の10件を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_year, inquiry_site')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('📊 最新10件の売主データ:\n');
  sellers?.forEach((seller) => {
    console.log(`${seller.seller_number}:`);
    console.log(`  inquiry_year: ${seller.inquiry_year || '(null)'}`);
    console.log(`  inquiry_site: ${seller.inquiry_site || '(null)'}`);
    console.log('');
  });
}

checkInquiryFields()
  .then(() => {
    console.log('✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
