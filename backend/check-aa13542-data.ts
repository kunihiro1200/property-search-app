import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13542() {
  console.log('=== AA13542のデータ確認 ===\n');

  // sellersテーブルから取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13542')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!seller) {
    console.log('❌ AA13542が見つかりません');
    return;
  }

  console.log('✅ AA13542のデータ:');
  console.log('売主番号:', seller.seller_number);
  console.log('営担（visit_assignee）:', seller.visit_assignee || '（空欄）');
  console.log('次電日（next_call_date）:', seller.next_call_date || '（空欄）');
  console.log('訪問日（visit_date）:', seller.visit_date || '（空欄）');
  console.log('状況（status）:', seller.status || '（空欄）');
  console.log('電話担当（phone_contact_person）:', seller.phone_contact_person || '（空欄）');
  console.log('連絡取りやすい時間（preferred_contact_time）:', seller.preferred_contact_time || '（空欄）');
  console.log('連絡方法（contact_method）:', seller.contact_method || '（空欄）');

  console.log('\n=== カテゴリ判定 ===\n');

  // 今日の日付（JST）
  const now = new Date();
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const todayJST = `${jstTime.getUTCFullYear()}-${String(jstTime.getUTCMonth() + 1).padStart(2, '0')}-${String(jstTime.getUTCDate()).padStart(2, '0')}`;
  
  console.log('今日（JST）:', todayJST);
  console.log('次電日:', seller.next_call_date);

  // 営担チェック
  const hasVisitAssignee = seller.visit_assignee && seller.visit_assignee.trim() !== '' && seller.visit_assignee !== '外す';
  console.log('営担あり:', hasVisitAssignee);
  console.log('営担の値（生データ）:', JSON.stringify(seller.visit_assignee));
  console.log('営担の長さ:', seller.visit_assignee ? seller.visit_assignee.length : 0);

  // 次電日チェック
  const hasNextCallDate = !!seller.next_call_date;
  const isNextCallDateTodayOrBefore = hasNextCallDate && seller.next_call_date <= todayJST;
  console.log('次電日あり:', hasNextCallDate);
  console.log('次電日が今日以前:', isNextCallDateTodayOrBefore);

  // 状況チェック
  const isFollowingUp = seller.status && seller.status.includes('追客中');
  console.log('追客中:', isFollowingUp);

  // コミュニケーション情報チェック
  const hasContactInfo = 
    (seller.phone_contact_person && seller.phone_contact_person.trim() !== '') ||
    (seller.preferred_contact_time && seller.preferred_contact_time.trim() !== '') ||
    (seller.contact_method && seller.contact_method.trim() !== '');
  console.log('コミュニケーション情報あり:', hasContactInfo);

  console.log('\n=== カテゴリ判定結果 ===\n');

  // 当日TEL（担当）の条件
  if (hasVisitAssignee && isNextCallDateTodayOrBefore && isFollowingUp) {
    console.log('✅ 当日TEL（担当）に該当');
    console.log('   理由: 営担あり + 次電日が今日以前 + 追客中');
    console.log('   営担の値:', seller.visit_assignee);
  } else {
    console.log('❌ 当日TEL（担当）に該当しない');
    if (!hasVisitAssignee) console.log('   理由: 営担なし');
    if (!isNextCallDateTodayOrBefore) console.log('   理由: 次電日が今日より後');
    if (!isFollowingUp) console.log('   理由: 追客中ではない');
  }

  // 当日TEL分の条件
  if (!hasVisitAssignee && isNextCallDateTodayOrBefore && isFollowingUp && !hasContactInfo) {
    console.log('✅ 当日TEL分に該当');
    console.log('   理由: 営担なし + 次電日が今日以前 + 追客中 + コミュニケーション情報なし');
  } else {
    console.log('❌ 当日TEL分に該当しない');
  }

  // 当日TEL（内容）の条件
  if (!hasVisitAssignee && isNextCallDateTodayOrBefore && isFollowingUp && hasContactInfo) {
    console.log('✅ 当日TEL（内容）に該当');
    console.log('   理由: 営担なし + 次電日が今日以前 + 追客中 + コミュニケーション情報あり');
  } else {
    console.log('❌ 当日TEL（内容）に該当しない');
  }

  // Allに該当
  if (!hasVisitAssignee && (!isNextCallDateTodayOrBefore || !isFollowingUp)) {
    console.log('✅ Allに該当（特定のカテゴリに属さない）');
    console.log('   理由: 営担なし + (次電日が今日より後 または 追客中ではない)');
  }
}

checkAA13542().catch(console.error);
