import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTargetProperties() {
  console.log('=== 格納先URL取得対象の物件を確認 ===\n');

  try {
    // 条件:
    // 1. storage_locationが空
    // 2. 以下の成約済み物件を除外:
    //    - 「非公開（専任）」
    //    - 「非公開（一般）」
    //    - 「E外し非公開」
    // 3. 「非公開（配信メールのみ）」は対象に含める
    
    const { data: properties, error, count } = await supabase
      .from('property_listings')
      .select('id, property_number, atbb_status', { count: 'exact' })
      .is('storage_location', null)
      .not('atbb_status', 'ilike', '%非公開（専任）%')
      .not('atbb_status', 'ilike', '%非公開（一般）%')
      .not('atbb_status', 'ilike', '%E外し非公開%');

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    console.log(`📊 統計:`);
    console.log(`  - 対象物件数: ${count}件`);
    console.log('');

    if (properties && properties.length > 0) {
      console.log('対象物件（最初の30件）:');
      properties.slice(0, 30).forEach((prop, index) => {
        console.log(`  ${index + 1}. ${prop.property_number} (${prop.atbb_status || '状態未設定'})`);
      });
      
      if (properties.length > 30) {
        console.log(`  ... 他 ${properties.length - 30}件`);
      }
      
      console.log('');
      console.log('=== ATBB状況の内訳 ===');
      const statusCounts = new Map<string, number>();
      properties.forEach(prop => {
        const status = prop.atbb_status || '未設定';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });
      
      Array.from(statusCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          console.log(`  - ${status}: ${count}件`);
        });
    } else {
      console.log('対象物件はありません。');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkTargetProperties();
