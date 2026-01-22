import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkApiFields() {
  try {
    console.log('=== AA13424 データベース確認 ===\n');
    
    // データベースから直接取得
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA13424')
      .single();
    
    if (error) {
      console.error('エラー:', error);
      return;
    }
    
    if (!seller) {
      console.log('❌ AA13424が見つかりません');
      return;
    }
    
    console.log('✅ AA13424が見つかりました\n');
    
    console.log('=== 訪問フィールド（データベース） ===');
    console.log('visit_acquisition_date:', seller.visit_acquisition_date);
    console.log('visit_date:', seller.visit_date);
    console.log('visit_valuation_acquirer:', seller.visit_valuation_acquirer);
    console.log('visit_assignee:', seller.visit_assignee);
    
    console.log('\n=== 反響フィールド ===');
    console.log('inquiry_year:', seller.inquiry_year);
    console.log('inquiry_date:', seller.inquiry_date);
    console.log('inquiry_site:', seller.inquiry_site);
    
    console.log('\n=== ステータス ===');
    console.log('status:', seller.status);
    
    // decryptSellerメソッドのシミュレーション
    console.log('\n=== decryptSellerメソッドでの変換 ===');
    
    // イニシャル→フルネーム変換のシミュレーション
    const initialsMap: Record<string, string> = {
      'R': '木村侑里音',
      'Y': '山本裕子',
      'I': '石川',
      'U': '上田',
    };
    
    const visitValuationAcquirer = seller.visit_valuation_acquirer 
      ? initialsMap[seller.visit_valuation_acquirer] || seller.visit_valuation_acquirer
      : null;
    
    const visitAssignee = seller.visit_assignee
      ? initialsMap[seller.visit_assignee] || seller.visit_assignee
      : null;
    
    console.log('visitAcquisitionDate:', seller.visit_acquisition_date);
    console.log('visitDate:', seller.visit_date);
    console.log('visitValuationAcquirer:', visitValuationAcquirer);
    console.log('visitAssignee:', visitAssignee);
    
    // APIレスポンス形式での確認
    console.log('\n=== 期待されるAPIレスポンス ===');
    const apiResponse = {
      sellerNumber: seller.seller_number,
      status: seller.status,
      visitAcquisitionDate: seller.visit_acquisition_date,
      visitDate: seller.visit_date,
      visitValuationAcquirer: visitValuationAcquirer,
      visitAssignee: visitAssignee,
      inquiryYear: seller.inquiry_year,
      inquiryDate: seller.inquiry_date,
      inquirySite: seller.inquiry_site,
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkApiFields();
