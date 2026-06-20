import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

// .env.localを明示的に読み込む
const envPath = path.resolve(__dirname, '.env.local');
console.log('📁 Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env.local:', result.error);
  process.exit(1);
}

console.log('✅ .env.local loaded');
console.log('🔑 SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('🔑 SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
console.log('🔑 ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY ? 'Set' : 'Not set');
console.log('');

async function testDecryptionWithoutKey() {
  console.log('=== 暗号化キーなしでの復号化テスト ===\n');

  // Supabaseクライアントを作成
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // AA13483のデータを取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13483')
    .single();

  if (error || !seller) {
    console.error('❌ 売主が見つかりません:', error);
    return;
  }

  console.log('📊 データベースの生データ:');
  console.log('  ID:', seller.id);
  console.log('  売主番号:', seller.seller_number);
  console.log('  名前（暗号化）:', seller.name ? `${seller.name.substring(0, 50)}...` : 'null');
  console.log('  電話番号（暗号化）:', seller.phone_number ? `${seller.phone_number.substring(0, 50)}...` : 'null');
  console.log('  住所（暗号化）:', seller.address ? `${seller.address.substring(0, 50)}...` : 'null');
  console.log('');

  // 復号化を試みる
  console.log('🔓 復号化を試みます...');
  console.log('');

  try {
    const decryptedName = decrypt(seller.name);
    const decryptedPhone = decrypt(seller.phone_number);
    const decryptedAddress = decrypt(seller.address);

    console.log('✅ 復号化結果:');
    console.log('  名前:', decryptedName);
    console.log('  電話番号:', decryptedPhone);
    console.log('  住所:', decryptedAddress);
    console.log('');

    // 文字化けチェック
    const hasGarbledText = (text: string) => {
      // 文字化けの特徴: 連続した記号や制御文字
      return /[\x00-\x1F\x7F-\x9F]{3,}/.test(text) || /[�]{2,}/.test(text);
    };

    if (hasGarbledText(decryptedName) || hasGarbledText(decryptedPhone) || hasGarbledText(decryptedAddress)) {
      console.log('❌ 文字化けが検出されました');
    } else {
      console.log('✅ 文字化けなし - 正常に表示されています');
    }
  } catch (error) {
    console.error('❌ 復号化エラー:', error);
  }
}

testDecryptionWithoutKey().catch(console.error);
