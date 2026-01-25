// パノラマURL同期結果を確認
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkPanoramaSyncResult() {
  try {
    console.log('🔍 パノラマURL同期結果を確認中...\n');
    
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // athome_dataの2番目の要素（パノラマURL）が存在する物件を取得
    const { data, error } = await supabase
      .from('property_details')
      .select('property_number, athome_data')
      .not('athome_data', 'is', null);
    
    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }
    
    let withPanorama = 0;
    let withoutPanorama = 0;
    const propertiesWithPanorama: string[] = [];
    
    for (const property of data) {
      if (property.athome_data && Array.isArray(property.athome_data) && property.athome_data.length > 1) {
        const panoramaUrl = property.athome_data[1];
        if (panoramaUrl && panoramaUrl.includes('vrpanorama.athome.jp')) {
          withPanorama++;
          propertiesWithPanorama.push(property.property_number);
        } else {
          withoutPanorama++;
        }
      } else {
        withoutPanorama++;
      }
    }
    
    console.log('========================================');
    console.log('📊 パノラマURL同期結果');
    console.log('========================================\n');
    console.log(`✅ パノラマURLあり: ${withPanorama}件`);
    console.log(`⚠️ パノラマURLなし: ${withoutPanorama}件`);
    console.log(`📋 合計: ${data.length}件\n`);
    
    console.log('========================================');
    console.log('📋 パノラマURLがある物件（最初の20件）');
    console.log('========================================\n');
    propertiesWithPanorama.slice(0, 20).forEach((propertyNumber, index) => {
      console.log(`${index + 1}. ${propertyNumber}`);
    });
    
    if (propertiesWithPanorama.length > 20) {
      console.log(`\n... 他 ${propertiesWithPanorama.length - 20}件`);
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkPanoramaSyncResult();
