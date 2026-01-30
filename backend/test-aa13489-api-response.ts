import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAA13489ApiResponse() {
  console.log('🔍 Testing AA13489 API response...\n');

  try {
    // AA13489の売主データを取得
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', 'c45d2520-f143-49c5-9952-9595cd717669')
      .single();

    if (error || !seller) {
      console.log('❌ Seller AA13489 not found:', error);
      return;
    }

    // decryptSellerメソッドと同じロジックでマッピング
    const decryptedSeller = {
      id: seller.id,
      sellerNumber: seller.seller_number,
      name: seller.name ? decrypt(seller.name) : '',
      unreachable: seller.is_unreachable || false,
      isUnreachable: seller.is_unreachable || false,
      unreachableStatus: seller.unreachable_status || null,
      unreachableSince: seller.unreachable_since ? new Date(seller.unreachable_since) : undefined,
    };

    console.log('✅ Seller AA13489 API response:');
    console.log('  ID:', decryptedSeller.id);
    console.log('  Seller Number:', decryptedSeller.sellerNumber);
    console.log('  Name:', decryptedSeller.name);
    console.log('  unreachable:', decryptedSeller.unreachable);
    console.log('  isUnreachable:', decryptedSeller.isUnreachable);
    console.log('  unreachableStatus:', decryptedSeller.unreachableStatus);
    console.log('  unreachableSince:', decryptedSeller.unreachableSince);
    console.log('\n');

    // 検証
    if (decryptedSeller.unreachable === true) {
      console.log('✅ unreachable フィールドが正しく設定されています');
    } else {
      console.log('❌ unreachable フィールドが正しく設定されていません');
    }

    if (decryptedSeller.unreachableStatus === '不通') {
      console.log('✅ unreachableStatus フィールドが正しく設定されています');
    } else {
      console.log('❌ unreachableStatus フィールドが正しく設定されていません');
      console.log('   期待値: "不通"');
      console.log('   実際の値:', decryptedSeller.unreachableStatus);
    }

    if (decryptedSeller.unreachable === decryptedSeller.isUnreachable) {
      console.log('✅ unreachable と isUnreachable が一致しています（後方互換性OK）');
    } else {
      console.log('❌ unreachable と isUnreachable が一致していません');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAA13489ApiResponse();
