/**
 * AA9492のAPIレスポンスを確認
 * 
 * 目的: SellerServiceのAPIレスポンスにコミュニケーション情報が含まれているか確認
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAA9492ApiResponse() {
  console.log('🔍 AA9492のAPIレスポンスを確認\n');
  
  try {
    // 1. AA9492を取得
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
    
    // 2. APIレスポンスの内容を確認
    console.log('📋 ステップ2: データベースの内容');
    console.log('  - seller_number:', seller.seller_number);
    console.log('  - status:', seller.status);
    console.log('  - next_call_date:', seller.next_call_date);
    console.log('  - visit_assignee:', seller.visit_assignee);
    console.log('  - contact_method:', seller.contact_method);
    console.log('  - preferred_contact_time:', seller.preferred_contact_time);
    console.log('  - phone_contact_person:', seller.phone_contact_person);
    console.log('');
    
    // 3. コミュニケーション情報の有無を確認
    console.log('📋 ステップ3: コミュニケーション情報の有無');
    const hasContactMethod = seller.contact_method && seller.contact_method.trim() !== '';
    const hasPreferredContactTime = seller.preferred_contact_time && seller.preferred_contact_time.trim() !== '';
    const hasPhoneContactPerson = seller.phone_contact_person && seller.phone_contact_person.trim() !== '';
    
    console.log('  - contact_method:', hasContactMethod ? '✅ あり' : '❌ なし');
    console.log('  - preferred_contact_time:', hasPreferredContactTime ? '✅ あり' : '❌ なし');
    console.log('  - phone_contact_person:', hasPhoneContactPerson ? '✅ あり' : '❌ なし');
    console.log('');
    
    // 4. まとめ
    console.log('📊 まとめ:');
    if (hasContactMethod || hasPreferredContactTime || hasPhoneContactPerson) {
      console.log('  ✅ コミュニケーション情報がデータベースに保存されています');
      console.log('  ✅ フロントエンドで「当日TEL（内容）」カテゴリに表示されるはずです');
      console.log('  📝 表示ラベル: 当日TEL(' + (seller.contact_method || seller.preferred_contact_time || seller.phone_contact_person) + ')');
    } else {
      console.log('  ❌ コミュニケーション情報がデータベースに保存されていません');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

testAA9492ApiResponse();
