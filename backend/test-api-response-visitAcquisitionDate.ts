import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testVisitAcquisitionDate() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('🔍 visit_acquisition_dateフィールドのテスト\n');

  // データベースから直接取得
  const { data: dbData, error } = await supabase
    .from('sellers')
    .select('seller_number, visit_acquisition_date, visit_date, visit_valuation_acquirer, visit_assignee')
    .eq('seller_number', 'AA13424')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('📊 データベースの生データ:');
  console.log(JSON.stringify(dbData, null, 2));

  // SellerServiceを使用して取得
  console.log('\n🔍 SellerServiceを使用してテスト...');
  
  const { SellerService } = await import('./src/services/SellerService.supabase');
  const sellerService = new SellerService();

  // 売主IDを取得
  const { data: seller } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_number', 'AA13424')
    .single();

  if (!seller) {
    console.error('❌ 売主が見つかりません');
    return;
  }

  const decryptedSeller = await sellerService.getSeller(seller.id);

  console.log('\n📊 SellerService.getSeller()の結果:');
  console.log('visitAcquisitionDate:', decryptedSeller?.visitAcquisitionDate);
  console.log('visitDate:', decryptedSeller?.visitDate);
  console.log('visitValuationAcquirer:', decryptedSeller?.visitValuationAcquirer);
  console.log('visitAssignee:', decryptedSeller?.visitAssignee);

  if (!decryptedSeller?.visitAcquisitionDate) {
    console.log('\n❌ visitAcquisitionDateが返されていません！');
    console.log('📋 デバッグ情報:');
    console.log('- データベースには visit_acquisition_date が存在します');
    console.log('- decryptSeller()メソッドで変換されるはずです');
    console.log('- 確認が必要: SellerService.supabase.ts の decryptSeller() メソッド');
  } else {
    console.log('\n✅ visitAcquisitionDateが正しく返されています！');
  }
}

testVisitAcquisitionDate();
