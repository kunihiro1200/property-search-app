// AA5852とoscar.yag74@gmail.comの買い主フィルタリングを調査
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from './src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAA5852BuyerOscar() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852とoscar.yag74@gmail.comの調査 ===\n');

  // 1. AA5852の物件情報を取得
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA5852')
    .single();

  if (propError) {
    console.error('物件取得エラー:', propError.message);
    return;
  }

  console.log('【物件情報: AA5852】');
  console.log(`物件番号: ${property.property_number}`);
  
  let address = property.address;
  try {
    address = decrypt(address);
  } catch (e) {
    // 復号化失敗
  }
  console.log(`住所: ${address}`);
  console.log(`配信エリア: ${JSON.stringify(property.distribution_areas)}`);

  // 2. oscar.yag74@gmail.comの買い主情報を取得
  const { data: buyers, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('email', 'oscar.yag74@gmail.com');

  if (buyerError) {
    console.error('買い主取得エラー:', buyerError.message);
    return;
  }

  console.log(`\n【買い主情報: oscar.yag74@gmail.com】`);
  console.log(`該当する買い主: ${buyers?.length || 0}件\n`);

  for (const buyer of buyers || []) {
    console.log(`買い主ID: ${buyer.id}`);
    console.log(`買い主番号: ${buyer.buyer_number}`);
    console.log(`ステータス: ${buyer.latest_status}`);
    console.log(`配信タイプ: ${buyer.distribution_type}`);
    console.log(`希望エリア: ${JSON.stringify(buyer.desired_area)}`);
    console.log(`物件番号: ${buyer.property_number}`);
    console.log('');
  }

  // 3. フィルタリング条件をチェック
  console.log('【フィルタリング条件チェック】');
  
  // distribution_areasが文字列の場合はパース
  let propertyAreas = property.distribution_areas || [];
  if (typeof propertyAreas === 'string') {
    try {
      propertyAreas = JSON.parse(propertyAreas);
    } catch {
      propertyAreas = [];
    }
  }
  if (!Array.isArray(propertyAreas)) {
    propertyAreas = [];
  }
  
  for (const buyer of buyers || []) {
    console.log(`\n買い主番号: ${buyer.buyer_number}`);
    console.log(`全フィールド:`, Object.keys(buyer));
    
    // ステータスチェック
    const validStatuses = ['配信中', '配信停止中', '配信希望'];
    const statusOk = validStatuses.includes(buyer.latest_status);
    console.log(`  ステータスOK (${buyer.latest_status}): ${statusOk ? '✓' : '✗'}`);
    
    // 配信タイプチェック
    const typeOk = buyer.distribution_type === '配信中' || buyer.distribution_type === '配信希望';
    console.log(`  配信タイプOK (${buyer.distribution_type}): ${typeOk ? '✓' : '✗'}`);
    
    // エリアマッチチェック
    let buyerAreas: string[] = [];
    const desiredArea = buyer.desired_area;
    
    if (typeof desiredArea === 'string') {
      // JSONとしてパースを試みる
      try {
        buyerAreas = JSON.parse(desiredArea);
      } catch {
        // JSONでない場合、丸数字を個別に抽出
        const circledNumbers = desiredArea.match(/[①-㊿]/g);
        if (circledNumbers) {
          buyerAreas = circledNumbers;
        }
      }
    } else if (Array.isArray(desiredArea)) {
      buyerAreas = desiredArea;
    }
    
    console.log(`  希望エリア(生データ): ${desiredArea}`);
    console.log(`  希望エリア(パース後): ${buyerAreas.join(', ')}`);
    
    const areaMatch = propertyAreas.some((area: string) => buyerAreas.includes(area));
    console.log(`  物件エリア: ${propertyAreas.join(', ')}`);
    console.log(`  エリアマッチ: ${areaMatch ? '✓' : '✗'}`);
    
    // 総合判定
    const shouldMatch = (statusOk || typeOk) && areaMatch;
    console.log(`  → フィルタリング結果: ${shouldMatch ? '✓ 含まれるべき' : '✗ 除外される'}`);
  }
}

checkAA5852BuyerOscar().catch(console.error);
