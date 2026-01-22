import { createClient } from '@supabase/supabase-js';
import { encrypt } from './src/utils/encryption';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 既存の平文データを暗号化する
 */
async function encryptExistingData() {
  console.log('🔐 既存データの暗号化を開始します...\n');

  try {
    // 全ての売主データを取得（ページネーションで全件取得）
    let allSellers: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: sellers, error } = await supabase
        .from('sellers')
        .select('id, name, address, phone_number, email')
        .order('id')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        throw new Error(`データ取得エラー: ${error.message}`);
      }

      if (!sellers || sellers.length === 0) {
        hasMore = false;
      } else {
        allSellers = allSellers.concat(sellers);
        console.log(`📥 ${allSellers.length}件のレコードを取得しました...`);
        
        if (sellers.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    const sellers = allSellers;

    if (!sellers || sellers.length === 0) {
      console.log('暗号化するデータがありません。');
      return;
    }

    console.log(`📊 ${sellers.length}件のレコードを処理します...\n`);

    let successCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    // バッチ処理
    for (let i = 0; i < sellers.length; i += batchSize) {
      const batch = sellers.slice(i, i + batchSize);
      console.log(`処理中: ${i + 1} - ${Math.min(i + batchSize, sellers.length)} / ${sellers.length}`);

      for (const seller of batch) {
        try {
          // データが既に暗号化されているかチェック（簡易的に長さで判定）
          const isAlreadyEncrypted = 
            seller.name && seller.name.length > 50 &&
            seller.address && seller.address.length > 50;

          if (isAlreadyEncrypted) {
            console.log(`  スキップ (既に暗号化済み): ID ${seller.id}`);
            successCount++;
            continue;
          }

          // 暗号化
          const updates: any = {};
          
          if (seller.name) {
            updates.name = encrypt(seller.name);
          }
          if (seller.address) {
            updates.address = encrypt(seller.address);
          }
          if (seller.phone_number) {
            updates.phone_number = encrypt(seller.phone_number);
          }
          if (seller.email) {
            updates.email = encrypt(seller.email);
          }

          // 更新
          const { error: updateError } = await supabase
            .from('sellers')
            .update(updates)
            .eq('id', seller.id);

          if (updateError) {
            console.error(`  ❌ エラー (ID ${seller.id}): ${updateError.message}`);
            errorCount++;
          } else {
            successCount++;
          }

        } catch (error: any) {
          console.error(`  ❌ 予期しないエラー (ID ${seller.id}): ${error.message}`);
          errorCount++;
        }
      }

      // 少し待機（レート制限対策）
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ 暗号化処理が完了しました！');
    console.log(`   成功: ${successCount}件`);
    console.log(`   エラー: ${errorCount}件`);

  } catch (error: any) {
    console.error('❌ 致命的なエラー:', error.message);
    process.exit(1);
  }
}

// 実行
encryptExistingData()
  .then(() => {
    console.log('\n🎉 全ての処理が完了しました！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
