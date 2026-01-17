import { SellerService } from './src/services/SellerService.supabase';

async function testCommentsAPI() {
  console.log('🧪 Testing comments API...\n');
  
  const sellerService = new SellerService();
  
  try {
    // AA12923の売主を検索
    const sellers = await sellerService.searchSellers('AA12923');
    
    if (sellers.length === 0) {
      console.log('❌ AA12923 not found');
      return;
    }
    
    const seller = sellers[0];
    console.log('✅ Found seller:', seller.sellerNumber);
    console.log('📝 Comments field exists:', 'comments' in seller);
    console.log('📝 Comments value:', seller.comments);
    console.log('📝 Comments length:', seller.comments?.length || 0);
    
    if (seller.comments) {
      console.log('\n✅ SUCCESS: Comments are being returned from API');
      console.log('First 100 characters:', seller.comments.substring(0, 100));
    } else {
      console.log('\n❌ FAIL: Comments field is empty or undefined');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCommentsAPI();
