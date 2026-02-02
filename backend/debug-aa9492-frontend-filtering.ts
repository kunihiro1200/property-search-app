/**
 * AA9492のフロントエンドフィルタリングをデバッグ
 * 
 * 目的: AA9492が「当日TEL（内容）」カテゴリに表示されない原因を特定
 * 
 * 確認項目:
 * 1. APIレスポンスのデータ形式
 * 2. hasContactInfo()の判定結果
 * 3. isTodayCallWithInfo()の判定結果
 * 4. getTodayCallWithInfoLabel()の結果
 * 5. groupTodayCallWithInfo()の結果
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// フロントエンドのフィルタリングロジックを再現
const hasContactInfo = (seller: any): boolean => {
  const contactMethod = seller.contactMethod || seller.contact_method || '';
  const preferredContactTime = seller.preferredContactTime || seller.preferred_contact_time || '';
  const phoneContactPerson = seller.phoneContactPerson || seller.phone_contact_person || '';
  
  console.log('  📋 hasContactInfo() チェック:');
  console.log('    - contactMethod:', contactMethod);
  console.log('    - preferredContactTime:', preferredContactTime);
  console.log('    - phoneContactPerson:', phoneContactPerson);
  
  const result = (
    (contactMethod && contactMethod.trim() !== '') ||
    (preferredContactTime && preferredContactTime.trim() !== '') ||
    (phoneContactPerson && phoneContactPerson.trim() !== '')
  );
  
  console.log('    → 結果:', result);
  return result;
};

const isTodayOrBefore = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate <= today;
};

const hasVisitAssignee = (seller: any): boolean => {
  const visitAssignee = seller.visitAssignee || seller.visit_assignee || '';
  // 「外す」は営担なしと同じ扱い
  if (visitAssignee === '外す') return false;
  return visitAssignee && visitAssignee.trim() !== '';
};

const isTodayCallBase = (seller: any): boolean => {
  const status = seller.status || '';
  const nextCallDate = seller.nextCallDate || seller.next_call_date || null;
  
  console.log('  📋 isTodayCallBase() チェック:');
  console.log('    - status:', status);
  console.log('    - nextCallDate:', nextCallDate);
  console.log('    - 追客中を含む:', status.includes('追客中'));
  console.log('    - 次電日が今日以前:', isTodayOrBefore(nextCallDate));
  
  return status.includes('追客中') && isTodayOrBefore(nextCallDate);
};

const isTodayCallWithInfo = (seller: any): boolean => {
  console.log('  📋 isTodayCallWithInfo() チェック:');
  
  // 営担に入力がある売主は当日TELから除外
  if (hasVisitAssignee(seller)) {
    console.log('    → 営担あり、除外');
    return false;
  }
  
  // 共通条件をチェック
  if (!isTodayCallBase(seller)) {
    console.log('    → 共通条件を満たさない');
    return false;
  }
  
  // コミュニケーション情報のいずれかに入力がある場合「当日TEL（内容）」としてカウント
  const result = hasContactInfo(seller);
  console.log('    → 最終結果:', result);
  return result;
};

const getTodayCallWithInfoLabel = (seller: any): string => {
  const contactMethod = seller.contactMethod || seller.contact_method || '';
  const preferredContactTime = seller.preferredContactTime || seller.preferred_contact_time || '';
  const phoneContactPerson = seller.phoneContactPerson || seller.phone_contact_person || '';
  
  console.log('  📋 getTodayCallWithInfoLabel() チェック:');
  console.log('    - contactMethod:', contactMethod);
  console.log('    - preferredContactTime:', preferredContactTime);
  console.log('    - phoneContactPerson:', phoneContactPerson);
  
  // 優先順位: 連絡方法 > 連絡取りやすい時間 > 電話担当
  if (contactMethod && contactMethod.trim() !== '') {
    const label = `当日TEL(${contactMethod})`;
    console.log('    → ラベル:', label);
    return label;
  }
  if (preferredContactTime && preferredContactTime.trim() !== '') {
    const label = `当日TEL(${preferredContactTime})`;
    console.log('    → ラベル:', label);
    return label;
  }
  if (phoneContactPerson && phoneContactPerson.trim() !== '') {
    const label = `当日TEL(${phoneContactPerson})`;
    console.log('    → ラベル:', label);
    return label;
  }
  
  console.log('    → ラベル: 当日TEL（内容）');
  return '当日TEL（内容）';
};

async function debugAA9492() {
  console.log('🔍 AA9492のフロントエンドフィルタリングをデバッグ\n');
  
  try {
    // 1. データベースからAA9492を取得
    console.log('📥 ステップ1: データベースからAA9492を取得');
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA9492')
      .single();
    
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    if (!seller) {
      console.log('❌ AA9492が見つかりません');
      return;
    }
    
    console.log('✅ AA9492を取得しました\n');
    
    // 2. APIレスポンスのデータ形式を確認
    console.log('📋 ステップ2: APIレスポンスのデータ形式');
    console.log('  - seller_number:', seller.seller_number);
    console.log('  - status:', seller.status);
    console.log('  - next_call_date:', seller.next_call_date);
    console.log('  - visit_assignee:', seller.visit_assignee);
    console.log('  - contact_method:', seller.contact_method);
    console.log('  - preferred_contact_time:', seller.preferred_contact_time);
    console.log('  - phone_contact_person:', seller.phone_contact_person);
    console.log('');
    
    // 3. hasContactInfo()の判定結果
    console.log('📋 ステップ3: hasContactInfo()の判定');
    const hasContact = hasContactInfo(seller);
    console.log('');
    
    // 4. isTodayCallWithInfo()の判定結果
    console.log('📋 ステップ4: isTodayCallWithInfo()の判定');
    const isTodayCall = isTodayCallWithInfo(seller);
    console.log('');
    
    // 5. getTodayCallWithInfoLabel()の結果
    if (isTodayCall) {
      console.log('📋 ステップ5: getTodayCallWithInfoLabel()の結果');
      const label = getTodayCallWithInfoLabel(seller);
      console.log('');
    }
    
    // 6. まとめ
    console.log('📊 まとめ:');
    console.log('  - hasContactInfo:', hasContact);
    console.log('  - isTodayCallWithInfo:', isTodayCall);
    if (isTodayCall) {
      console.log('  - ラベル:', getTodayCallWithInfoLabel(seller));
      console.log('  ✅ AA9492は「当日TEL（内容）」カテゴリに表示されるはずです');
    } else {
      console.log('  ❌ AA9492は「当日TEL（内容）」カテゴリに表示されません');
      console.log('  原因を確認してください');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

debugAA9492();
