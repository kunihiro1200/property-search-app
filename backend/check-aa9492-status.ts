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

async function checkAA9492Status() {
  console.log('🔍 AA9492のデータを確認中...\n');

  try {
    // AA9492のデータを取得
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

    console.log('📊 AA9492のデータ:');
    console.log('売主番号:', seller.seller_number);
    console.log('名前:', seller.name);
    console.log('');
    
    console.log('📅 日付情報:');
    console.log('反響日付:', seller.inquiry_date);
    console.log('訪問日:', seller.visit_date);
    console.log('次電日:', seller.next_call_date);
    console.log('');
    
    console.log('👤 担当情報:');
    console.log('営担:', seller.visit_assignee);
    console.log('査定担当:', seller.valuation_assignee);
    console.log('');
    
    console.log('📝 ステータス情報:');
    console.log('状況（当社）:', seller.status);
    console.log('確度:', seller.confidence_level);
    console.log('不通:', seller.unreachable_status);
    console.log('Pinrich:', seller.pinrich_status);
    console.log('');
    
    console.log('📞 コミュニケーション情報:');
    console.log('連絡方法:', seller.contact_method);
    console.log('連絡取りやすい時間:', seller.preferred_contact_time);
    console.log('電話担当:', seller.phone_contact_person);
    console.log('');
    
    console.log('💰 査定情報:');
    console.log('査定額1:', seller.valuation_amount_1);
    console.log('査定額2:', seller.valuation_amount_2);
    console.log('査定額3:', seller.valuation_amount_3);
    console.log('査定方法:', seller.valuation_method);
    console.log('');
    
    console.log('📮 郵送情報:');
    console.log('郵送ステータス:', seller.mailing_status);
    console.log('');

    // 今日の日付
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('📆 今日の日付:', today.toISOString().split('T')[0]);
    console.log('');

    // ステータス判定
    console.log('🎯 ステータス判定:');
    
    // 訪問予定/訪問済みの判定
    const normalStaffInitials = ['K', 'Y', 'I', '林', '生', 'U', 'R', '久', '和', 'H'];
    const hasVisitAssignee = seller.visit_assignee && seller.visit_assignee !== '外す';
    const isNormalStaff = normalStaffInitials.includes(seller.visit_assignee);
    
    console.log('営担あり:', hasVisitAssignee);
    console.log('通常スタッフ:', isNormalStaff);
    
    if (hasVisitAssignee && isNormalStaff && seller.visit_date) {
      const visitDate = new Date(seller.visit_date);
      visitDate.setHours(0, 0, 0, 0);
      
      if (visitDate >= today) {
        console.log('✅ 訪問予定(' + seller.visit_assignee + ')');
      } else {
        console.log('✅ 訪問済み(' + seller.visit_assignee + ')');
      }
    }
    
    // 当日TEL（担当）の判定
    if (hasVisitAssignee && seller.visit_assignee !== '外す' && seller.next_call_date) {
      const nextCallDate = new Date(seller.next_call_date);
      nextCallDate.setHours(0, 0, 0, 0);
      
      if (nextCallDate <= today) {
        console.log('✅ 当日TEL(' + seller.visit_assignee + ')');
      }
    }
    
    // 当日TEL分の判定
    const hasContactInfo = seller.contact_method || seller.preferred_contact_time || seller.phone_contact_person;
    const isFollowingUp = seller.status && seller.status.includes('追客中');
    
    console.log('追客中:', isFollowingUp);
    console.log('コミュニケーション情報あり:', hasContactInfo);
    
    if (isFollowingUp && seller.next_call_date) {
      const nextCallDate = new Date(seller.next_call_date);
      nextCallDate.setHours(0, 0, 0, 0);
      
      if (nextCallDate <= today) {
        if (!hasContactInfo && (!hasVisitAssignee || seller.visit_assignee === '外す')) {
          console.log('✅ 当日TEL分');
        } else if (hasContactInfo) {
          console.log('✅ 当日TEL（内容）');
        }
      }
    }
    
    // 未査定の判定
    const hasValuation = seller.valuation_amount_1 || seller.valuation_amount_2 || seller.valuation_amount_3;
    const inquiryDate = seller.inquiry_date ? new Date(seller.inquiry_date) : null;
    const cutoffDate = new Date('2025-12-08');
    
    console.log('査定額あり:', hasValuation);
    console.log('反響日付が2025/12/8以降:', inquiryDate && inquiryDate >= cutoffDate);
    
    if (!hasValuation && inquiryDate && inquiryDate >= cutoffDate && isFollowingUp && !hasVisitAssignee) {
      console.log('✅ 未査定');
    }
    
    // 査定（郵送）の判定
    if (seller.mailing_status === '未') {
      console.log('✅ 査定（郵送）');
    }
    
    // 当日TEL_未着手の判定
    const inquiryDate2026 = inquiryDate && inquiryDate >= new Date('2026-01-01');
    const unreachableEmpty = !seller.unreachable_status;
    
    console.log('反響日付が2026/1/1以降:', inquiryDate2026);
    console.log('不通が空欄:', unreachableEmpty);
    
    if (isFollowingUp && seller.next_call_date) {
      const nextCallDate = new Date(seller.next_call_date);
      nextCallDate.setHours(0, 0, 0, 0);
      
      if (nextCallDate <= today && !hasContactInfo && (!hasVisitAssignee || seller.visit_assignee === '外す') && unreachableEmpty && inquiryDate2026) {
        console.log('✅ 当日TEL_未着手');
      }
    }
    
    // Pinrich空欄の判定
    const pinrichEmpty = !seller.pinrich_status;
    
    console.log('Pinrichが空欄:', pinrichEmpty);
    
    if (isFollowingUp && seller.next_call_date) {
      const nextCallDate = new Date(seller.next_call_date);
      nextCallDate.setHours(0, 0, 0, 0);
      
      if (nextCallDate <= today && !hasContactInfo && (!hasVisitAssignee || seller.visit_assignee === '外す') && pinrichEmpty) {
        console.log('✅ Pinrich空欄');
      }
    }
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAA9492Status().catch(console.error);
