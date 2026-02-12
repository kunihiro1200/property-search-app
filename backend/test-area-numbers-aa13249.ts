import { BuyerCandidateService } from './src/services/BuyerCandidateService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAreaNumbersAA13249() {
  console.log('=== 物件AA13249のエリア番号取得テスト ===\n');

  // 1. 物件情報を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13249')
    .single();

  if (error || !property) {
    console.error('物件AA13249が見つかりません:', error);
    return;
  }

  console.log('物件情報:');
  console.log('  物件番号:', property.property_number);
  console.log('  住所:', property.address);
  console.log('  distribution_areas:', property.distribution_areas);
  console.log('  distribution_area:', property.distribution_area);

  // 2. BuyerCandidateServiceを使用してエリア番号を取得
  console.log('\n=== BuyerCandidateService.getAreaNumbersForProperty() 実行 ===\n');
  
  const buyerCandidateService = new BuyerCandidateService();
  
  try {
    // getAreaNumbersForPropertyはprivateメソッドなので、
    // getCandidatesForPropertyを実行してログを確認
    const result = await buyerCandidateService.getCandidatesForProperty('AA13249');
    
    console.log('\n=== 結果 ===\n');
    console.log('物件のエリア番号:', result.property.distribution_areas);
    console.log('買主候補数:', result.total);
    
    if (result.property.distribution_areas) {
      const areaChars = result.property.distribution_areas.split('');
      console.log('エリア番号（分解）:', areaChars.join(', '));
    } else {
      console.log('❌ エリア番号が設定されていません');
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

testAreaNumbersAA13249().catch(console.error);
