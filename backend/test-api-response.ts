import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testApiResponse() {
  console.log('🔍 APIレスポンスをテスト中...\n');

  try {
    // データベースから取得（APIと同じ方法で）
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', 'AA12903')
      .single();

    if (error || !seller) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log('=== 生のデータベースレスポンス ===');
    console.log('seller.status:', seller.status);
    console.log('seller.status type:', typeof seller.status);
    console.log('seller.status length:', seller.status?.length);
    console.log('seller.status JSON:', JSON.stringify(seller.status));
    console.log('\n=== 復号化後 ===');
    console.log('name:', decrypt(seller.name));
    console.log('status:', seller.status);
    console.log('confidence:', seller.confidence);
    console.log('inquiry_site:', seller.inquiry_site);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testApiResponse().catch(console.error);
