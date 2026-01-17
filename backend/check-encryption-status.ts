import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 暗号化状態をチェックする
 */
async function checkEncryptionStatus() {
  console.log('🔍 暗号化状態をチェックします...\n');

  try {
    // 最初の100件を取得
    const { data: sellers, error } = await supabase
      .from('sellers')
      .select('id, name, address, phone_number, email')
      .order('id')
      .limit(100);

    if (error) {
      throw new Error(`データ取得エラー: ${error.message}`);
    }

    if (!sellers || sellers.length === 0) {
      console.log('データがありません。');
      return;
    }

    console.log(`📊 ${sellers.length}件のレコードをチェックします...\n`);

    let encryptedCount = 0;
    let plaintextCount = 0;
    let errorCount = 0;
    const problematicIds: string[] = [];

    for (const seller of sellers) {
      try {
        // 復号化を試みる
        if (seller.name) {
          decrypt(seller.name);
        }
        if (seller.address) {
          decrypt(seller.address);
        }
        if (seller.phone_number) {
          decrypt(seller.phone_number);
        }
        if (seller.email) {
          decrypt(seller.email);
        }
        
        encryptedCount++;
        console.log(`✅ ID ${seller.id}: 正常に暗号化されています`);
      } catch (error: any) {
        // 暗号化されていないか、破損している
        const isPlaintext = seller.name && seller.name.length < 50;
        
        if (isPlaintext) {
          plaintextCount++;
          console.log(`⚠️  ID ${seller.id}: 平文のままです`);
        } else {
          errorCount++;
          console.log(`❌ ID ${seller.id}: 復号化エラー - ${error.message}`);
          problematicIds.push(seller.id);
        }
      }
    }

    console.log('\n📊 結果:');
    console.log(`   正常に暗号化: ${encryptedCount}件`);
    console.log(`   平文: ${plaintextCount}件`);
    console.log(`   エラー: ${errorCount}件`);

    if (problematicIds.length > 0) {
      console.log('\n❌ 問題のあるレコードID:');
      problematicIds.forEach(id => console.log(`   - ${id}`));
    }

  } catch (error: any) {
    console.error('❌ 致命的なエラー:', error.message);
    process.exit(1);
  }
}

// 実行
checkEncryptionStatus()
  .then(() => {
    console.log('\n✅ チェック完了！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
