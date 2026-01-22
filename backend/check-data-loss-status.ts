import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDataLossStatus() {
  console.log('=== データ消失状況の確認 ===\n');

  try {
    // 物件リストの確認
    console.log('📊 物件リスト (property_listings) の確認...');
    const { data: properties, error: propError, count: propCount } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (propError) {
      console.error('❌ エラー:', propError.message);
    } else {
      console.log(`✅ 物件数: ${propCount}件`);
      if (properties && properties.length > 0) {
        console.log('最初の5件のサンプル:');
        properties.forEach(p => {
          console.log(`  - ${p.property_number}: ${p.address || '住所なし'}`);
        });
      } else {
        console.log('⚠️ データが0件です');
      }
    }
    console.log('');

    // 買主リストの確認
    console.log('📊 買主リスト (buyers) の確認...');
    const { data: buyers, error: buyerError, count: buyerCount } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (buyerError) {
      console.error('❌ エラー:', buyerError.message);
    } else {
      console.log(`✅ 買主数: ${buyerCount}件`);
      if (buyers && buyers.length > 0) {
        console.log('最初の5件のサンプル:');
        buyers.forEach(b => {
          console.log(`  - 買主番号 ${b.buyer_number}: ${b.name || '名前なし'}`);
        });
      } else {
        console.log('⚠️ データが0件です');
      }
    }
    console.log('');

    // 売主リストの確認
    console.log('📊 売主リスト (sellers) の確認...');
    const { data: sellers, error: sellerError, count: sellerCount } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (sellerError) {
      console.error('❌ エラー:', sellerError.message);
    } else {
      console.log(`✅ 売主数: ${sellerCount}件`);
      if (sellers && sellers.length > 0) {
        console.log('最初の5件のサンプル:');
        sellers.forEach(s => {
          console.log(`  - ${s.seller_number}: ${s.name || '名前なし'}`);
        });
      } else {
        console.log('⚠️ データが0件です');
      }
    }
    console.log('');

    // サマリー
    console.log('=== サマリー ===');
    console.log(`物件: ${propCount}件`);
    console.log(`買主: ${buyerCount}件`);
    console.log(`売主: ${sellerCount}件`);
    
    if (propCount === 0 || buyerCount === 0 || sellerCount === 0) {
      console.log('\n⚠️ データ消失が確認されました');
      console.log('次のステップ: スプレッドシートからデータを復元する必要があります');
    } else {
      console.log('\n✅ データは存在しています');
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

checkDataLossStatus();
