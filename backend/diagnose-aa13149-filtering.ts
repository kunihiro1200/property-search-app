// AA13149のフィルタリングロジックを詳細診断
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function diagnose() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== AA13149 フィルタリング診断 ===\n');

  // 物件情報を取得
  const { data: property } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13149')
    .single();

  console.log('物件情報:');
  console.log(`  種別: ${property.property_type}`);
  console.log(`  価格: ${property.sales_price?.toLocaleString()}円`);
  console.log(`  配信エリア: ${property.distribution_areas}\n`);

  // 全買主を取得
  const { data: allBuyers } = await supabase
    .from('buyers')
    .select('*')
    .order('reception_date', { ascending: false, nullsFirst: false });

  console.log(`総買主数: ${allBuyers?.length || 0}件\n`);

  // フィルタリング段階ごとにカウント
  let buyers = allBuyers || [];
  
  // 1. 配信種別フィルタ
  const withDistribution = buyers.filter(b => (b.distribution_type || '').trim() === '要');
  console.log(`1. 配信種別「要」: ${withDistribution.length}件`);
  
  // 2. 業者問合せ除外
  const nonBusiness = withDistribution.filter(b => {
    const inquirySource = (b.inquiry_source || '').trim();
    const distributionType = (b.distribution_type || '').trim();
    const brokerInquiry = (b.broker_inquiry || '').trim();
    
    const isBusiness = 
      inquirySource === '業者問合せ' || inquirySource.includes('業者') ||
      distributionType === '業者問合せ' || distributionType.includes('業者') ||
      (brokerInquiry && brokerInquiry !== '' && brokerInquiry !== '0' && brokerInquiry.toLowerCase() !== 'false');
    
    return !isBusiness;
  });
  console.log(`2. 業者問合せ除外後: ${nonBusiness.length}件`);

  // 3. 最低限の希望条件チェック
  const withCriteria = nonBusiness.filter(b => {
    const desiredArea = (b.desired_area || '').trim();
    const desiredPropertyType = (b.desired_property_type || '').trim();
    return desiredArea !== '' || desiredPropertyType !== '';
  });
  console.log(`3. 希望条件あり: ${withCriteria.length}件`);
  
  // 4. 最新状況フィルタ（買付・D除外）
  const withStatus = withCriteria.filter(b => {
    const latestStatus = (b.latest_status || '').trim();
    
    // 買付またはDを含む場合は除外
    if (latestStatus.includes('買付') || latestStatus.includes('D')) {
      return false;
    }
    
    return true;
  });
  console.log(`4. 最新状況フィルタ後（買付・D除外）: ${withStatus.length}件`);
  
  // 5. エリアマッチング
  const propertyAreas = (property.distribution_areas || '').match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶㊸]/g) || [];
  const withAreaMatch = withStatus.filter(b => {
    const desiredArea = (b.desired_area || '').trim();
    if (!desiredArea) return true;
    
    const buyerAreas = desiredArea.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶㊸]/g) || [];
    return propertyAreas.some(pa => buyerAreas.includes(pa));
  });
  console.log(`5. エリアマッチング後: ${withAreaMatch.length}件`);
  console.log(`   物件エリア: ${propertyAreas.join(', ')}`);
  
  // 6. 種別マッチング
  const withTypeMatch = withAreaMatch.filter(b => {
    const desiredType = (b.desired_property_type || '').trim();
    if (desiredType === '指定なし') return true;
    if (!desiredType) return false;
    
    const propertyType = property.property_type || '';
    const normalizedProperty = propertyType.replace(/中古|新築|一戸建て|一戸建|戸建て|分譲/g, '').trim();
    const normalizedDesired = desiredType.replace(/中古|新築|一戸建て|一戸建|戸建て|分譲/g, '').trim();
    
    return normalizedProperty === normalizedDesired || 
           normalizedProperty.includes(normalizedDesired) ||
           normalizedDesired.includes(normalizedProperty);
  });
  console.log(`6. 種別マッチング後: ${withTypeMatch.length}件`);
  console.log(`   物件種別: ${property.property_type}`);
  
  // サンプル表示
  if (withTypeMatch.length > 0) {
    console.log(`\n=== 適格買主サンプル（最初の3件） ===`);
    withTypeMatch.slice(0, 3).forEach((b, i) => {
      console.log(`\n${i + 1}. ${b.buyer_number}`);
      console.log(`   希望エリア: ${b.desired_area || '(未設定)'}`);
      console.log(`   希望種別: ${b.desired_property_type || '(未設定)'}`);
      console.log(`   最新状況: ${b.latest_status || '(未設定)'}`);
      console.log(`   問合せ時確度: ${b.inquiry_confidence || '(未設定)'}`);
    });
  }
}

diagnose();
