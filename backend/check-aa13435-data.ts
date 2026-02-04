import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13435() {
  console.log('=== AA13435のデータ確認 ===\n');

  // sellersテーブルから取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13435')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!seller) {
    console.log('❌ AA13435が見つかりません');
    return;
  }

  console.log('✅ AA13435のデータ:');
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
  console.log('営担の値:', seller.visit_assignee);

  // 次電日チェック
  const hasNextCallDate = !!seller.next_call_date;
  const isNextCallDateTodayOrBefore = hasNextCallDate && seller.next_call_date <= todayJST;
  console.log('次電日あり:', hasNextCallDate);
  console.log('次電日が今日以前:', isNextCallDateTodayOrBefore);

  // 状況チェック
  const isFollowingUp = seller.status && seller.status.includes('追客中');
  console.log('追客中:', isFollowingUp);

  console.log('\n=== カテゴリ判定結果 ===\n');

  // 担当(Y)の条件
  if (hasVisitAssignee && seller.visit_assignee === 'Y') {
    console.log('✅ 担当(Y)に該当');
    console.log('   理由: 営担がY');
    
    // 当日TEL(Y)の条件
    if (isNextCallDateTodayOrBefore && isFollowingUp) {
      console.log('  ✅ 当日TEL(Y)に該当');
      console.log('     理由: 次電日が今日以前 + 追客中');
    } else {
      console.log('  ❌ 当日TEL(Y)に該当しない');
      if (!isNextCallDateTodayOrBefore) console.log('     理由: 次電日が今日より後');
      if (!isFollowingUp) console.log('     理由: 追客中ではない');
    }
    
    // その他(Y)の条件
    if (!isNextCallDateTodayOrBefore || !isFollowingUp) {
      console.log('  ✅ その他(Y)に該当');
      console.log('     理由: 次電日が今日より後 または 追客中ではない');
    } else {
      console.log('  ❌ その他(Y)に該当しない');
      console.log('     理由: 当日TEL(Y)に該当するため');
    }
  } else {
    console.log('❌ 担当(Y)に該当しない');
    if (!hasVisitAssignee) console.log('   理由: 営担なし');
    if (hasVisitAssignee && seller.visit_assignee !== 'Y') console.log('   理由: 営担がY以外');
  }

  console.log('\n=== 重要な確認 ===\n');
  console.log('⚠️  一つの売主は「当日TEL(Y)」と「その他(Y)」のどちらか一方にのみ属するべき');
  console.log('⚠️  両方に表示されている場合は、フロントエンドまたはバックエンドのロジックに問題がある');
}

checkAA13435().catch(console.error);
