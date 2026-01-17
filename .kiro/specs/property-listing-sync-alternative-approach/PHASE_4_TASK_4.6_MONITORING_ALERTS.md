# Phase 4 - Task 4.6: モニタリングとアラートの実装

**日付:** 2025-01-09  
**ステータス:** 📋 準備完了  
**優先度:** 中  
**推定時間:** 4-6時間

## 📋 概要

同期プロセスの健全性を監視し、問題が発生した際に適切に通知するシステムを構築します。

## 🎯 目標

1. **リアルタイム監視**: 同期プロセスの状態をリアルタイムで監視
2. **早期警告**: 問題を早期に検出してアラート
3. **運用効率**: 問題の迅速な特定と対応
4. **データ駆動**: メトリクスに基づく改善

## 📊 監視対象メトリクス

### メトリクスの保存とクリーンアップ

- **保存期間**: 
  - 詳細メトリクス: 7日間
  - 集計メトリクス（1時間単位）: 30日間
  - 集計メトリクス（1日単位）: 1年間
- **クリーンアップ**: 毎日午前3時に自動実行
- **エクスポート**: Prometheusフォーマットで `/metrics` エンドポイントから取得可能

### 1. 同期メトリクス

#### 成功率
- **メトリクス名**: `sync_success_rate`
- **Prometheusメトリクス**: `property_sync_success_rate`
- **計算方法**: `(成功件数 / 総件数) × 100`
- **目標値**: > 99%
- **警告閾値**: < 98%
- **クリティカル閾値**: < 95%

#### 同期時間
- **メトリクス名**: `sync_duration_seconds`
- **Prometheusメトリクス**: `property_sync_duration_seconds`
- **測定対象**: 完全同期の所要時間
- **目標値**: < 300秒 (5分)
- **警告閾値**: > 450秒 (7.5分)
- **クリティカル閾値**: > 600秒 (10分)

#### 処理スループット
- **メトリクス名**: `sync_throughput_items_per_second`
- **Prometheusメトリクス**: `property_sync_throughput`
- **計算方法**: `処理件数 / 経過時間`
- **目標値**: > 10件/秒
- **警告閾値**: < 5件/秒
- **クリティカル閾値**: < 2件/秒

### 2. エラーメトリクス

#### エラー率
- **メトリクス名**: `sync_error_rate`
- **計算方法**: `(エラー件数 / 総件数) × 100`
- **目標値**: < 1%
- **警告閾値**: > 2%
- **クリティカル閾値**: > 5%

#### エラータイプ別カウント
- **メトリクス名**: `sync_errors_by_type`
- **分類**:
  - `network_error`: ネットワークエラー
  - `validation_error`: データ検証エラー
  - `database_error`: データベースエラー
  - `rate_limit_error`: レート制限エラー
  - `unknown_error`: 不明なエラー

### 3. システムメトリクス

#### API呼び出し回数
- **メトリクス名**: `api_calls_total`
- **分類**: エンドポイント別、ステータスコード別

#### API応答時間
- **メトリクス名**: `api_response_time_ms`
- **測定**: P50, P95, P99
- **目標値**: P95 < 1000ms

#### サーキットブレーカー状態
- **メトリクス名**: `circuit_breaker_state`
- **状態**: `closed`, `open`, `half_open`
- **アラート**: `open`状態が10分以上継続

## 🚨 アラート設定

### クリティカルアラート（即座に対応が必要）

#### 1. 同期完全停止
**条件**: 過去24時間同期が実行されていない
**通知先**: Slack + Email
**対応**: 即座にシステムチェック

#### 2. 高エラー率
**条件**: エラー率 > 5% が5分間継続
**通知先**: Slack + Email
**対応**: エラーログを確認し原因を特定

#### 3. サーキットブレーカーオープン
**条件**: サーキットブレーカーが10分以上オープン状態
**通知先**: Slack + Email
**対応**: Supabase接続を確認

#### 4. データ不整合検出
**条件**: 同期後の検証で不整合を検出
**通知先**: Slack + Email
**対応**: データ整合性チェックを実行

### 警告アラート（監視が必要）

#### 1. 低成功率
**条件**: 成功率 < 98% が15分間継続
**通知先**: Slack
**対応**: エラーログを確認

#### 2. 低速同期
**条件**: 同期時間 > 7.5分
**通知先**: Slack
**対応**: パフォーマンスメトリクスを確認

#### 3. 高エラー率
**条件**: エラー率 > 2% が15分間継続
**通知先**: Slack
**対応**: エラーパターンを分析

## 📈 ダッシュボード設計

### レイアウト構成

```
┌─────────────────────────────────────────────────────────────┐
│ 物件リスト同期 - モニタリングダッシュボード                    │
├─────────────────────────────────────────────────────────────┤
│ [現在の状態]                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │最終同期   │ │同期状態   │ │成功率    │ │エラー率   │        │
│ │5分前     │ │✓ 正常    │ │99.2%    │ │0.8%     │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ [パフォーマンス]                                              │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │同期時間のトレンド          │ │スループットのトレンド      │ │
│ │[グラフ: 過去7日間]        │ │[グラフ: 過去7日間]        │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐│
│ │API応答時間                                                 ││
│ │P50: 245ms  P95: 892ms  P99: 1,234ms                      ││
│ │[グラフ: 過去24時間]                                        ││
│ └───────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ [エラー分析]                                                  │
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │エラータイプ別分布          │ │最近のエラーログ           │ │
│ │[円グラフ]                 │ │1. ネットワークタイムアウト │ │
│ │                           │ │2. データ検証エラー        │ │
│ │                           │ │3. レート制限              │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [システムヘルス]                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│ │CB状態    │ │API呼出   │ │リソース   │                     │
│ │✓ Closed │ │1,234回  │ │CPU: 45%  │                     │
│ └──────────┘ └──────────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### メインダッシュボード

#### セクション1: 現在の状態
**コンポーネント**: `CurrentStatusCards`
- **最終同期時刻**: 相対時間表示（例: "5分前"）
  - クリックで詳細モーダル表示
- **現在の同期状態**: アイコン + テキスト
  - ✓ 正常（緑）
  - ⚠ 警告（黄）
  - ✗ エラー（赤）
  - ⟳ 実行中（青、アニメーション）
- **成功率（過去24時間）**: パーセンテージ + トレンド矢印
  - 目標値との比較表示
- **エラー率（過去24時間）**: パーセンテージ + トレンド矢印
  - 閾値超過時に赤色表示

#### セクション2: パフォーマンス
**コンポーネント**: `PerformanceCharts`
- **同期時間のトレンド（過去7日間）**: 折れ線グラフ
  - X軸: 日付
  - Y軸: 秒数
  - 目標値ライン（300秒）を表示
  - 警告閾値ライン（450秒）を表示
- **スループットのトレンド（過去7日間）**: 折れ線グラフ
  - X軸: 日付
  - Y軸: 件/秒
  - 目標値ライン（10件/秒）を表示
- **API応答時間（P50, P95, P99）**: 複合グラフ
  - 過去24時間の推移
  - パーセンタイル別に色分け

#### セクション3: エラー分析
**コンポーネント**: `ErrorAnalysis`
- **エラータイプ別の分布**: ドーナツチャート
  - 各エラータイプを色分け
  - クリックで詳細フィルタリング
- **最近のエラーログ（最新10件）**: テーブル
  - カラム: 時刻、タイプ、メッセージ、詳細リンク
  - クリックで完全なスタックトレース表示
- **エラー発生頻度のトレンド**: 棒グラフ
  - 過去7日間の日別エラー数

#### セクション4: システムヘルス
**コンポーネント**: `SystemHealthCards`
- **サーキットブレーカー状態**: ステータスバッジ
  - Closed（緑）: 正常
  - Open（赤）: 障害検出
  - Half-Open（黄）: 回復試行中
- **API呼び出し統計**: 数値 + 小グラフ
  - 過去1時間の呼び出し回数
  - エンドポイント別の内訳（ホバーで表示）
- **リソース使用率**: プログレスバー
  - CPU使用率
  - メモリ使用率
  - ディスク使用率

### インタラクティブ機能

#### リアルタイム更新
- WebSocketまたはポーリング（30秒間隔）
- 新しいデータが到着時にスムーズなアニメーション
- 更新中インジケーター表示

#### 時間範囲選択
- プリセット: 過去1時間、過去24時間、過去7日間、過去30日間
- カスタム範囲選択可能

#### フィルタリング
- エラータイプでフィルタ
- 同期IDでフィルタ
- 日付範囲でフィルタ

#### エクスポート
- CSV形式でメトリクスをエクスポート
- PNG形式でグラフをエクスポート
- PDF形式でレポートを生成

## 🔧 実装計画

### ステップ1: メトリクス収集の実装（2時間）

#### 1.1 メトリクスサービスの作成

```typescript
// backend/src/services/SyncMetricsService.ts
export class SyncMetricsService {
  // メトリクスの記録
  async recordSyncMetrics(metrics: SyncMetrics): Promise<void>
  
  // メトリクスの取得
  async getMetrics(timeRange: TimeRange): Promise<MetricsData>
  
  // アラートチェック
  async checkAlerts(): Promise<Alert[]>
}
```

#### 1.2 メトリクステーブルの作成

```sql
-- sync_metrics テーブル
CREATE TABLE sync_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id UUID REFERENCES sync_state(id),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_metrics_type_time 
ON sync_metrics(metric_type, recorded_at DESC);
```

### ステップ2: アラートシステムの実装（2時間）

#### 2.1 アラートルールの定義

```typescript
// backend/src/config/alertRules.ts
export const alertRules: AlertRule[] = [
  {
    name: 'sync_stopped',
    condition: 'no_sync_24h',
    severity: 'critical',
    channels: ['slack', 'email']
  },
  // ... 他のルール
];
```

#### 2.2 アラート通知の実装

```typescript
// backend/src/services/AlertService.ts
export class AlertService {
  async sendAlert(alert: Alert): Promise<void>
  async sendSlackNotification(message: string): Promise<void>
  async sendEmailNotification(message: string): Promise<void>
}
```

### ステップ3: ダッシュボードの実装（2時間）

#### 3.1 バックエンドAPIの作成

```typescript
// backend/src/routes/syncMonitoring.ts
router.get('/api/sync/metrics', async (req, res) => {
  // メトリクスデータを返す
});

router.get('/api/sync/alerts', async (req, res) => {
  // アクティブなアラートを返す
});
```

#### 3.2 フロントエンドダッシュボードの作成

```typescript
// frontend/src/pages/SyncMonitoringPage.tsx
export const SyncMonitoringPage: React.FC = () => {
  // ダッシュボードUI
};
```

## 📝 実装チェックリスト

### メトリクス収集
- [ ] SyncMetricsServiceの実装
- [ ] sync_metricsテーブルの作成
- [ ] メトリクス記録の統合
- [ ] メトリクス取得APIの実装
- [ ] ユニットテストの作成

### アラートシステム
- [ ] AlertServiceの実装
- [ ] アラートルールの定義
- [ ] Slack通知の実装
- [ ] Email通知の実装
- [ ] アラートチェックのスケジューリング
- [ ] ユニットテストの作成

### ダッシュボード
- [ ] バックエンドAPIの実装
- [ ] フロントエンドコンポーネントの作成
- [ ] リアルタイム更新の実装
- [ ] グラフの実装
- [ ] エラーログ表示の実装
- [ ] 統合テストの作成

## 🎯 成功基準

### 機能要件
- ✅ すべてのメトリクスが正しく収集される
- ✅ アラートが適切なタイミングで発火する
- ✅ 通知が正しく送信される
- ✅ ダッシュボードがリアルタイムで更新される

### 非機能要件
- ✅ メトリクス収集のオーバーヘッド < 5%
- ✅ アラートチェックの実行時間 < 1秒
- ✅ ダッシュボードの読み込み時間 < 2秒

### テスト要件
- ✅ ユニットテストカバレッジ > 80%
- ✅ 統合テストがすべてのアラートルールをカバー
- ✅ 負荷テストでメトリクス収集のオーバーヘッドを検証

## 🧪 テストケース

### メトリクス収集のテスト

#### TC-M1: 成功率メトリクスの記録
**前提条件**: 同期が実行される
**テストステップ**:
1. 100件の物件を同期（95件成功、5件失敗）
2. メトリクスを確認
**期待結果**: `sync_success_rate` = 95%

#### TC-M2: 同期時間メトリクスの記録
**前提条件**: 同期が実行される
**テストステップ**:
1. 同期を開始
2. 同期完了まで待機
3. メトリクスを確認
**期待結果**: `sync_duration_seconds` が記録されている

#### TC-M3: エラータイプ別カウント
**前提条件**: 異なるタイプのエラーが発生
**テストステップ**:
1. ネットワークエラーを3件発生させる
2. 検証エラーを2件発生させる
3. メトリクスを確認
**期待結果**: 
- `sync_errors_by_type{type="network_error"}` = 3
- `sync_errors_by_type{type="validation_error"}` = 2

### アラートシステムのテスト

#### TC-A1: 高エラー率アラート
**前提条件**: システムが正常稼働中
**テストステップ**:
1. エラー率を6%に設定
2. 5分間待機
3. アラートを確認
**期待結果**: クリティカルアラートが発火し、Slack + Emailに通知

#### TC-A2: 同期停止アラート
**前提条件**: システムが正常稼働中
**テストステップ**:
1. 同期を24時間停止
2. アラートチェックを実行
3. アラートを確認
**期待結果**: クリティカルアラートが発火

#### TC-A3: サーキットブレーカーアラート
**前提条件**: サーキットブレーカーがクローズ状態
**テストステップ**:
1. サーキットブレーカーをオープン状態にする
2. 10分間待機
3. アラートを確認
**期待結果**: クリティカルアラートが発火

### ダッシュボードのテスト

#### TC-D1: リアルタイム更新
**前提条件**: ダッシュボードが表示されている
**テストステップ**:
1. 同期を実行
2. ダッシュボードを確認
**期待結果**: 最新のメトリクスが自動的に表示される

#### TC-D2: 履歴データの表示
**前提条件**: 7日分のメトリクスデータが存在
**テストステップ**:
1. ダッシュボードで「過去7日間」を選択
2. グラフを確認
**期待結果**: 7日分のトレンドグラフが表示される

#### TC-D3: エラーログの表示
**前提条件**: 複数のエラーが記録されている
**テストステップ**:
1. ダッシュボードのエラーセクションを確認
**期待結果**: 最新10件のエラーログが表示される

## 💡 実装例

### Prometheusメトリクスのエクスポート

```typescript
// backend/src/routes/metrics.ts
import express from 'express';
import { SyncMetricsCollector } from '../services/SyncMetricsCollector';

const router = express.Router();
const metricsCollector = new SyncMetricsCollector();

router.get('/metrics', async (req, res) => {
  try {
    const metrics = await metricsCollector.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

export default router;
```

```typescript
// backend/src/services/SyncMetricsCollector.ts
export class SyncMetricsCollector {
  async getPrometheusMetrics(): Promise<string> {
    const metrics = await this.collectMetrics();
    
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
}
```

### メトリクス収集の統合

```typescript
// PropertyListingRestSyncService.ts に追加
import { SyncMetricsService } from './SyncMetricsService';

export class PropertyListingRestSyncService {
  private metricsService: SyncMetricsService;

  async syncAll(): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.performSync();
      
      // メトリクスを記録
      await this.metricsService.recordSyncMetrics({
        sync_id: result.syncId,
        duration: Date.now() - startTime,
        success_count: result.successCount,
        error_count: result.errorCount,
        throughput: result.successCount / ((Date.now() - startTime) / 1000)
      });
      
      return result;
    } catch (error) {
      // エラーメトリクスを記録
      await this.metricsService.recordError(error);
      throw error;
    }
  }
}
```

### アラートチェックのスケジューリング

```typescript
// backend/src/jobs/alertChecker.ts
import { AlertService } from '../services/AlertService';
import { SyncMetricsService } from '../services/SyncMetricsService';

export async function checkAlerts() {
  const metricsService = new SyncMetricsService();
  const alertService = new AlertService();
  
  // アラートをチェック
  const alerts = await metricsService.checkAlerts();
  
  // アラートを送信
  for (const alert of alerts) {
    await alertService.sendAlert(alert);
  }
}

// 5分ごとに実行
setInterval(checkAlerts, 5 * 60 * 1000);
```

## 📚 関連ドキュメント

- **Phase 4要件定義**: `PHASE_4_REQUIREMENTS.md`
- **Phase 4クイックスタート**: `PHASE_4_QUICK_START.md`
- **Task 4.5 運用マニュアル**: `PHASE_4_TASK_4.5_OPERATIONS_MANUAL.md`
- **デプロイメント計画**: `PHASE_4_TASK_4.4_DEPLOYMENT_PLAN.md`

## 🚀 次のステップ

Task 4.6完了後、Phase 4の最終タスクであるTask 4.5（運用マニュアル作成）に進みます。

---

**作成日:** 2025-01-09  
**最終更新:** 2025-01-09  
**ステータス:** 📋 準備完了  
**推定時間:** 4-6時間
