// property_listingsテーブルのstatusカラムの値を確認
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkStatusValues() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== property_listingsテーブルのstatusカラムの値を確認 ===\n');

  try {
    // 全てのユニークなstatus値を取得
    const { data, error } = await supabase
      .from('property_listings')
      .select('status')
      .limit(1000);

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️  データが見つかりません');
      return;
    }

    // ユニークな値を集計
    const statusCounts = new Map<string, number>();
    data.forEach(row => {
      const status = row.status || '(null)';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    console.log('ユニークなstatus値:');
    Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  - "${status}": ${count}件`);
      });

    console.log(`\n合計: ${data.length}件`);

    // site_displayカラムの存在確認
    console.log('\n=== site_displayカラムの存在確認 ===');
    const { data: sampleData, error: sampleError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ エラー:', sampleError.message);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      const columns = Object.keys(sampleData[0]);
      const hasSiteDisplay = columns.includes('site_display');
      
      if (hasSiteDisplay) {
        console.log('✅ site_displayカラムが存在します');
      } else {
        console.log('❌ site_displayカラムが存在しません');
        console.log('\n利用可能なカラム（一部）:');
        columns.slice(0, 20).forEach(col => console.log(`  - ${col}`));
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkStatusValues();
