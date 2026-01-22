import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseRelatedBuyerFeature() {
  console.log('=== 買主関連表示機能 診断 ===\n');

  // 1. インデックスの確認
  console.log('1. インデックスの確認...');
  let indexes = null;
  let indexError = null;
  
  try {
    const result = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'buyers' 
        AND indexname IN ('idx_buyers_phone_number', 'idx_buyers_email')
      `
    });
    indexes = result.data;
    indexError = result.error;
  } catch (e) {
    console.log('⚠️  RPC exec_sql not available, skipping index check');
  }

  if (indexError) {
    console.log('⚠️  インデックス確認エラー（直接SQLで確認が必要）');
  } else if (!indexes || indexes.length === 0) {
    console.log('❌ インデックスが見つかりません');
    console.log('   → マイグレーションが正しく実行されていない可能性があります');
  } else {
    console.log('✅ インデックスが存在します:');
    indexes.forEach((idx: any) => console.log(`   - ${idx.indexname}`));
  }

  // 2. 買主データの確認
  console.log('\n2. 買主データの確認...');
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, phone_number, email, property_number')
    .limit(5);

  if (buyersError) {
    console.log('❌ 買主データ取得エラー:', buyersError.message);
  } else if (!buyers || buyers.length === 0) {
    console.log('⚠️  買主データが存在しません');
  } else {
    console.log(`✅ 買主データ: ${buyers.length}件取得`);
    console.log('   サンプル:', buyers[0]);
  }

  // 3. 関連買主の検索テスト
  console.log('\n3. 関連買主の検索テスト...');
  if (buyers && buyers.length > 0) {
    const testBuyer = buyers[0];
    console.log(`   テスト対象: ${testBuyer.name} (${testBuyer.buyer_number})`);
    console.log(`   電話番号: ${testBuyer.phone_number}`);
    console.log(`   メール: ${testBuyer.email}`);

    if (testBuyer.phone_number || testBuyer.email) {
      const { data: relatedBuyers, error: relatedError } = await supabase
        .from('buyers')
        .select('*')
        .neq('id', testBuyer.id)
        .or(`phone_number.eq.${testBuyer.phone_number},email.eq.${testBuyer.email}`)
        .limit(10);

      if (relatedError) {
        console.log('❌ 関連買主検索エラー:', relatedError.message);
      } else {
        console.log(`✅ 関連買主: ${relatedBuyers?.length || 0}件`);
        if (relatedBuyers && relatedBuyers.length > 0) {
          relatedBuyers.forEach((rb: any) => {
            console.log(`   - ${rb.name} (${rb.buyer_number}) - 物件: ${rb.property_number}`);
          });
        }
      }
    } else {
      console.log('⚠️  電話番号・メールアドレスが空のため、関連買主を検索できません');
    }
  }

  // 4. 同じ電話番号を持つ買主の確認
  console.log('\n4. 重複する電話番号・メールアドレスの確認...');
  let duplicatePhones = null;
  let dupPhoneError = null;
  
  try {
    const result = await supabase.rpc('exec_sql', {
      sql: `
        SELECT phone_number, COUNT(*) as count
        FROM buyers
        WHERE phone_number IS NOT NULL AND phone_number != ''
        GROUP BY phone_number
        HAVING COUNT(*) > 1
        LIMIT 5
      `
    });
    duplicatePhones = result.data;
    dupPhoneError = result.error;
  } catch (e) {
    console.log('⚠️  RPC exec_sql not available, using alternative query');
  }

  if (!dupPhoneError && duplicatePhones && duplicatePhones.length > 0) {
    console.log(`✅ 重複する電話番号: ${duplicatePhones.length}件`);
    duplicatePhones.forEach((dp: any) => {
      console.log(`   - ${dp.phone_number}: ${dp.count}件`);
    });
  } else {
    console.log('⚠️  重複する電話番号が見つかりません');
  }

  // 5. APIエンドポイントのテスト（ローカルサーバーが起動している場合）
  console.log('\n5. APIエンドポイントのテスト...');
  if (buyers && buyers.length > 0) {
    const testBuyerId = buyers[0].id;
    console.log(`   テストURL: http://localhost:3000/api/buyers/${testBuyerId}/related`);
    console.log(`   テストURL: http://localhost:3000/api/buyers/${testBuyerId}/unified-inquiry-history`);
    console.log('   ※ バックエンドサーバーが起動している場合、ブラウザまたはcurlでテストしてください');
  }

  console.log('\n=== 診断完了 ===');
  console.log('\n次のステップ:');
  console.log('1. インデックスが存在しない場合 → マイグレーションを再実行');
  console.log('2. 関連買主が見つからない場合 → 同じ電話番号・メールアドレスを持つ買主データを確認');
  console.log('3. バックエンドサーバーを起動: npm run dev');
  console.log('4. ブラウザのコンソールでエラーを確認');
  console.log('5. ネットワークタブでAPIリクエストを確認');
}

diagnoseRelatedBuyerFeature().catch(console.error);
