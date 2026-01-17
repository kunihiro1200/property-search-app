import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testExclusiveContracts() {
  console.log('=== 専任媒介件数の検証（2025年11月） ===\n');

  try {
    // 1. データベースから直接確認
    console.log('1. データベースから直接確認');
    console.log('─────────────────────────────────────────────────────────');
    
    const startDate = '2025-11-01';
    const endDate = '2025-11-30T23:59:59';

    const { data: dbData, error: dbError } = await supabase
      .from('sellers')
      .select('seller_number, status, visit_assignee, visit_date')
      .eq('status', '専任媒介')
      .not('visit_assignee', 'is', null)
      .neq('visit_assignee', '')
      .gte('visit_date', startDate)
      .lte('visit_date', endDate)
      .not('confidence', 'in', '("D","ダブり")');

    if (dbError) {
      console.error('   ❌ エラー:', dbError.message);
    } else {
      console.log(`   専任媒介件数: ${dbData?.length || 0} 件`);
      console.log(`   ✅ 期待値: 8件\n`);
      
      if (dbData && dbData.length > 0) {
        console.log('   データ詳細:');
        dbData.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.seller_number} - 営担: ${row.visit_assignee}, 訪問日: ${row.visit_date}`);
        });
        console.log('');
      }
    }

    // 2. サービス層から確認
    console.log('2. PerformanceMetricsService の動作確認');
    console.log('─────────────────────────────────────────────────────────');
    
    const service = new PerformanceMetricsService();
    const metrics = await service.calculateMetrics('2025-11');

    console.log(`   専任媒介件数: ${metrics.exclusiveContracts.total.count} 件`);
    console.log(`   専任媒介割合: ${metrics.exclusiveContracts.total.rate.toFixed(2)}%`);
    console.log(`   ✅ 期待値: 8件\n`);

    if (metrics.exclusiveContracts.byRepresentative.length > 0) {
      console.log('   営担別の内訳:');
      metrics.exclusiveContracts.byRepresentative.forEach(rep => {
        console.log(`   - ${rep.representative}: ${rep.count}件 (${rep.rate.toFixed(2)}%)`);
      });
      console.log('');
    }

    // 3. 最終判定
    console.log('3. 最終判定');
    console.log('─────────────────────────────────────────────────────────');
    
    const dbCount = dbData?.length || 0;
    const serviceCount = metrics.exclusiveContracts.total.count;
    const allMatch = dbCount === 8 && serviceCount === 8;

    if (allMatch) {
      console.log('   ✅ すべてのテストが合格しました！');
      console.log('   ✅ データベース: 8件');
      console.log('   ✅ サービス層: 8件');
      console.log('\n   🎉 修正は完全に成功しています！');
    } else {
      console.log('   ⚠️  一部のテストで不一致があります:');
      console.log(`   - データベース: ${dbCount} 件 ${dbCount === 8 ? '✅' : '❌'}`);
      console.log(`   - サービス層: ${serviceCount} 件 ${serviceCount === 8 ? '✅' : '❌'}`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   検証完了                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

testExclusiveContracts();
