/**
 * AA13424のAPIレスポンスを簡易確認
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkAA13424APIResponse() {
  console.log('🔍 AA13424のAPIレスポンスを確認中...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. データベースから直接確認
    console.log('📊 データベースから直接確認:\n');
    const { data: dbData, error: dbError } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA13424')
      .single();

    if (dbError) {
      console.error('❌ エラー:', dbError.message);
      process.exit(1);
    }

    console.log('訪問フィールド（データベース）:');
    console.log('  visit_acquisition_date:', dbData.visit_acquisition_date);
    console.log('  visit_date:', dbData.visit_date);
    console.log('  visit_valuation_acquirer:', dbData.visit_valuation_acquirer);
    console.log('  visit_assignee:', dbData.visit_assignee);

    // 2. SellerServiceを使用して確認
    console.log('\n📡 SellerService経由で確認:\n');
    const { SellerService } = await import('./src/services/SellerService.supabase');
    const sellerService = new SellerService(supabase);

    const decryptedSeller = await sellerService['decryptSeller'](dbData);

    console.log('訪問フィールド（API形式）:');
    console.log('  visitAcquisitionDate:', decryptedSeller.visitAcquisitionDate);
    console.log('  visitDate:', decryptedSeller.visitDate);
    console.log('  visitValuationAcquirer:', decryptedSeller.visitValuationAcquirer);
    console.log('  visitAssignee:', decryptedSeller.visitAssignee);

    // 3. 完全なレスポンスを表示
    console.log('\n📋 完全なAPIレスポンス（訪問関連のみ）:');
    console.log(JSON.stringify({
      visitAcquisitionDate: decryptedSeller.visitAcquisitionDate,
      visitDate: decryptedSeller.visitDate,
      visitValuationAcquirer: decryptedSeller.visitValuationAcquirer,
      visitAssignee: decryptedSeller.visitAssignee,
    }, null, 2));

  } catch (error: any) {
    console.error('\n❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
    process.exit(1);
  }
}

checkAA13424APIResponse()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ エラー:', error.message);
    process.exit(1);
  });
