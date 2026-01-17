import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testPerformanceMetricsService() {
  console.log('=== PerformanceMetricsService 直接テスト ===\n');

  try {
    const service = new PerformanceMetricsService();
    const month = '2025-11';

    console.log(`テスト対象月: ${month}\n`);

    // メトリクスを計算
    const metrics = await service.calculateMetrics(month);

    console.log('計算結果:');
    console.log(JSON.stringify(metrics, null, 2));

    console.log('\n=== 検証結果 ===');
    console.log(`訪問査定取得数: ${metrics.visitAppraisalCount} 件`);
    console.log(`訪問査定取得割合: ${metrics.visitAppraisalRate.toFixed(2)}%`);
    console.log(`期待値: 24 件`);
    console.log(`結果: ${metrics.visitAppraisalCount === 24 ? '✅ 成功！修正が正しく適用されています' : `❌ 失敗（差分: ${24 - metrics.visitAppraisalCount} 件）`}`);

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

testPerformanceMetricsService();
