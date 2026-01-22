/**
 * メトリクスクリーンアップジョブ
 * 古いメトリクスデータを定期的に削除
 */

import { SyncMetricsCollector } from '../services/SyncMetricsCollector';
import { MetricsAggregator } from '../services/MetricsAggregator';

const metricsCollector = new SyncMetricsCollector();
const metricsAggregator = new MetricsAggregator();

/**
 * メトリクスクリーンアップを実行
 */
export async function runMetricsCleanup(): Promise<void> {
  console.log('🧹 メトリクスクリーンアップを開始...');

  try {
    // 古い詳細メトリクスを削除（7日より古い）
    await metricsCollector.cleanupOldMetrics();

    // 古い集計メトリクスを削除
    await metricsAggregator.cleanupOldAggregatedMetrics();

    console.log('✅ メトリクスクリーンアップが完了しました');
  } catch (error) {
    console.error('❌ メトリクスクリーンアップエラー:', error);
    throw error;
  }
}

/**
 * メトリクス集計を実行
 */
export async function runMetricsAggregation(): Promise<void> {
  console.log('📊 メトリクス集計を開始...');

  try {
    // 時間単位で集計
    await metricsAggregator.aggregateHourly();

    // 日単位で集計
    await metricsAggregator.aggregateDaily();

    console.log('✅ メトリクス集計が完了しました');
  } catch (error) {
    console.error('❌ メトリクス集計エラー:', error);
    throw error;
  }
}

// スタンドアロン実行の場合
if (require.main === module) {
  (async () => {
    try {
      await runMetricsAggregation();
      await runMetricsCleanup();
      process.exit(0);
    } catch (error) {
      console.error('エラー:', error);
      process.exit(1);
    }
  })();
}
