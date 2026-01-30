import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env.local' });

async function testAA13501ApiResponse() {
  try {
    console.log('=== AA13501 API Response Test ===');
    
    // AA13501の売主IDを取得
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA13501')
      .single();
    
    if (sellerError || !seller) {
      console.error('❌ Seller not found:', sellerError);
      return;
    }
    
    console.log('✅ Seller found:', seller);
    
    // APIエンドポイントを直接呼び出す（SellerServiceを使用）
    const { SellerService } = await import('./src/services/SellerService.supabase');
    const sellerService = new SellerService();
    
    const sellerData = await sellerService.getSeller(seller.id);
    
    console.log('\n=== Seller Data ===');
    console.log('ID:', sellerData?.id);
    console.log('Seller Number:', sellerData?.sellerNumber);
    console.log('Name:', sellerData?.name);
    console.log('Unreachable Status:', sellerData?.unreachableStatus);
    console.log('Comments:', sellerData?.comments);
    
    console.log('\n=== Property Data ===');
    console.log('Property exists:', !!sellerData?.property);
    console.log('Property address:', sellerData?.property?.address);
    console.log('Property type:', sellerData?.property?.propertyType);
    
    // データベースから直接propertiesテーブルを確認
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('seller_id', seller.id);
    
    console.log('\n=== Direct Properties Query ===');
    if (propError) {
      console.error('❌ Properties query error:', propError);
    } else {
      console.log('Properties count:', properties?.length || 0);
      if (properties && properties.length > 0) {
        const prop = properties[0];
        console.log('Property ID:', prop.id);
        console.log('property_address column:', prop.property_address);
        console.log('address column:', prop.address);
        console.log('All columns:', Object.keys(prop));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAA13501ApiResponse();
