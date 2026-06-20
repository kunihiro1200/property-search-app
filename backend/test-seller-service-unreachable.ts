import { SellerService } from './src/services/SellerService.supabase';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config({ path: './.env' });

async function testSellerService() {
  console.log('🧪 Testing SellerService.getSeller for AA13500...\n');

  try {
    const sellerService = new SellerService();

    // AA13500のIDを使用
    const sellerId = '27bd1bf7-2467-4bde-b128-26e31e525f51';

    console.log('🔍 Calling SellerService.getSeller...');
    const seller = await sellerService.getSeller(sellerId);

    if (!seller) {
      console.error('❌ Seller not found');
      return;
    }

    console.log('\n✅ Seller retrieved successfully!');
    console.log('\n📊 Key fields:');
    console.log('  sellerNumber:', seller.sellerNumber);
    console.log('  name:', seller.name);
    console.log('  phoneNumber:', seller.phoneNumber);
    console.log('');
    console.log('🎯 Testing unreachableStatus field:');
    console.log('  unreachableStatus:', seller.unreachableStatus);
    console.log('  isUnreachable:', seller.isUnreachable);
    console.log('');
    console.log('🎯 Testing valuationMethod field:');
    console.log('  valuationMethod:', seller.valuationMethod);
    console.log('');
    console.log('🎯 Testing comments field:');
    console.log('  comments:', seller.comments ? `${seller.comments.substring(0, 100)}...` : null);
    console.log('');
    console.log('🎯 Testing property_address field:');
    console.log('  property_address:', (seller as any).propertyAddress || (seller.property as any)?.address);
    console.log('');

    // 期待される値と比較
    console.log('✅ Verification:');
    if (seller.unreachableStatus === '不通') {
      console.log('  ✅ unreachableStatus is correct: "不通"');
    } else {
      console.log('  ❌ unreachableStatus is incorrect:', seller.unreachableStatus);
    }

    if (seller.valuationMethod === '机上査定（不通）') {
      console.log('  ✅ valuationMethod is correct: "机上査定（不通）"');
    } else {
      console.log('  ❌ valuationMethod is incorrect:', seller.valuationMethod);
    }

    if (seller.comments && seller.comments.includes('久1/29')) {
      console.log('  ✅ comments is correct (contains expected text)');
    } else {
      console.log('  ❌ comments is incorrect or missing');
    }

    console.log('');
    console.log('🎉 Test completed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Reload browser in incognito mode');
    console.log('  2. Navigate to CallModePage for AA13500');
    console.log('  3. Verify "不通" button is selected in 不通セクション');
    console.log('  4. Verify "机上査定（不通）" is displayed in 査定計算セクション');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSellerService();
