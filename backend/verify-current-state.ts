import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCurrentState() {
  console.log('=== 現在の状態を確認 ===\n');

  // AA12923を検索
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('*')
    .ilike('seller_number', '%12923%');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!sellers || sellers.length === 0) {
    console.log('❌ AA12923が見つかりません');
    return;
  }

  const seller = sellers[0];
  console.log('✅ AA12923を発見\n');

  // 基本情報
  console.log('【基本情報】');
  console.log('ID:', seller.id);
  console.log('売主番号:', seller.seller_number);
  console.log('氏名:', decrypt(seller.name));
  console.log('');

  // 査定額（円単位）
  console.log('【査定額】');
  console.log('査定額1:', seller.valuation_amount_1, '円');
  console.log('査定額2:', seller.valuation_amount_2, '円');
  console.log('査定額3:', seller.valuation_amount_3, '円');
  console.log('');

  // 万円に変換して表示
  if (seller.valuation_amount_1) {
    console.log('査定額1（万円）:', seller.valuation_amount_1 / 10000, '万円');
  }
  if (seller.valuation_amount_2) {
    console.log('査定額2（万円）:', seller.valuation_amount_2 / 10000, '万円');
  }
  if (seller.valuation_amount_3) {
    console.log('査定額3（万円）:', seller.valuation_amount_3 / 10000, '万円');
  }
  console.log('');

  // コメント
  console.log('【コメント】');
  if (seller.comments) {
    console.log('コメント文字数:', seller.comments.length);
    console.log('コメント内容:');
    console.log(seller.comments);
  } else {
    console.log('❌ コメントがありません');
  }
  console.log('');

  // 固定資産税路線価
  console.log('【固定資産税路線価】');
  console.log('路線価:', seller.fixed_asset_tax_road_price);
  console.log('');

  // 判定
  console.log('【判定】');
  const hasValuation = seller.valuation_amount_1 || seller.valuation_amount_2 || seller.valuation_amount_3;
  const hasRoadPrice = seller.fixed_asset_tax_road_price;
  
  if (hasValuation && !hasRoadPrice) {
    console.log('✅ 手入力査定額として認識されます');
  } else if (hasValuation && hasRoadPrice) {
    console.log('✅ 自動計算査定額として認識されます');
  } else {
    console.log('⚠️  査定額が設定されていません');
  }
}

verifyCurrentState()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
