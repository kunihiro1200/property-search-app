import { SellerService } from './src/services/SellerService.supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testAA13507SellerServiceValuation() {
  console.log('🔍 Testing SellerService for AA13507 valuation amounts...\n');

  const sellerService = new SellerService();

  // 1. 売主番号でデータベースから取得
  console.log('📥 Fetching AA13507 from database...');
  const { data: dbSeller, error: dbError } = await (sellerService as any).supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13507')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    return;
  }

  console.log('✅ Found AA13507 in database');
  console.log('  Raw valuation_amount_1:', dbSeller.valuation_amount_1);
  console.log('  Raw valuation_amount_2:', dbSeller.valuation_amount_2);
  console.log('  Raw valuation_amount_3:', dbSeller.valuation_amount_3);

  // 2. decryptSeller()で復号化
  console.log('\n🔓 Decrypting seller data...');
  const decryptedSeller = await sellerService.decryptSeller(dbSeller);

  console.log('✅ Seller decrypted');
  console.log('  Decrypted valuation amounts:');
  console.log('    valuation_amount_1:', decryptedSeller.valuationAmount1);
  console.log('    valuation_amount_2:', decryptedSeller.valuationAmount2);
  console.log('    valuation_amount_3:', decryptedSeller.valuationAmount3);
  console.log('    valuation_method:', decryptedSeller.valuationMethod);

  // 3. 検証
  console.log('\n📊 Verification:');
  const match1 = decryptedSeller.valuationAmount1 === dbSeller.valuation_amount_1;
  const match2 = decryptedSeller.valuationAmount2 === dbSeller.valuation_amount_2;
  const match3 = decryptedSeller.valuationAmount3 === dbSeller.valuation_amount_3;

  console.log('  valuation_amount_1:', match1 ? '✅ Match' : '❌ Mismatch');
  console.log('  valuation_amount_2:', match2 ? '✅ Match' : '❌ Mismatch');
  console.log('  valuation_amount_3:', match3 ? '✅ Match' : '❌ Mismatch');

  if (match1 && match2 && match3) {
    console.log('\n🎉 SellerService correctly returns valuation amounts!');
  } else {
    console.log('\n⚠️ SellerService does not correctly return valuation amounts');
  }
}

testAA13507SellerServiceValuation().catch(console.error);
