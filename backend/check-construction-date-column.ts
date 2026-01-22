// construction_dateカラムの存在確認スクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkConstructionDateColumn() {
  console.log('=== construction_dateカラムの存在確認 ===\n');

  try {
    // 1. カラムの存在確認
    console.log('1. カラムの存在確認...');
    const { error: columnError } = await supabase
      .from('property_listings')
      .select('construction_year_month')
      .limit(1);

    if (columnError) {
      console.error('❌ construction_year_monthカラムが存在しません:', columnError.message);
      console.log('\n注意: カラム名がconstruction_dateではなくconstruction_year_monthの可能性があります');
    } else {
      console.log('✅ construction_year_monthカラムが存在します');
    }

    // 2. サンプルデータの確認
    console.log('\n2. サンプルデータの確認...');
    const { data: samples, error: sampleError } = await supabase
      .from('property_listings')
      .select('property_number, property_type, construction_year_month')
      .not('construction_year_month', 'is', null)
      .limit(10);

    if (sampleError) {
      console.error('❌ サンプルデータの取得に失敗:', sampleError.message);
    } else if (samples && samples.length > 0) {
      console.log(`✅ ${samples.length}件のサンプルデータを取得:`);
      samples.forEach(sample => {
        console.log(`  - ${sample.property_number} (${sample.property_type}): ${sample.construction_year_month}`);
      });
    } else {
      console.log('⚠️  construction_year_monthにデータがある物件が見つかりませんでした');
    }

    // 3. データ形式の確認
    console.log('\n3. データ形式の確認...');
    if (samples && samples.length > 0) {
      const formats = {
        'YYYY-MM': 0,
        'YYYY/MM': 0,
        'YYYYMM': 0,
        'YYYY年MM月': 0,
        'その他': 0
      };

      samples.forEach(sample => {
        const value = sample.construction_year_month;
        if (/^\d{4}-\d{1,2}$/.test(value)) {
          formats['YYYY-MM']++;
        } else if (/^\d{4}\/\d{1,2}$/.test(value)) {
          formats['YYYY/MM']++;
        } else if (/^\d{6}$/.test(value)) {
          formats['YYYYMM']++;
        } else if (/^\d{4}年\d{1,2}月$/.test(value)) {
          formats['YYYY年MM月']++;
        } else {
          formats['その他']++;
        }
      });

      console.log('データ形式の分布:');
      Object.entries(formats).forEach(([format, count]) => {
        if (count > 0) {
          console.log(`  - ${format}: ${count}件`);
        }
      });
    }

    // 4. 物件タイプ別のデータ確認
    console.log('\n4. 物件タイプ別のデータ確認...');
    const { data: byType, error: typeError } = await supabase
      .from('property_listings')
      .select('property_type, construction_year_month')
      .not('construction_year_month', 'is', null);

    if (typeError) {
      console.error('❌ 物件タイプ別データの取得に失敗:', typeError.message);
    } else if (byType) {
      const typeCounts: Record<string, number> = {};
      byType.forEach(row => {
        const type = row.property_type || '未設定';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      console.log('物件タイプ別のconstruction_year_monthデータ件数:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}件`);
      });
    }

    console.log('\n=== 確認完了 ===');
    console.log('\n結論:');
    console.log('- カラム名は construction_year_month です（construction_dateではありません）');
    console.log('- フロントエンドの型定義とコンポーネントでこのカラム名を使用してください');

  } catch (error: any) {
    console.error('エラーが発生しました:', error.message);
  }
}

checkConstructionDateColumn();
