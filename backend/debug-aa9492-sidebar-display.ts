/**
 * AA9492がサイドバーに表示されない問題のデバッグスクリプト
 * 
 * 確認項目:
 * 1. APIレスポンスにAA9492が含まれているか
 * 2. AA9492のコミュニケーション情報が正しく取得されているか
 * 3. groupTodayCallWithInfo関数が正しく動作しているか
 * 4. サイドバーに渡されるsellers配列にAA9492が含まれているか
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * コミュニケーション情報があるかどうかを判定
 */
const hasContactInfo = (seller: any): boolean => {
  const contactMethod = seller.contact_method || '';
  const preferredContactTime = seller.preferred_contact_time || '';
  const phoneContactPerson = seller.phone_contact_person || '';
  
  return (
    (contactMethod && contactMethod.trim() !== '') ||
    (preferredContactTime && preferredContactTime.trim() !== '') ||
    (phoneContactPerson && phoneContactPerson.trim() !== '')
  );
};

/**
 * 当日TEL（内容）の表示ラベルを取得
 */
const getTodayCallWithInfoLabel = (seller: any): string => {
  const contactMethod = seller.contact_method || '';
  const preferredContactTime = seller.preferred_contact_time || '';
  const phoneContactPerson = seller.phone_contact_person || '';
  
  // 優先順位: 連絡方法 > 連絡取りやすい時間 > 電話担当
  if (contactMethod && contactMethod.trim() !== '') {
    return `当日TEL(${contactMethod})`;
  }
  if (preferredContactTime && preferredContactTime.trim() !== '') {
    return `当日TEL(${preferredContactTime})`;
  }
  if (phoneContactPerson && phoneContactPerson.trim() !== '') {
    return `当日TEL(${phoneContactPerson})`;
  }
  
  return '当日TEL（内容）';
};

/**
 * 当日TEL（内容）判定
 */
const isTodayCallWithInfo = (seller: any): boolean => {
  // 営担がある場合は除外
  const visitAssignee = seller.visit_assignee || '';
  if (visitAssignee && visitAssignee.trim() !== '' && visitAssignee.trim() !== '外す') {
    return false;
  }
  
  // 追客中かチェック
  const status = seller.status || '';
  if (!status.includes('追客中')) {
    return false;
  }
  
  // 次電日が今日以前かチェック
  const nextCallDate = seller.next_call_date;
  if (!nextCallDate) {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(nextCallDate);
  nextDate.setHours(0, 0, 0, 0);
  
  if (nextDate > today) {
    return false;
  }
  
  // コミュニケーション情報があるかチェック
  return hasContactInfo(seller);
};

/**
 * 当日TEL（内容）の売主を内容別にグループ化
 */
const groupTodayCallWithInfo = (sellers: any[]): any[] => {
  if (!sellers || sellers.length === 0) {
    return [];
  }
  
  // 1. 当日TEL（内容）の売主のみをフィルタリング
  const todayCallWithInfoSellers = sellers.filter(isTodayCallWithInfo);
  
  if (todayCallWithInfoSellers.length === 0) {
    return [];
  }
  
  // 2. ラベル別にグループ化
  const groupMap = new Map<string, any[]>();
  
  todayCallWithInfoSellers.forEach(seller => {
    const label = getTodayCallWithInfoLabel(seller);
    
    if (!groupMap.has(label)) {
      groupMap.set(label, []);
    }
    
    groupMap.get(label)!.push(seller);
  });
  
  // 3. グループ化データを配列に変換
  const groups = Array.from(groupMap.entries()).map(
    ([label, sellers]) => ({
      label,
      count: sellers.length,
      sellers,
    })
  );
  
  // 4. 件数の多い順にソート
  groups.sort((a, b) => b.count - a.count);
  
  return groups;
};

async function main() {
  console.log('🔍 AA9492のサイドバー表示問題をデバッグ中...\n');
  
  // 1. データベースからAA9492を取得
  console.log('📊 ステップ1: データベースからAA9492を取得');
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
    console.error('❌ AA9492が見つかりません');
    return;
  }
  
  console.log('✅ AA9492が見つかりました');
  console.log('   売主番号:', seller.seller_number);
  console.log('   名前:', seller.name);
  console.log('   状況（当社）:', seller.status);
  console.log('   次電日:', seller.next_call_date);
  console.log('   営担:', seller.visit_assignee || '（空）');
  console.log('   連絡方法:', seller.contact_method || '（空）');
  console.log('   連絡取りやすい時間:', seller.preferred_contact_time || '（空）');
  console.log('   電話担当:', seller.phone_contact_person || '（空）');
  console.log('');
  
  // 2. コミュニケーション情報の判定
  console.log('📊 ステップ2: コミュニケーション情報の判定');
  const hasInfo = hasContactInfo(seller);
  console.log('   hasContactInfo():', hasInfo);
  
  if (hasInfo) {
    const label = getTodayCallWithInfoLabel(seller);
    console.log('   表示ラベル:', label);
  }
  console.log('');
  
  // 3. 当日TEL（内容）判定
  console.log('📊 ステップ3: 当日TEL（内容）判定');
  const isTodayCall = isTodayCallWithInfo(seller);
  console.log('   isTodayCallWithInfo():', isTodayCall);
  console.log('');
  
  // 4. 全売主を取得してグループ化
  console.log('📊 ステップ4: 全売主を取得してグループ化');
  const { data: allSellers, error: allError } = await supabase
    .from('sellers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (allError) {
    console.error('❌ エラー:', allError);
    return;
  }
  
  console.log('   全売主数:', allSellers?.length || 0);
  
  // 当日TEL（内容）の売主をフィルタリング
  const todayCallWithInfoSellers = allSellers?.filter(isTodayCallWithInfo) || [];
  console.log('   当日TEL（内容）の売主数:', todayCallWithInfoSellers.length);
  
  // AA9492が含まれているか確認
  const aa9492InList = todayCallWithInfoSellers.find(s => s.seller_number === 'AA9492');
  console.log('   AA9492が含まれているか:', aa9492InList ? 'はい' : 'いいえ');
  console.log('');
  
  // 5. グループ化
  console.log('📊 ステップ5: グループ化');
  const groups = groupTodayCallWithInfo(allSellers || []);
  console.log('   グループ数:', groups.length);
  console.log('');
  
  // 各グループの詳細を表示
  groups.forEach((group, index) => {
    console.log(`   グループ${index + 1}: ${group.label} (${group.count}件)`);
    
    // AA9492が含まれているか確認
    const aa9492InGroup = group.sellers.find((s: any) => s.seller_number === 'AA9492');
    if (aa9492InGroup) {
      console.log('      ✅ AA9492が含まれています');
    }
  });
  console.log('');
  
  // 6. 結論
  console.log('📊 結論:');
  if (isTodayCall) {
    console.log('   ✅ AA9492は「当日TEL（内容）」の条件を満たしています');
    
    const aa9492Group = groups.find(g => 
      g.sellers.some((s: any) => s.seller_number === 'AA9492')
    );
    
    if (aa9492Group) {
      console.log(`   ✅ AA9492は「${aa9492Group.label}」グループに含まれています`);
      console.log('   ✅ サイドバーに表示されるはずです');
    } else {
      console.log('   ❌ AA9492がどのグループにも含まれていません');
      console.log('   ❌ groupTodayCallWithInfo関数に問題がある可能性があります');
    }
  } else {
    console.log('   ❌ AA9492は「当日TEL（内容）」の条件を満たしていません');
    console.log('   ❌ サイドバーに表示されません');
  }
}

main().catch(console.error);
