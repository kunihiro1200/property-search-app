/**
 * Prometheusメトリクスエンドポイント
 * 同期メトリクスをPrometheus形式で公開
 */

import express from 'express';
import { SyncMetricsCollector } from '../services/SyncMetricsCollector';

const router = express.Router();
const metricsCollector = new SyncMetricsCollector();

/**
 * GET /metrics
 * Prometheusフォーマットのメトリクスを取得
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsCollector.getPrometheusMetrics();
    
    // Prometheusフォーマットのコンテンツタイプを設定
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('[Metrics] メトリクス取得エラー:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

export default router;
