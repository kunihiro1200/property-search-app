/**
 * 訪問予定/訪問済みの営担フィルター（visitAssignee）のテスト
 * 
 * このスクリプトは、サイドバーで訪問予定(Y)や訪問済み(生)などをクリックした時に
 * 正しくフィルタリングされるかをテストします。
 * 
 * 直接データベースをクエリしてテストします。
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 通常スタッフのイニシャルリスト
const NORMAL_STAFF_INITIALS = ['K', 'Y', 'I', '林', '生', 'U', 'R', '久', '和', 'H'];

async function testVisitAssigneeFilter() {
  console.log('=== 訪問予定/訪問済みの営担フィルターテスト ===\n');
  
  // JST今日の日付を取得
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  console.log('今日の日付（JST）:', todayJST);
  console.log('通常スタッフ:', NORMAL_STAFF_INITIALS.join(', '));
  console.log('');
  
  // 1. 訪問予定のイニシャル別カウント
  console.log('1. 訪問予定（イニシャル別）のカウント...');
  const visitScheduledByAssignee: { initial: string; count: number }[] = [];
  
  for (const initial of NORMAL_STAFF_INITIALS) {
    const { count, error } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .eq('visit_assignee', initial)
      .gte('visit_date', todayJST)
      .is('deleted_at', null);
    
    if (!error && count && count > 0) {
      visitScheduledByAssignee.push({ initial, count });
    }
  }
  
  console.log('訪問予定（イニシャル別）:');
  visitScheduledByAssignee.forEach(({ initial, count }) => {
    console.log(`  訪問予定(${initial}): ${count}件`);
  });
  console.log('');
  
  // 2. 訪問済みのイニシャル別カウント
  console.log('2. 訪問済み（イニシャル別）のカウント...');
  const visitCompletedByAssignee: { initial: string; count: number }[] = [];
  
  for (const initial of NORMAL_STAFF_INITIALS) {
    const { count, error } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .eq('visit_assignee', initial)
      .lt('visit_date', todayJST)
      .is('deleted_at', null);
    
    if (!error && count && count > 0) {
      visitCompletedByAssignee.push({ initial, count });
    }
  }
  
  console.log('訪問済み（イニシャル別）:');
  visitCompletedByAssignee.forEach(({ initial, count }) => {
    console.log(`  訪問済み(${initial}): ${count}件`);
  });
  console.log('');
  
  // 3. 特定のイニシャルでフィルタリングテスト（訪問済み）
  if (visitCompletedByAssignee.length > 0) {
    const testAssignee = visitCompletedByAssignee[0];
    console.log(`3. 訪問済み(${testAssignee.initial})のデータを取得...`);
    console.log(`   期待件数: ${testAssignee.count}件`);
    
    const { data, error, count } = await supabase
      .from('sellers')
      .select('seller_number, name, visit_assignee, visit_date', { count: 'exact' })
      .eq('visit_assignee', testAssignee.initial)
      .lt('visit_date', todayJST)
      .is('deleted_at', null)
      .order('visit_date', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('   エラー:', error.message);
    } else {
      console.log(`   実際の件数: ${count}件`);
      console.log('   サンプルデータ（最初の5件）:');
      data?.slice(0, 5).forEach((seller, index) => {
        console.log(`     ${index + 1}. ${seller.seller_number}: 営担=${seller.visit_assignee}, 訪問日=${seller.visit_date}`);
      });
    }
    console.log('');
  }
  
  // 4. SellerServiceのlistSellersメソッドをシミュレート
  if (visitCompletedByAssignee.length > 0) {
    const testAssignee = visitCompletedByAssignee[0];
    console.log(`4. listSellersメソッドのシミュレーション（訪問済み + ${testAssignee.initial}）...`);
    
    // listSellersと同じクエリを構築
    const { data, error, count } = await supabase
      .from('sellers')
      .select('seller_number, name, visit_assignee, visit_date', { count: 'exact' })
      .is('deleted_at', null)
      .not('visit_assignee', 'is', null)
      .neq('visit_assignee', '')
      .neq('visit_assignee', '外す')
      .lt('visit_date', todayJST)
      .eq('visit_assignee', testAssignee.initial)  // 特定のイニシャルでフィルタリング
      .order('inquiry_date', { ascending: false, nullsFirst: false })
      .range(0, 49);
    
    if (error) {
      console.error('   エラー:', error.message);
    } else {
      console.log(`   取得件数: ${data?.length}件（合計: ${count}件）`);
      console.log('   サンプルデータ（最初の5件）:');
      data?.slice(0, 5).forEach((seller, index) => {
        console.log(`     ${index + 1}. ${seller.seller_number}: 営担=${seller.visit_assignee}, 訪問日=${seller.visit_date}`);
      });
    }
    console.log('');
  }
  
  console.log('=== テスト完了 ===');
}

testVisitAssigneeFilter();
