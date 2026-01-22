# Phase 3: Sync State Management - 実装準備完了

## 📋 概要

**日付:** 2025-01-09  
**ステータス:** 実装準備完了  
**優先度:** Medium  
**推定時間:** 2-3日

## ✅ 前提条件

Phase 1とPhase 2が完了し、以下のコンポーネントが利用可能です：

- ✅ SupabaseRestClient - REST API接続
- ✅ PropertyListingRestSyncService - 同期サービス
- ✅ PropertyListingSyncProcessor - バッチ処理
- ✅ エラーハンドリングとリトライロジック

## 🎯 Phase 3の目標

同期操作の状態を追跡し、監視できるようにする：

1. **同期状態の永続化** - データベースに同期履歴を保存
2. **リアルタイム監視** - 同期の進行状況を追跡
3. **統計情報の提供** - 成功率、エラー率などの指標
4. **API エンドポイント** - 同期状態にアクセスするためのREST API
5. **ダッシュボード** - 視覚的な監視インターフェース

## 📝 実装タスク

### Task 3.1: 同期状態テーブルの作成

**ファイル:** `backend/migrations/082_add_sync_state_table.sql`

**テーブル設計:**

```sql
-- 同期操作の状態を追跡
CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT UNIQUE NOT NULL,
  sync_type TEXT NOT NULL, -- 'auto' | 'manual'
  status TEXT NOT NULL, -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- 統計情報
  total_items INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  
  -- エラー統計
  transient_errors INTEGER NOT NULL DEFAULT 0,
  permanent_errors INTEGER NOT NULL DEFAULT 0,
  validation_errors INTEGER NOT NULL DEFAULT 0,
  
  -- メタデータ
  triggered_by TEXT, -- ユーザーID or 'system'
  config JSONB, -- 同期設定のスナップショット
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同期エラーの詳細を保存
CREATE TABLE IF NOT EXISTS sync_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id TEXT NOT NULL REFERENCES sync_state(sync_id) ON DELETE CASCADE,
  property_number TEXT NOT NULL,
  error_type TEXT NOT NULL, -- 'transient' | 'permanent' | 'validation' | 'unknown'
  error_message TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_sync_state_sync_id ON sync_state(sync_id);
CREATE INDEX idx_sync_state_status ON sync_state(status);
CREATE INDEX idx_sync_state_started_at ON sync_state(started_at DESC);
CREATE INDEX idx_sync_errors_sync_id ON sync_errors(sync_id);
CREATE INDEX idx_sync_errors_property_number ON sync_errors(property_number);

-- RLSポリシー
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーは全ての同期状態を閲覧可能
CREATE POLICY "Authenticated users can view sync state"
  ON sync_state FOR SELECT
  TO authenticated
  USING (true);

-- サービスロールは全ての操作が可能
CREATE POLICY "Service role can manage sync state"
  ON sync_state FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view sync errors"
  ON sync_errors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage sync errors"
  ON sync_errors FOR ALL
  TO service_role
  USING (true);

-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_sync_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_state_updated_at
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_state_updated_at();
```

**受け入れ基準:**
- [ ] テーブルが正しいスキーマで作成される
- [ ] インデックスがパフォーマンスを向上させる
- [ ] RLSポリシーがアクセスを適切に制御する
- [ ] マイグレーションが成功する

### Task 3.2: SyncStateServiceの作成

**ファイル:** `backend/src/services/SyncStateService.ts`

**実装内容:**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export interface SyncStateRecord {
  id: string;
  sync_id: string;
  sync_type: 'auto' | 'manual';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  started_at: Date;
  completed_at?: Date;
  total_items: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  transient_errors: number;
  permanent_errors: number;
  validation_errors: number;
  triggered_by?: string;
  config?: any;
}

export interface SyncErrorRecord {
  id: string;
  sync_id: string;
  property_number: string;
  error_type: 'transient' | 'permanent' | 'validation' | 'unknown';
  error_message: string;
  retry_count: number;
  occurred_at: Date;
}

export interface SyncStatistics {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  partial_syncs: number;
  success_rate: number;
  avg_duration_seconds: number;
  total_items_processed: number;
  total_errors: number;
  error_rate: number;
}

export class SyncStateService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 新しい同期操作を作成
   */
  async createSync(
    syncId: string,
    syncType: 'auto' | 'manual',
    totalItems: number,
    triggeredBy?: string,
    config?: any
  ): Promise<SyncStateRecord> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .insert({
        sync_id: syncId,
        sync_type: syncType,
        status: 'pending',
        total_items: totalItems,
        triggered_by: triggeredBy,
        config: config,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync state: ${error.message}`);
    }

    return this.mapToSyncStateRecord(data);
  }

  /**
   * 同期状態を更新
   */
  async updateSync(
    syncId: string,
    updates: Partial<SyncStateRecord>
  ): Promise<SyncStateRecord> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .update(updates)
      .eq('sync_id', syncId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update sync state: ${error.message}`);
    }

    return this.mapToSyncStateRecord(data);
  }

  /**
   * 同期を開始状態に更新
   */
  async startSync(syncId: string): Promise<SyncStateRecord> {
    return this.updateSync(syncId, {
      status: 'in_progress',
      started_at: new Date(),
    });
  }

  /**
   * 同期を完了状態に更新
   */
  async completeSync(
    syncId: string,
    stats: {
      success_count: number;
      failed_count: number;
      skipped_count: number;
      transient_errors: number;
      permanent_errors: number;
      validation_errors: number;
    }
  ): Promise<SyncStateRecord> {
    const status = this.determineStatus(stats);

    return this.updateSync(syncId, {
      status,
      completed_at: new Date(),
      success_count: stats.success_count,
      failed_count: stats.failed_count,
      skipped_count: stats.skipped_count,
      transient_errors: stats.transient_errors,
      permanent_errors: stats.permanent_errors,
      validation_errors: stats.validation_errors,
    });
  }

  /**
   * 同期エラーを記録
   */
  async recordError(
    syncId: string,
    propertyNumber: string,
    errorType: 'transient' | 'permanent' | 'validation' | 'unknown',
    errorMessage: string,
    retryCount: number = 0
  ): Promise<void> {
    const { error } = await this.supabase
      .from('sync_errors')
      .insert({
        sync_id: syncId,
        property_number: propertyNumber,
        error_type: errorType,
        error_message: errorMessage,
        retry_count: retryCount,
      });

    if (error) {
      console.error('Failed to record sync error:', error);
    }
  }

  /**
   * 同期状態を取得
   */
  async getSync(syncId: string): Promise<SyncStateRecord | null> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .eq('sync_id', syncId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get sync state: ${error.message}`);
    }

    return this.mapToSyncStateRecord(data);
  }

  /**
   * 最新の同期を取得
   */
  async getLastSync(): Promise<SyncStateRecord | null> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get last sync: ${error.message}`);
    }

    return this.mapToSyncStateRecord(data);
  }

  /**
   * 同期履歴を取得
   */
  async getSyncHistory(
    limit: number = 50,
    offset: number = 0
  ): Promise<SyncStateRecord[]> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get sync history: ${error.message}`);
    }

    return data.map(this.mapToSyncStateRecord);
  }

  /**
   * 同期エラーを取得
   */
  async getSyncErrors(syncId: string): Promise<SyncErrorRecord[]> {
    const { data, error } = await this.supabase
      .from('sync_errors')
      .select('*')
      .eq('sync_id', syncId)
      .order('occurred_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get sync errors: ${error.message}`);
    }

    return data.map(this.mapToSyncErrorRecord);
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SyncStatistics> {
    let query = this.supabase
      .from('sync_state')
      .select('*');

    if (startDate) {
      query = query.gte('started_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('started_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }

    return this.calculateStatistics(data);
  }

  /**
   * ヘルスステータスを取得
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    last_sync?: Date;
    error_rate: number;
    avg_sync_duration: number;
  }> {
    const lastSync = await this.getLastSync();
    const stats = await this.getStatistics(
      new Date(Date.now() - 24 * 60 * 60 * 1000) // 過去24時間
    );

    const errorRate = stats.error_rate;
    const status =
      errorRate < 0.01 ? 'healthy' :
      errorRate < 0.05 ? 'degraded' :
      'unhealthy';

    return {
      status,
      last_sync: lastSync?.started_at,
      error_rate: errorRate,
      avg_sync_duration: stats.avg_duration_seconds,
    };
  }

  // プライベートメソッド

  private determineStatus(stats: {
    success_count: number;
    failed_count: number;
  }): 'completed' | 'failed' | 'partial' {
    if (stats.failed_count === 0) {
      return 'completed';
    } else if (stats.success_count === 0) {
      return 'failed';
    } else {
      return 'partial';
    }
  }

  private mapToSyncStateRecord(data: any): SyncStateRecord {
    return {
      id: data.id,
      sync_id: data.sync_id,
      sync_type: data.sync_type,
      status: data.status,
      started_at: new Date(data.started_at),
      completed_at: data.completed_at ? new Date(data.completed_at) : undefined,
      total_items: data.total_items,
      success_count: data.success_count,
      failed_count: data.failed_count,
      skipped_count: data.skipped_count,
      transient_errors: data.transient_errors,
      permanent_errors: data.permanent_errors,
      validation_errors: data.validation_errors,
      triggered_by: data.triggered_by,
      config: data.config,
    };
  }

  private mapToSyncErrorRecord(data: any): SyncErrorRecord {
    return {
      id: data.id,
      sync_id: data.sync_id,
      property_number: data.property_number,
      error_type: data.error_type,
      error_message: data.error_message,
      retry_count: data.retry_count,
      occurred_at: new Date(data.occurred_at),
    };
  }

  private calculateStatistics(syncs: any[]): SyncStatistics {
    const total_syncs = syncs.length;
    const successful_syncs = syncs.filter(s => s.status === 'completed').length;
    const failed_syncs = syncs.filter(s => s.status === 'failed').length;
    const partial_syncs = syncs.filter(s => s.status === 'partial').length;

    const success_rate = total_syncs > 0 ? successful_syncs / total_syncs : 0;

    const completed_syncs = syncs.filter(s => s.completed_at);
    const total_duration = completed_syncs.reduce((sum, s) => {
      const duration = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
      return sum + duration;
    }, 0);
    const avg_duration_seconds = completed_syncs.length > 0
      ? total_duration / completed_syncs.length / 1000
      : 0;

    const total_items_processed = syncs.reduce((sum, s) => sum + s.total_items, 0);
    const total_errors = syncs.reduce((sum, s) => sum + s.failed_count, 0);
    const error_rate = total_items_processed > 0 ? total_errors / total_items_processed : 0;

    return {
      total_syncs,
      successful_syncs,
      failed_syncs,
      partial_syncs,
      success_rate,
      avg_duration_seconds,
      total_items_processed,
      total_errors,
      error_rate,
    };
  }
}
```

**受け入れ基準:**
- [ ] サービスが同期状態を正しく管理する
- [ ] 統計情報が正確に計算される
- [ ] すべてのテストが合格する

### Task 3.3: 同期ステータスAPIルートの作成

**ファイル:** `backend/src/routes/syncStatus.ts`

**実装内容:**

```typescript
import { Router } from 'express';
import { SyncStateService } from '../services/SyncStateService';
import { PropertyListingRestSyncService } from '../services/PropertyListingRestSyncService';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Supabaseクライアントを初期化
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const syncStateService = new SyncStateService(supabase);

/**
 * POST /api/sync/property-listings/manual
 * 手動同期をトリガー
 */
router.post('/property-listings/manual', authenticateToken, async (req, res) => {
  try {
    const { force = false, batchSize = 100, propertyNumbers } = req.body;

    // 同期サービスを初期化
    const syncService = new PropertyListingRestSyncService({
      supabase: {
        url: process.env.SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      googleSheets: {
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
        sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
      },
      batchSize,
      rateLimit: parseInt(process.env.SYNC_RATE_LIMIT || '10'),
      maxRetries: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.SYNC_RETRY_DELAY || '1000'),
    });

    // 同期を実行（非同期）
    const syncPromise = propertyNumbers
      ? syncService.syncByNumbers(propertyNumbers)
      : syncService.syncAll();

    // 同期IDを取得
    const syncId = `manual-${Date.now()}`;

    // レスポンスを即座に返す
    res.json({
      syncId,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    });

    // バックグラウンドで同期を実行
    syncPromise.catch(error => {
      console.error('Manual sync failed:', error);
    });

  } catch (error) {
    console.error('Failed to trigger manual sync:', error);
    res.status(500).json({
      error: 'Failed to trigger manual sync',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sync/property-listings/status/:syncId
 * 同期ステータスを取得
 */
router.get('/property-listings/status/:syncId', authenticateToken, async (req, res) => {
  try {
    const { syncId } = req.params;

    const syncState = await syncStateService.getSync(syncId);

    if (!syncState) {
      return res.status(404).json({
        error: 'Sync not found',
        syncId,
      });
    }

    const errors = await syncStateService.getSyncErrors(syncId);

    res.json({
      syncId: syncState.sync_id,
      status: syncState.status,
      startedAt: syncState.started_at,
      completedAt: syncState.completed_at,
      stats: {
        total: syncState.total_items,
        success: syncState.success_count,
        failed: syncState.failed_count,
        skipped: syncState.skipped_count,
        transientErrors: syncState.transient_errors,
        permanentErrors: syncState.permanent_errors,
        validationErrors: syncState.validation_errors,
      },
      errors: errors.map(e => ({
        propertyNumber: e.property_number,
        errorType: e.error_type,
        error: e.error_message,
        retryCount: e.retry_count,
      })),
    });

  } catch (error) {
    console.error('Failed to get sync status:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sync/property-listings/health
 * ヘルスステータスを取得
 */
router.get('/property-listings/health', authenticateToken, async (req, res) => {
  try {
    const health = await syncStateService.getHealth();

    res.json({
      status: health.status,
      lastSync: health.last_sync,
      errorRate: health.error_rate,
      avgSyncDuration: health.avg_sync_duration,
    });

  } catch (error) {
    console.error('Failed to get health status:', error);
    res.status(500).json({
      error: 'Failed to get health status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sync/property-listings/history
 * 同期履歴を取得
 */
router.get('/property-listings/history', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await syncStateService.getSyncHistory(limit, offset);

    res.json({
      history: history.map(h => ({
        syncId: h.sync_id,
        syncType: h.sync_type,
        status: h.status,
        startedAt: h.started_at,
        completedAt: h.completed_at,
        stats: {
          total: h.total_items,
          success: h.success_count,
          failed: h.failed_count,
          skipped: h.skipped_count,
        },
      })),
      pagination: {
        limit,
        offset,
        hasMore: history.length === limit,
      },
    });

  } catch (error) {
    console.error('Failed to get sync history:', error);
    res.status(500).json({
      error: 'Failed to get sync history',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sync/property-listings/statistics
 * 統計情報を取得
 */
router.get('/property-listings/statistics', authenticateToken, async (req, res) => {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const stats = await syncStateService.getStatistics(startDate, endDate);

    res.json(stats);

  } catch (error) {
    console.error('Failed to get statistics:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

**受け入れ基準:**
- [ ] すべてのエンドポイントが正しく動作する
- [ ] 認証が適切に実施される
- [ ] 入力がバリデーションされる
- [ ] エラーが適切に処理される
- [ ] すべてのテストが合格する

### Task 3.4: 同期ステータスダッシュボードの作成

**ファイル:** `frontend/src/pages/SyncStatusPage.tsx`

このタスクは、フロントエンド実装が必要なため、バックエンドの実装が完了してから取り組むことを推奨します。

## 🚀 実装の開始方法

### 1. マイグレーションスクリプトの作成

```bash
cd backend/migrations
# 082_add_sync_state_table.sql を作成
```

### 2. マイグレーション実行スクリプトの作成

```bash
# backend/migrations/run-082-migration.ts を作成
```

### 3. SyncStateServiceの実装

```bash
cd backend/src/services
# SyncStateService.ts を作成
```

### 4. ユニットテストの作成

```bash
cd backend/src/services/__tests__
# SyncStateService.test.ts を作成
```

### 5. APIルートの実装

```bash
cd backend/src/routes
# syncStatus.ts を作成
```

### 6. APIルートの登録

`backend/src/index.ts`に以下を追加：

```typescript
import syncStatusRoutes from './routes/syncStatus';

// ...

app.use('/api/sync', syncStatusRoutes);
```

## ✅ 受け入れ基準

Phase 3が完了したと判断する基準：

- [ ] sync_stateテーブルが作成される
- [ ] sync_errorsテーブルが作成される
- [ ] SyncStateServiceがすべてのメソッドを実装
- [ ] すべてのAPIエンドポイントが動作
- [ ] ユニットテストがすべて合格
- [ ] 統合テストがすべて合格
- [ ] ドキュメントが更新される

## 📊 成功指標

- 同期状態が正確に追跡される
- エラー情報が詳細に記録される
- 統計情報が正確に計算される
- APIレスポンス時間 < 500ms
- ダッシュボードがリアルタイムで更新される

## 🔄 次のフェーズ

Phase 3が完了したら、Phase 4「Migration and Testing」に進みます：

- 包括的な統合テスト
- 負荷テスト
- マイグレーションスクリプト
- ドキュメント作成
- 監視設定

---

**作成日:** 2025-01-09  
**ステータス:** 実装準備完了  
**次のアクション:** Task 3.1の実装を開始
