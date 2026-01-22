/**
 * CC5物件の詳細確認
 * 
 * データベースに存在するか、削除されているか、など詳細を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔍 CC5物件の詳細確認...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. CC5を検索（削除済みも含む）
  console.log('📊 Step 1: CC5をデータベースで検索（削除済みも含む）');
  const { data: allCC5, error: allError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'CC5');

  if (allError) {
    console.log('❌ エラー:', allError.message);
    return;
  }

  if (!allCC5 || allCC5.length === 0) {
    console.log('❌ CC5は見つかりませんでした');
    console.log('   → データベースに存在しません');
  } else {
    console.log(`✅ CC5が${allCC5.length}件見つかりました\n`);
    
    allCC5.forEach((property, index) => {
      console.log(`--- CC5 #${index + 1} ---`);
      console.log('   ID:', property.id);
      console.log('   物件番号:', property.property_number);
      console.log('   所在地:', property.address || '(なし)');
      console.log('   種別:', property.property_type || '(なし)');
      console.log('   売買価格:', property.sales_price || property.price || '(なし)');
      console.log('   ATBB状況:', property.atbb_status || '(なし)');
      console.log('   削除日時:', property.deleted_at || '(削除されていない)');
      console.log('   作成日時:', property.created_at);
      console.log('   更新日時:', property.updated_at);
      console.log('');
    });
  }

  // 2. CCで始まる物件を検索
  console.log('📊 Step 2: CCで始まる物件を検索');
  const { data: ccProperties, error: ccError } = await supabase
    .from('property_listings')
    .select('property_number, address, created_at, deleted_at')
    .ilike('property_number', 'CC%')
    .order('property_number', { ascending: true });

  if (ccError) {
    console.log('❌ エラー:', ccError.message);
  } else if (!ccProperties || ccProperties.length === 0) {
    console.log('❌ CCで始まる物件は見つかりませんでした');
  } else {
    console.log(`✅ CCで始まる物件が${ccProperties.length}件見つかりました`);
    console.log('\n最初の10件:');
    ccProperties.slice(0, 10).forEach(p => {
      const status = p.deleted_at ? '(削除済み)' : '';
      console.log(`   ${p.property_number} - ${p.address || '(なし)'} ${status}`);
    });
  }

  // 3. 物件番号の形式を確認
  console.log('\n📊 Step 3: 物件番号の形式を確認');
  const { data: sampleProperties, error: sampleError } = await supabase
    .from('property_listings')
    .select('property_number')
    .limit(20);

  if (!sampleError && sampleProperties) {
    console.log('データベースの物件番号サンプル:');
    sampleProperties.forEach(p => {
      console.log(`   ${p.property_number}`);
    });
  }

  console.log('\n✅ 確認完了');
}

main().catch(console.error);
