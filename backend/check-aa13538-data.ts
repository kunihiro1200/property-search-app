import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13538() {
  console.log('=== AA13538のデータ確認 ===\n');
  
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13538')
    .single();
  
  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }
  
  if (!seller) {
    console.log('❌ AA13538が見つかりません');
    return;
  }
  
  console.log('✅ AA13538のデータ:');
  console.log('売主番号:', seller.seller_number);
  console.log('営担（visit_assignee）:', seller.visit_assignee || '（空欄）');
  console.log('次電日（next_call_date）:', seller.next_call_date || '（空欄）');
  console.log('訪問日（visit_date）:', seller.visit_date || '（空欄）');
  console.log('状況（status）:', seller.status || '（空欄）');
  console.log('電話担当（phone_contact_person）:', seller.phone_contact_person || '（空欄）');
  console.log('連絡取りやすい時間（preferred_contact_time）:', seller.preferred_contact_time || '（空欄）');
  console.log('連絡方法（contact_method）:', seller.contact_method || '（空欄）');
  
  console.log('\n=== カテゴリ判定 ===\n');
  
  const today = new Date();
  const todayJST = new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log('今日（JST）:', todayJST);
  console.log('次電日:', seller.next_call_date || '（空欄）');
  console.log('営担あり:', !!seller.visit_assignee);
  console.log('営担の値:', seller.visit_assignee);
  
  const hasValidVisitAssignee = seller.visit_assignee && 
                                 seller.visit_assignee.trim() !== '' && 
                                 seller.visit_assignee.trim() !== '外す';
  
  console.log('営担が有効:', hasValidVisitAssignee);
  
  console.log('\n=== カテゴリ判定結果 ===\n');
  
  if (!hasValidVisitAssignee) {
    console.log('❌ 営担が無効なので、どの「その他(イニシャル)」カテゴリにも該当しない');
    
    // コミュニケーション情報をチェック
    const hasContactInfo = seller.phone_contact_person || 
                           seller.preferred_contact_time || 
                           seller.contact_method;
    
    if (hasContactInfo) {
      console.log('✅ コミュニケーション情報ありなので、「当日TEL（内容）」に該当する可能性');
    } else {
      console.log('✅ コミュニケーション情報なしなので、「当日TEL分」に該当する可能性');
    }
  } else {
    console.log(`✅ 営担が「${seller.visit_assignee}」なので、「その他(${seller.visit_assignee})」に該当する可能性`);
    
    // 「当日TEL（担当）」に該当するかチェック
    const isFollowingUp = seller.status && seller.status.includes('追客中');
    const hasNextCallDate = !!seller.next_call_date;
    
    if (hasNextCallDate) {
      const nextCallDate = new Date(seller.next_call_date);
      const today = new Date(todayJST);
      const isNextCallDateTodayOrBefore = nextCallDate <= today;
      
      console.log('次電日あり:', hasNextCallDate);
      console.log('次電日が今日以前:', isNextCallDateTodayOrBefore);
      console.log('追客中:', isFollowingUp);
      
      if (isNextCallDateTodayOrBefore && isFollowingUp) {
        console.log('✅ 「当日TEL（担当）」にも該当する');
      } else {
        console.log('❌ 「当日TEL（担当）」には該当しない');
      }
    }
  }
}

checkAA13538().catch(console.error);
