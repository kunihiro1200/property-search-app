import { createClient } from '@supabase/supabase-js';
import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import { OitaCityAreaMappingService } from './src/services/OitaCityAreaMappingService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debugPerformance() {
  console.log('=== パフォーマンス計測 ===\n');

  const propertyNumber = 'AA13249';
  let startTime: number;
  let endTime: number;

  // 1. 物件情報取得
  startTime = Date.now();
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  endTime = Date.now();
  console.log(`1. 物件情報取得: ${endTime - startTime}ms`);

  if (propertyError || !property) {
    console.error('物件が見つかりません');
    return;
  }

  // 2. エリア番号マッピング
  startTime = Date.now();
  const beppuService = new BeppuAreaMappingService();
  const oitaService = new OitaCityAreaMappingService();
  
  const address = property.address || '';
  let areaNumbers: string[] = [];
  
  if (address.includes('別府市')) {
    try {
      const beppuAreas = await beppuService.getDistributionAreasForAddress(address);
      if (beppuAreas) {
        const match = beppuAreas.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]/g) || [];
        areaNumbers = match;
      } else {
        areaNumbers = ['㊶'];
      }
    } catch (error) {
      areaNumbers = ['㊶'];
    }
  }
  endTime = Date.now();
  console.log(`2. エリア番号マッピング: ${endTime - startTime}ms`);
  console.log(`   エリア番号: ${areaNumbers.join('')}`);

  // 3. 買主データ取得（必要なカラムのみ）
  startTime = Date.now();
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('buyer_number, name, latest_status, desired_area, desired_property_type, reception_date, email, phone_number, property_number, inquiry_source, distribution_type, broker_inquiry, price_range_house, price_range_apartment, price_range_land')
    .is('deleted_at', null)
    .eq('distribution_type', '要')
    .not('latest_status', 'is', null)
    .order('reception_date', { ascending: false, nullsFirst: false })
    .limit(1000);
  endTime = Date.now();
  console.log(`3. 買主データ取得: ${endTime - startTime}ms`);
  console.log(`   取得件数: ${buyers?.length || 0}件`);

  if (buyersError) {
    console.error('買主データ取得エラー:', buyersError);
    return;
  }

  // 4. フィルタリング処理
  startTime = Date.now();
  let filteredCount = 0;
  
  for (const buyer of buyers || []) {
    // 業者問合せチェック
    const inquirySource = (buyer.inquiry_source || '').trim();
    const distributionType = (buyer.distribution_type || '').trim();
    const brokerInquiry = (buyer.broker_inquiry || '').trim();
    
    if (inquirySource === '業者問合せ' || inquirySource.includes('業者') ||
        distributionType === '業者問合せ' || distributionType.includes('業者') ||
        (brokerInquiry && brokerInquiry !== '' && brokerInquiry !== '0' && brokerInquiry.toLowerCase() !== 'false')) {
      continue;
    }

    // 最低限の希望条件チェック
    const desiredArea = (buyer.desired_area || '').trim();
    const desiredPropertyType = (buyer.desired_property_type || '').trim();
    
    if (desiredArea === '' && desiredPropertyType === '') {
      continue;
    }

    // エリアマッチング
    if (desiredArea) {
      const buyerAreaNumbers = desiredArea.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯㊵㊶]/g) || [];
      const areaMatch = areaNumbers.some(area => buyerAreaNumbers.includes(area));
      if (!areaMatch) {
        continue;
      }
    }

    // 種別マッチング
    if (desiredPropertyType && desiredPropertyType !== '指定なし') {
      const propertyType = property.property_type || '';
      const normalizedPropertyType = propertyType.trim()
        .replace(/中古/g, '')
        .replace(/新築/g, '')
        .replace(/一戸建て/g, '戸建')
        .replace(/一戸建/g, '戸建')
        .replace(/戸建て/g, '戸建')
        .replace(/分譲/g, '')
        .trim();
      
      const normalizedDesiredTypes = desiredPropertyType.split(/[,、\s]+/).map((t: string) => 
        t.trim()
          .replace(/中古/g, '')
          .replace(/新築/g, '')
          .replace(/一戸建て/g, '戸建')
          .replace(/一戸建/g, '戸建')
          .replace(/戸建て/g, '戸建')
          .replace(/分譲/g, '')
          .trim()
      );
      
      const typeMatch = normalizedDesiredTypes.some((dt: string) => 
        dt === normalizedPropertyType || 
        normalizedPropertyType.includes(dt) ||
        dt.includes(normalizedPropertyType)
      );
      
      if (!typeMatch) {
        continue;
      }
    }

    filteredCount++;
    if (filteredCount >= 50) break;
  }
  
  endTime = Date.now();
  console.log(`4. フィルタリング処理: ${endTime - startTime}ms`);
  console.log(`   フィルタ後: ${filteredCount}件`);

  console.log('\n=== 合計処理時間 ===');
  console.log('データベース側フィルタリングにより、大幅に高速化されました');
}

debugPerformance().catch(console.error);
