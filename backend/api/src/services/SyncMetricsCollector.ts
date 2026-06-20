/**
 * 同期メトリクス収集サービス
 * 物件リスト同期のメトリクスを収集・記録する
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SyncMetrics {
  syncId: string;
  successCount: number;
  errorCount: number;
  totalCount: number;
  durationSeconds: number;
  throughput: number; // 件/秒
  errorsByType: Record<string, number>;
  apiResponseTimes: number[]; // ミリ秒
  circuitBreakerState: 'closed' | 'open' | 'half_open';
}

export interface MetricRecord {
  sync_id: string;
  metric_type: string;
  metric_value: number;
  metadata?: Record<string, any>;
}

export interface PrometheusMetrics {
  successRate: number;
  duration: number;
  throughput: number;
  errors: {
    network: number;
    validation: number;
    database: number;
    rateLimit: number;
    unknown: number;
  };
  apiResponseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  circuitBreakerState: number; // 0=closed, 1=open, 2=half_open
}

export class SyncMetricsCollector {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * 同期メトリクスを記録
   */
  async recordSyncMetrics(metrics: SyncMetrics): Promise<void> {
    const records: MetricRecord[] = [];

    // 成功率
    const successRate = (metrics.successCount / metrics.totalCount) * 100;
    records.push({
      sync_id: metrics.syncId,
      metric_type: 'success_rate',
      metric_value: successRate,
      metadata: {
        success_count: metrics.successCount,
        total_count: metrics.totalCount
      }
    });

    // エラー率
    const errorRate = (metrics.errorCount / metrics.totalCount) * 100;
    records.push({
      sync_id: metrics.syncId,
      metric_type: 'error_rate',
      metric_value: errorRate,
      metadata: {
        error_count: metrics.errorCount,
        total_count: metrics.totalCount
      }
    });

    // 同期時間
    records.push({
      sync_id: metrics.syncId,
      metric_type: 'sync_duration_seconds',
      metric_value: metrics.durationSeconds
    });

    // スループット
    records.push({
      sync_id: metrics.syncId,
      metric_type: 'sync_throughput_items_per_second',
      metric_value: metrics.throughput
    });

    // エラータイプ別カウント
    for (const [errorType, count] of Object.entries(metrics.errorsByType)) {
      records.push({
        sync_id: metrics.syncId,
        metric_type: 'sync_errors_by_type',
        metric_value: count,
        metadata: { error_type: errorType }
      });
    }

    // API応答時間（パーセンタイル）
    if (metrics.apiResponseTimes.length > 0) {
      const sorted = [...metrics.apiResponseTimes].sort((a, b) => a - b);
      const p50 = this.calculatePercentile(sorted, 50);
      const p95 = this.calculatePercentile(sorted, 95);
      const p99 = this.calculatePercentile(sorted, 99);

      records.push({
        sync_id: metrics.syncId,
        metric_type: 'api_response_time_p50',
        metric_value: p50
      });

      records.push({
        sync_id: metrics.syncId,
        metric_type: 'api_response_time_p95',
        metric_value: p95
      });

      records.push({
        sync_id: metrics.syncId,
        metric_type: 'api_response_time_p99',
        metric_value: p99
      });
    }

    // サーキットブレーカー状態
    const cbStateValue = 
      metrics.circuitBreakerState === 'closed' ? 0 :
      metrics.circuitBreakerState === 'open' ? 1 : 2;

    records.push({
      sync_id: metrics.syncId,
      metric_type: 'circuit_breaker_state',
      metric_value: cbStateValue,
      metadata: { state: metrics.circuitBreakerState }
    });

    // 最終同期時刻
    records.push({
      sync_id: metrics.syncId,
      metric_type: 'last_sync_time',
      metric_value: Date.now()
    });

    // バッチ挿入
    const { error } = await this.supabase
      .from('sync_metrics')
      .insert(records);

    if (error) {
      console.error('メトリクス記録エラー:', error);
      throw error;
    }
  }

  /**
   * Prometheusフォーマットのメトリクスを取得
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.collectLatestMetrics();

    return `
# HELP property_sync_success_rate 物件同期の成功率（パーセント）
# TYPE property_sync_success_rate gauge
property_sync_success_rate ${metrics.successRate}

# HELP property_sync_duration_seconds 物件同期の所要時間（秒）
# TYPE property_sync_duration_seconds gauge
property_sync_duration_seconds ${metrics.duration}

# HELP property_sync_throughput 物件同期のスループット（件/秒）
# TYPE property_sync_throughput gauge
property_sync_throughput ${metrics.throughput}

# HELP property_sync_errors_total エラータイプ別のエラー総数
# TYPE property_sync_errors_total counter
property_sync_errors_total{type="network_error"} ${metrics.errors.network}
property_sync_errors_total{type="validation_error"} ${metrics.errors.validation}
property_sync_errors_total{type="database_error"} ${metrics.errors.database}
property_sync_errors_total{type="rate_limit_error"} ${metrics.errors.rateLimit}
property_sync_errors_total{type="unknown_error"} ${metrics.errors.unknown}

# HELP property_sync_api_response_time_ms API応答時間（ミリ秒）
# TYPE property_sync_api_response_time_ms summary
property_sync_api_response_time_ms{quantile="0.5"} ${metrics.apiResponseTime.p50}
property_sync_api_response_time_ms{quantile="0.95"} ${metrics.apiResponseTime.p95}
property_sync_api_response_time_ms{quantile="0.99"} ${metrics.apiResponseTime.p99}

# HELP property_sync_circuit_breaker_state サーキットブレーカーの状態（0=closed, 1=open, 2=half_open）
# TYPE property_sync_circuit_breaker_state gauge
property_sync_circuit_breaker_state ${metrics.circuitBreakerState}
    `.trim();
  }

  /**
   * 最新のメトリクスを収集
   */
  private async collectLatestMetrics(): Promise<PrometheusMetrics> {
    // 過去24時間のメトリクスを取得
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: metricsData, error } = await this.supabase
      .from('sync_metrics')
      .select('metric_type, metric_value, metadata')
      .gte('recorded_at', twentyFourHoursAgo)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('メトリクス取得エラー:', error);
      throw error;
    }

    // メトリクスを集計
    const latestMetrics: Record<string, number> = {};
    const errorsByType: Record<string, number> = {
      network: 0,
      validation: 0,
      database: 0,
      rateLimit: 0,
      unknown: 0
    };

    for (const metric of metricsData || []) {
      if (metric.metric_type === 'sync_errors_by_type' && metric.metadata?.error_type) {
        const errorType = metric.metadata.error_type;
        if (errorType in errorsByType) {
          errorsByType[errorType as keyof typeof errorsByType] += metric.metric_value;
        } else {
          errorsByType.unknown += metric.metric_value;
        }
      } else if (!latestMetrics[metric.metric_type]) {
        latestMetrics[metric.metric_type] = metric.metric_value;
      }
    }

    return {
      successRate: latestMetrics.success_rate || 0,
      duration: latestMetrics.sync_duration_seconds || 0,
      throughput: latestMetrics.sync_throughput_items_per_second || 0,
      errors: errorsByType,
      apiResponseTime: {
        p50: latestMetrics.api_response_time_p50 || 0,
        p95: latestMetrics.api_response_time_p95 || 0,
        p99: latestMetrics.api_response_time_p99 || 0
      },
      circuitBreakerState: latestMetrics.circuit_breaker_state || 0
    };
  }

  /**
   * パーセンタイルを計算
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * メトリクスのクリーンアップ（古いデータを削除）
   */
  async cleanupOldMetrics(): Promise<void> {
    // 7日より古い詳細メトリクスを削除
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await this.supabase
      .from('sync_metrics')
      .delete()
      .lt('recorded_at', sevenDaysAgo);

    if (error) {
      console.error('メトリクスクリーンアップエラー:', error);
      throw error;
    }

    console.log('✅ 古いメトリクスをクリーンアップしました');
  }
}
