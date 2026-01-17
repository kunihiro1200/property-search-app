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

async function diagnoseAA12766() {
  console.log('=== AA12766 配信エリア診断 ===\n');
  
  // 1. データベースから物件情報を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('property_number, address, distribution_areas')
    .eq('property_number', 'AA12766')
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
  
  // 3. データベースで「石垣東」のマッピングを確認
  console.log('【「石垣東」のマッピング確認】');
  const { data: mappings, error: mappingError } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .ilike('region_name', '%石垣東%')
    .order('region_name');
  
  if (mappingError) {
    console.error('マッピング取得エラー:', mappingError.message);
  } else if (mappings && mappings.length > 0) {
    mappings.forEach((m: any) => {
      console.log(`  ${m.region_name}: ${m.distribution_areas} (${m.school_district || 'N/A'})`);
    });
  } else {
    console.log('  (マッピングが見つかりません)');
  }
  console.log('');
  
  // 4. 期待値との比較
  console.log('【期待値との比較】');
  console.log(`期待値: ⑩⑭㊶㊸`);
  console.log(`実際の値: ${property.distribution_areas}`);
  console.log('');
  
  // 5. 問題の原因を分析
  console.log('【問題分析】');
  
  // 住所から地域名を抽出
  const addressClean = property.address.replace(/大分県/g, '').replace(/別府市/g, '');
  console.log(`クリーンな住所: ${addressClean}`);
  
  // 丁目パターンをチェック
  const choMeMatch = addressClean.match(/([^\s\d]+?)[\d０-９]+丁目/);
  if (choMeMatch) {
    console.log(`抽出された地域名: ${choMeMatch[1]}`);
    
    // この地域名でデータベースを検索
    const { data: exactMatch } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .eq('region_name', choMeMatch[1]);
    
    if (exactMatch && exactMatch.length > 0) {
      console.log(`\nデータベース内の「${choMeMatch[1]}」のマッピング:`);
      exactMatch.forEach((m: any) => {
        console.log(`  ${m.region_name}: ${m.distribution_areas} (${m.school_district || 'N/A'})`);
      });
    } else {
      console.log(`\n「${choMeMatch[1]}」のマッピングがデータベースに存在しません`);
    }
  }
  
  console.log('\n【推奨アクション】');
  console.log('1. 「石垣東」のマッピングデータを確認');
  console.log('2. 石垣東4-10丁目が⑩⑭㊸にマッピングされているか確認');
  console.log('3. 必要に応じてマッピングデータを修正');
  console.log('4. 物件の配信エリアを再計算');
}

diagnoseAA12766().catch(console.error);
