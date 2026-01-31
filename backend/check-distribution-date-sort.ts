/**
 * 公開物件サイトの公開日ソート順を確認するスクリプト
 * distribution_dateがnullの物件が最後に来ているか確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 複数の.envファイルを試す
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  console.log('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDistributionDateSort() {
  console.log('=== 公開日ソート順の確認 ===\n');

  // 公開中の物件を公開日順で取得（現在のソートロジックと同じ）
  const { data: properties, error, count } = await supabase
    .from('property_listings')
    .select('property_number, distribution_date, atbb_status', { count: 'exact' })
    .order('distribution_date', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`取得件数: ${properties?.length} / 総件数: ${count}\n`);

  // 最初の20件を表示
  console.log('=== 最初の20件（最新順のはず） ===');
  properties?.slice(0, 20).forEach((p, i) => {
    console.log(`${i + 1}. ${p.property_number}: 公開日=${p.distribution_date || 'NULL'}, ステータス=${p.atbb_status}`);
  });

  // 最後の20件を表示
  console.log('\n=== 最後の20件（nullが来るはず） ===');
  properties?.slice(-20).forEach((p, i) => {
    const idx = (properties?.length || 0) - 20 + i + 1;
    console.log(`${idx}. ${p.property_number}: 公開日=${p.distribution_date || 'NULL'}, ステータス=${p.atbb_status}`);
  });

  // nullの件数を確認
  const nullCount = properties?.filter(p => !p.distribution_date).length || 0;
  const nonNullCount = (properties?.length || 0) - nullCount;
  console.log(`\n=== 統計 ===`);
  console.log(`公開日あり: ${nonNullCount}件`);
  console.log(`公開日なし(null): ${nullCount}件`);

  // nullが最初に来ているか確認
  const firstNullIndex = properties?.findIndex(p => !p.distribution_date);
  if (firstNullIndex !== undefined && firstNullIndex >= 0) {
    console.log(`\n最初のnullの位置: ${firstNullIndex + 1}番目`);
    if (firstNullIndex < nonNullCount) {
      console.log('⚠️ 警告: nullが公開日ありの物件より前に来ています！');
    } else {
      console.log('✅ OK: nullは公開日ありの物件の後に来ています');
    }
  } else {
    console.log('\n✅ nullの物件はありません');
  }

  // 全件でnullの位置を確認
  console.log('\n=== 全件でのnull位置確認 ===');
  const { data: allProperties, error: allError } = await supabase
    .from('property_listings')
    .select('property_number, distribution_date')
    .order('distribution_date', { ascending: false, nullsFirst: false });

  if (allError) {
    console.error('Error:', allError);
    return;
  }

  const allNullCount = allProperties?.filter(p => !p.distribution_date).length || 0;
  const allNonNullCount = (allProperties?.length || 0) - allNullCount;
  console.log(`総件数: ${allProperties?.length}`);
  console.log(`公開日あり: ${allNonNullCount}件`);
  console.log(`公開日なし(null): ${allNullCount}件`);

  // nullが最初に来ているか確認
  const allFirstNullIndex = allProperties?.findIndex(p => !p.distribution_date);
  if (allFirstNullIndex !== undefined && allFirstNullIndex >= 0) {
    console.log(`最初のnullの位置: ${allFirstNullIndex + 1}番目`);
    
    // nullより前に公開日ありの物件があるか確認
    const propertiesBeforeNull = allProperties?.slice(0, allFirstNullIndex);
    const hasNonNullBeforeNull = propertiesBeforeNull?.some(p => p.distribution_date);
    
    if (allFirstNullIndex < allNonNullCount) {
      console.log('⚠️ 警告: nullが公開日ありの物件より前に来ています！');
      
      // 問題のある物件を表示
      console.log('\n=== nullより後にある公開日ありの物件（問題） ===');
      allProperties?.slice(allFirstNullIndex).filter(p => p.distribution_date).slice(0, 10).forEach((p, i) => {
        console.log(`${i + 1}. ${p.property_number}: 公開日=${p.distribution_date}`);
      });
    } else {
      console.log('✅ OK: nullは公開日ありの物件の後に来ています');
    }
  }
}

checkDistributionDateSort().catch(console.error);
