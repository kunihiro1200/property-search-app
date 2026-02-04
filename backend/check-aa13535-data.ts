/**
 * AA13535のデータを確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13535() {
  console.log('=== AA13535のデータ確認 ===\n');
  
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13535')
    .is('deleted_at', null)
    .single();
  
  if (error || !seller) {
    console.error('❌ AA13535が見つかりません:', error?.message);
    return;
  }
  
  console.log('✅ AA13535のデータ:');
  console.log(`売主番号: ${seller.seller_number}`);
  console.log(`営担（visit_assignee）: ${seller.visit_assignee || '（空欄）'}`);
  console.log(`次電日（next_call_date）: ${seller.next_call_date || '（空欄）'}`);
  console.log(`訪問日（visit_date）: ${seller.visit_date || '（空欄）'}`);
  console.log(`状況（status）: ${seller.status || '（空欄）'}`);
  console.log(`電話担当（phone_contact_person）: ${seller.phone_contact_person || '（空欄）'}`);
  console.log(`連絡取りやすい時間（preferred_contact_time）: ${seller.preferred_contact_time || '（空欄）'}`);
  console.log(`連絡方法（contact_method）: ${seller.contact_method || '（空欄）'}`);
  
  // カテゴリ判定
  console.log('\n=== カテゴリ判定 ===\n');
  
  const today = new Date();
  const todayJST = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(`今日（JST）: ${todayJST}`);
  console.log(`次電日: ${seller.next_call_date || 'なし'}`);
  console.log(`営担あり: ${!!seller.visit_assignee}`);
  console.log(`営担の値: ${seller.visit_assignee || 'null'}`);
  
  const hasValidVisitAssignee = seller.visit_assignee && 
                                 seller.visit_assignee.trim() !== '' && 
                                 seller.visit_assignee.trim() !== '外す';
  
  console.log(`営担が有効: ${hasValidVisitAssignee}`);
  
  if (hasValidVisitAssignee) {
    const isFollowingUp = seller.status && seller.status.includes('追客中');
    const hasNextCallDate = !!seller.next_call_date;
    
    console.log(`次電日あり: ${hasNextCallDate}`);
    console.log(`追客中: ${isFollowingUp}`);
    
    if (hasNextCallDate) {
      const nextCallDate = new Date(seller.next_call_date);
      const today = new Date(todayJST);
      const isNextCallDateTodayOrBefore = nextCallDate <= today;
      
      console.log(`次電日が今日以前: ${isNextCallDateTodayOrBefore}`);
      
      if (isNextCallDateTodayOrBefore && isFollowingUp) {
        console.log('\n=== カテゴリ判定結果 ===\n');
        console.log(`✅ 当日TEL（担当）(${seller.visit_assignee})に該当`);
      } else {
        console.log('\n=== カテゴリ判定結果 ===\n');
        console.log(`✅ その他(${seller.visit_assignee})に該当`);
      }
    } else {
      console.log('\n=== カテゴリ判定結果 ===\n');
      console.log(`✅ その他(${seller.visit_assignee})に該当`);
    }
  } else {
    console.log('\n=== カテゴリ判定結果 ===\n');
    console.log('❌ 営担が無効なので、どの「担当」カテゴリにも該当しない');
    
    // コミュニケーション情報をチェック
    const hasContactInfo = seller.phone_contact_person || 
                           seller.preferred_contact_time || 
                           seller.contact_method;
    
    if (hasContactInfo) {
      console.log('✅ コミュニケーション情報ありなので、「当日TEL（内容）」に該当する可能性');
    } else {
      console.log('✅ コミュニケーション情報なしなので、「当日TEL分」に該当する可能性');
    }
  }
}

checkAA13535().catch(console.error);
