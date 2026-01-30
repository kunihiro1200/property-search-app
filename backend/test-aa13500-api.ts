import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAA13500API() {
  try {
    console.log('=== AA13500のAPIレスポンスをテスト ===');

    // 1. データベースから直接取得
    console.log('\n1️⃣ データベースから直接取得:');
    const { data: dbData, error: dbError } = await supabase
      .from('sellers')
      .select('id, seller_number, valuation_method, mailing_status')
      .eq('seller_number', 'AA13500')
      .single();

    if (dbError) {
      console.error('❌ エラー:', dbError);
      return;
    }

    console.log('   ID:', dbData.id);
    console.log('   売主番号:', dbData.seller_number);
    console.log('   査定方法:', dbData.valuation_method);
    console.log('   郵送ステータス:', dbData.mailing_status);

    // 2. SellerServiceを使用して取得（APIと同じロジック）
    console.log('\n2️⃣ SellerServiceを使用して取得:');
    
    // SellerServiceをインポート
    const { SellerService } = await import('./src/services/SellerService.supabase');
    const sellerService = new SellerService();
    
    const seller = await sellerService.getSeller(dbData.id);
    console.log('   売主番号:', seller.sellerNumber);
    console.log('   査定方法:', seller.valuationMethod);
    console.log('   郵送ステータス:', seller.mailingStatus);

    // 3. APIエンドポイントをテスト（curlコマンド）
    console.log('\n3️⃣ APIエンドポイントをテスト:');
    console.log(`   curl http://localhost:3000/api/sellers/${dbData.id}`);
    console.log('   ↑ このコマンドをターミナルで実行して、valuationMethodが含まれているか確認してください');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

testAA13500API();
