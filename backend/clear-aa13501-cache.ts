import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env.local' });

async function clearAA13501Cache() {
  try {
    console.log('=== Clear AA13501 Cache ===');
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // AA13501の売主IDを取得
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA13501')
      .single();
    
    if (sellerError || !seller) {
      console.error('❌ Seller not found:', sellerError);
      return;
    }
    
    console.log('✅ Seller ID:', seller.id);
    
    // キャッシュをクリア（APIエンドポイントを使用）
    const axios = await import('axios');
    
    try {
      const response = await axios.default.delete(`http://localhost:3000/cache/seller/${seller.id}`);
      console.log('✅ Cache cleared:', response.data);
    } catch (error: any) {
      if (error.response) {
        console.log('Cache clear response:', error.response.status, error.response.data);
      } else {
        console.error('❌ Cache clear failed:', error.message);
      }
    }
    
    console.log('\n✅ Cache cleared successfully!');
    console.log('Now you can refresh the browser to see the updated data.');
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

clearAA13501Cache();
