import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAllBuyersByEmail() {
  const email = 'kouten0909@icloud.com';
  
  console.log(`=== ${email} の全買主レコード調査 ===\n`);

  // メールアドレスで全ての買主を取得
  const { data: buyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, name, email, desired_area, desired_property_type, distribution_type, pinrich, latest_status')
    .eq('email', email)
    .order('buyer_number');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`見つかった買主レコード数: ${buyers?.length || 0}\n`);

  if (!buyers || buyers.length === 0) {
    console.log('該当する買主が見つかりませんでした');
    return;
  }

  // 全ての希望エリアを収集
  const allDesiredAreas = new Set<string>();
  
  buyers.forEach((buyer, index) => {
    console.log(`${index + 1}. 買主番号: ${buyer.buyer_number}`);
    console.log(`   名前: ${buyer.name}`);
    console.log(`   希望エリア (desired_area): ${buyer.desired_area || 'なし'}`);
    console.log(`   希望物件タイプ: ${buyer.desired_property_type || 'なし'}`);
    console.log(`   配信タイプ: ${buyer.distribution_type || 'なし'}`);
    console.log(`   Pinrich: ${buyer.pinrich || 'なし'}`);
    console.log(`   最新ステータス: ${buyer.latest_status || 'なし'}`);
    console.log('');

    // 希望エリアを収集
    if (buyer.desired_area) {
      const areas = buyer.desired_area.split('');
      areas.forEach((area: string) => allDesiredAreas.add(area));
    }
  });

  // 統合された希望エリア
  console.log('=== 統合情報 ===');
  console.log(`全買主レコードの希望エリアを統合: ${Array.from(allDesiredAreas).join('')}`);
  console.log(`ユニークなエリア数: ${allDesiredAreas.size}`);

  // 物件AA4160の配信エリアと比較
  console.log('\n=== 物件AA4160との比較 ===');
  const { data: property } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA4160')
    .single();

  if (property) {
    console.log(`物件番号: ${property.property_number}`);
    console.log(`住所: ${property.address}`);
    console.log(`配信エリア: ${property.distribution_areas}`);
    
    // 物件の配信エリアを解析
    const propertyAreasStr = property.distribution_areas || '';
    console.log(`\n物件の配信エリアに含まれる文字: ${propertyAreasStr.split('').join(', ')}`);
    
    // マッチング確認
    const buyerAreasArray = Array.from(allDesiredAreas);
    const propertyAreasArray = propertyAreasStr.split('');
    
    const matchingAreas = buyerAreasArray.filter(area => propertyAreasArray.includes(area));
    
    console.log(`\nマッチング結果:`);
    if (matchingAreas.length > 0) {
      console.log(`✅ 共通エリアあり: ${matchingAreas.join('')}`);
    } else {
      console.log(`❌ 共通エリアなし`);
      console.log(`  買主の全希望エリア: ${buyerAreasArray.join('')}`);
      console.log(`  物件の配信エリア: ${propertyAreasArray.join('')}`);
    }
  }

  // 配信フィルタリングの問題点を分析
  console.log('\n=== 配信フィルタリングの問題点 ===');
  console.log('1. 買主テーブルに`distribution_areas`カラムが存在しない');
  console.log('2. 各買主レコードは`desired_area`のみを持っている');
  console.log('3. 配信システムは存在しない`distribution_areas`を参照している');
  console.log('4. 同じメールアドレスの複数レコードを統合する仕組みがない');
  
  console.log('\n=== 推奨される解決策 ===');
  console.log('オプション1: メールアドレスごとに全ての`desired_area`を統合して配信判定');
  console.log('オプション2: 買主テーブルに`distribution_areas`カラムを追加し、`desired_area`を変換');
  console.log('オプション3: 配信サービスで同じメールアドレスの全レコードを取得して統合判定');
}

checkAllBuyersByEmail().catch(console.error);
