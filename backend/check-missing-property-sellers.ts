/**
 * 物件レコードが存在しない売主を確認し、修正するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMissingPropertySellers() {
  console.log('=== 物件レコードが存在しない売主の確認 ===\n');

  // 1. DBから全売主を取得
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, seller_number');

  if (sellersError || !sellers) {
    console.error('売主取得エラー:', sellersError?.message);
    return;
  }
  console.log(`DB売主数: ${sellers.length}`);

  // 2. 全物件を取得
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('seller_id');

  if (propsError) {
    console.error('物件取得エラー:', propsError.message);
    return;
  }
  console.log(`DB物件数: ${properties?.length || 0}`);

  // 物件が存在する売主IDのセット
  const sellersWithProperty = new Set(properties?.map(p => p.seller_id) || []);

  // 3. 物件が存在しない売主を特定
  const sellersWithoutProperty = sellers.filter(s => !sellersWithProperty.has(s.id));
  console.log(`\n物件レコードが存在しない売主: ${sellersWithoutProperty.length}件`);

  if (sellersWithoutProperty.length > 0) {
    console.log('\n売主番号一覧:');
    sellersWithoutProperty.forEach(s => {
      console.log(`  - ${s.seller_number} (ID: ${s.id})`);
    });
  }

  return sellersWithoutProperty;
}

checkMissingPropertySellers().catch(console.error);
