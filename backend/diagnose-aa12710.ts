import { createClient } from '@supabase/supabase-js';
import { BeppuAreaMappingService } from './src/services/BeppuAreaMappingService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const beppuService = new BeppuAreaMappingService();

async function diagnoseAA12710() {
  console.log('=== AA12710 配信エリア診断 ===\n');
  
  // 1. データベースから物件情報を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA12710')
    .single();
  
  if (error || !property) {
    console.error('物件が見つかりません:', error?.message);
    return;
  }
  
  console.log('【物件情報】');
  console.log(`物件番号: ${property.property_number}`);
  console.log(`住所: ${property.address}`);
  console.log(`現在の配信エリア: ${property.distribution_areas}`);
  console.log('');
  
  // 2. 住所から地域名を抽出してマッピングを確認
  console.log('【別府市エリアマッピング確認】');
  const cityWideAreas = await beppuService.getDistributionAreasForAddress(property.address);
  console.log(`住所ベースのエリア: ${cityWideAreas || '(見つかりません)'}`);
  console.log('');
  
  // 3. 住所から地域名を抽出
  const addressClean = property.address.replace(/大分県/g, '').replace(/別府市/g, '');
  console.log(`クリーンな住所: ${addressClean}`);
  
  // 4. 期待値との比較
  console.log('\n【期待値との比較】');
  console.log(`期待値: ⑭㊶`);
  console.log(`実際の値: ${property.distribution_areas}`);
  console.log(`住所ベース: ${cityWideAreas}`);
  
  // 5. 問題分析
  console.log('\n【問題分析】');
  if (property.distribution_areas !== '⑭㊶') {
    console.log('❌ 配信エリアが期待値と一致しません');
    console.log(`   余分なエリア: ${property.distribution_areas.replace(/[⑭㊶]/g, '')}`);
  }
  
  if (cityWideAreas !== '⑭㊶') {
    console.log('❌ 住所ベースの計算結果が期待値と一致しません');
    console.log('   データベースのマッピングデータを確認する必要があります');
  }
  
  console.log('\n【推奨アクション】');
  console.log('1. 住所から抽出された地域名を確認');
  console.log('2. その地域のマッピングデータを確認');
  console.log('3. 必要に応じてマッピングデータを修正');
  console.log('4. 物件の配信エリアを再計算');
}

diagnoseAA12710().catch(console.error);
