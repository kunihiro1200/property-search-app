# Phase 4 - Task 4.1: 統合テストの実装

**日付:** 2025-01-09  
**ステータス:** 📋 計画中  
**優先度:** 高  
**推定時間:** 1日

## 📋 概要

Phase 1-3で実装したコンポーネントの統合テストを実装します。

## 🎯 目標

1. すべての主要フローをカバーする統合テスト
2. エラーハンドリングの検証
3. 並行処理の検証
4. データ整合性の検証

## 📝 テストシナリオ

### シナリオ1: 完全同期フロー

**目的:** Google Sheetsから全データを取得し、データベースに同期する

**前提条件:**
- テスト用Supabaseプロジェクトが利用可能
- テスト用Google Sheetsスプレッドシートが準備されている
- テストデータが投入されている

**テストステップ:**
1. Google Sheetsからデータを取得
2. データを変換
3. バッチ処理でデータベースに保存
4. 同期状態を確認
5. データ整合性を検証

**期待結果:**
- すべてのデータが正しく同期される
- 同期状態が正しく記録される
- エラーが発生しない

**テストコード例:**
```typescript
describe('PropertyListingRestSyncService - Full Sync', () => {
  let syncService: PropertyListingRestSyncService;
  let supabase: SupabaseClient;

  beforeAll(async () => {
    // テスト環境のセットアップ
    supabase = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
    );
    
    syncService = new PropertyListingRestSyncService({
      supabaseUrl: process.env.TEST_SUPABASE_URL!,
      supabaseServiceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
      spreadsheetId: process.env.TEST_SPREADSHEET_ID!,
      sheetName: process.env.TEST_SHEET_NAME!,
      batchSize: 50,
      rateLimit: 10,
      concurrency: 3,
    });
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await supabase
      .from('property_listings')
      .delete()
      .like('property_number', 'TEST%');
  });

  it('should sync all property listings from Google Sheets', async () => {
    // 実行
    const result = await syncService.syncAll();

    // 検証
    expect(result.status).toBe('completed');
    expect(result.successCount).toBeGreaterThan(0);
    expect(result.failedCount).toBe(0);
    expect(result.skippedCount).toBe(0);

    // データベースのデータを確認
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .like('property_number', 'TEST%');

    expect(error).toBeNull();
    expect(data).toHaveLength(result.successCount);
  });

  it('should record sync state correctly', async () => {
    // 実行
    const result = await syncService.syncAll();

    // 同期状態を確認
    const { data: syncState, error } = await supabase
      .from('property_listing_sync_states')
      .select('*')
      .eq('id', result.syncId)
      .single();

    expect(error).toBeNull();
    expect(syncState).toBeDefined();
    expect(syncState.status).toBe('completed');
    expect(syncState.total_items).toBe(result.totalItems);
    expect(syncState.success_count).toBe(result.successCount);
  });
});
```

### シナリオ2: 選択同期フロー

**目的:** 特定の物件番号のみを同期する

**前提条件:**
- テスト用データベースが準備されている
- 特定の物件番号のテストデータが存在する

**テストステップ:**
1. 特定の物件番号を指定
2. Google Sheetsから該当データを取得
3. データベースに保存
4. 指定した物件のみが更新されたことを確認

**期待結果:**
- 指定した物件のみが同期される
- 他の物件は影響を受けない
- 同期状態が正しく記録される

**テストコード例:**
```typescript
describe('PropertyListingRestSyncService - Selective Sync', () => {
  it('should sync only specified property numbers', async () => {
    const propertyNumbers = ['TEST001', 'TEST002', 'TEST003'];

    // 実行
    const result = await syncService.syncByNumbers(propertyNumbers);

    // 検証
    expect(result.status).toBe('completed');
    expect(result.totalItems).toBe(propertyNumbers.length);
    expect(result.successCount).toBe(propertyNumbers.length);

    // 指定した物件が更新されたことを確認
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .in('property_number', propertyNumbers);

    expect(error).toBeNull();
    expect(data).toHaveLength(propertyNumbers.length);
  });

  it('should skip non-existent property numbers', async () => {
    const propertyNumbers = ['TEST001', 'NONEXISTENT', 'TEST002'];

    // 実行
    const result = await syncService.syncByNumbers(propertyNumbers);

    // 検証
    expect(result.status).toBe('completed');
    expect(result.successCount).toBe(2);
    expect(result.skippedCount).toBe(1);
  });
});
```

### シナリオ3: エラーリカバリー

**目的:** エラーが発生した場合の動作を検証する

**テストケース:**

#### 3.1 一時的なエラーのリトライ

**テストステップ:**
1. 一時的なエラーを発生させる（ネットワークエラーなど）
2. リトライが実行されることを確認
3. 最終的に成功することを確認

**期待結果:**
- エラーが発生してもリトライされる
- 最終的に同期が成功する
- リトライ回数が記録される

**テストコード例:**
```typescript
describe('PropertyListingRestSyncService - Error Recovery', () => {
  it('should retry on transient errors', async () => {
    // モックを使って一時的なエラーを発生させる
    let attemptCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Network error');
      }
      return Promise.resolve({ data: [], error: null });
    });

    // 実行
    const result = await syncService.syncAll();

    // 検証
    expect(attemptCount).toBeGreaterThan(1);
    expect(result.status).toBe('completed');
  });

  it('should skip items with permanent errors', async () => {
    // 永続的なエラーを持つデータを準備
    const propertyNumbers = ['TEST001', 'INVALID_DATA', 'TEST002'];

    // 実行
    const result = await syncService.syncByNumbers(propertyNumbers);

    // 検証
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.status).toBe('completed');

    // エラーログを確認
    const { data: errorLogs } = await supabase
      .from('property_listing_sync_history')
      .select('*')
      .eq('sync_id', result.syncId)
      .eq('status', 'failed');

    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].property_number).toBe('INVALID_DATA');
  });

  it('should open circuit breaker after threshold failures', async () => {
    // 連続してエラーを発生させる
    const mockFetch = jest.fn().mockRejectedValue(new Error('Service unavailable'));

    // 実行
    for (let i = 0; i < 6; i++) {
      try {
        await syncService.syncAll();
      } catch (error) {
        // エラーを無視
      }
    }

    // サーキットブレーカーの状態を確認
    const health = await syncService.getHealth();
    expect(health.circuitBreakerState).toBe('open');
  });
});
```

#### 3.2 サーキットブレーカーの動作

**テストステップ:**
1. 連続してエラーを発生させる
2. サーキットブレーカーがオープンになることを確認
3. タイムアウト後にハーフオープンになることを確認
4. 成功後にクローズになることを確認

**期待結果:**
- 閾値を超えるとサーキットブレーカーがオープンになる
- オープン状態では即座にエラーを返す
- タイムアウト後にハーフオープンになる
- 成功するとクローズになる

### シナリオ4: 並行処理

**目的:** 複数の同期操作が並行して実行できることを検証する

**テストステップ:**
1. 複数の同期操作を同時に開始
2. すべての操作が正常に完了することを確認
3. レート制限が機能していることを確認
4. データの整合性を確認

**期待結果:**
- 複数の同期操作が並行して実行される
- レート制限が適切に機能する
- データの整合性が保たれる
- リソースが適切に管理される

**テストコード例:**
```typescript
describe('PropertyListingRestSyncService - Concurrent Operations', () => {
  it('should handle concurrent sync operations', async () => {
    // 3つの同期操作を同時に開始
    const promises = [
      syncService.syncByNumbers(['TEST001', 'TEST002']),
      syncService.syncByNumbers(['TEST003', 'TEST004']),
      syncService.syncByNumbers(['TEST005', 'TEST006']),
    ];

    // 実行
    const results = await Promise.all(promises);

    // 検証
    results.forEach(result => {
      expect(result.status).toBe('completed');
      expect(result.successCount).toBe(2);
    });

    // データの整合性を確認
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .in('property_number', [
        'TEST001', 'TEST002', 'TEST003',
        'TEST004', 'TEST005', 'TEST006'
      ]);

    expect(error).toBeNull();
    expect(data).toHaveLength(6);
  });

  it('should respect rate limits', async () => {
    const startTime = Date.now();

    // レート制限を超える数のリクエストを送信
    const promises = Array.from({ length: 50 }, (_, i) =>
      syncService.syncByNumbers([`TEST${i.toString().padStart(3, '0')}`])
    );

    await Promise.all(promises);

    const duration = Date.now() - startTime;

    // レート制限（10 req/s）を考慮すると、最低5秒かかるはず
    expect(duration).toBeGreaterThanOrEqual(5000);
  });
});
```

## 🔧 テスト環境のセットアップ

### 1. テスト用Supabaseプロジェクト

**必要な設定:**
- テスト用プロジェクトの作成
- テーブルの作成（本番と同じスキーマ）
- RLSポリシーの設定
- サービスロールキーの取得

**環境変数:**
```bash
TEST_SUPABASE_URL=https://test-project.supabase.co
TEST_SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
```

### 2. テスト用Google Sheets

**必要な設定:**
- テスト用スプレッドシートの作成
- テストデータの投入
- サービスアカウントの共有設定

**環境変数:**
```bash
TEST_SPREADSHEET_ID=test-spreadsheet-id
TEST_SHEET_NAME=テストシート
```

### 3. テストデータ

**データセット:**
- 正常データ: 100件
- 異常データ: 10件
- エッジケース: 10件

**データ例:**
```typescript
const testData = [
  {
    property_number: 'TEST001',
    property_name: 'テスト物件1',
    address: '大分県大分市テスト町1-1-1',
    // ... その他のフィールド
  },
  // ...
];
```

## 📊 テストカバレッジ目標

| コンポーネント | 行カバレッジ | 分岐カバレッジ | 関数カバレッジ |
|----------------|--------------|----------------|----------------|
| PropertyListingRestSyncService | > 80% | > 75% | > 90% |
| PropertyListingSyncProcessor | > 80% | > 75% | > 90% |
| SyncStateService | > 80% | > 75% | > 90% |
| SupabaseRestClient | > 85% | > 80% | > 95% |
| CircuitBreaker | > 90% | > 85% | > 95% |
| retryWithBackoff | > 90% | > 85% | > 95% |

## ✅ 受け入れ基準

- ✅ すべてのテストシナリオが実装されている
- ✅ すべてのテストが合格する
- ✅ テストカバレッジが目標を達成している
- ✅ テストが自動化されている
- ✅ テストが高速に実行される（< 5分）
- ✅ テストが安定している（フレーキーでない）

## 🚀 実装手順

### ステップ1: テスト環境のセットアップ (2時間)

1. テスト用Supabaseプロジェクトの作成
2. テスト用Google Sheetsの作成
3. テストデータの準備
4. 環境変数の設定

### ステップ2: テストユーティリティの作成 (1時間)

1. テストヘルパー関数の作成
2. モックデータジェネレーターの作成
3. テストフィクスチャの作成

### ステップ3: 統合テストの実装 (4時間)

1. 完全同期フローのテスト
2. 選択同期フローのテスト
3. エラーリカバリーのテスト
4. 並行処理のテスト

### ステップ4: テストの実行と検証 (1時間)

1. すべてのテストを実行
2. カバレッジレポートの確認
3. 失敗したテストの修正
4. テストの最適化

## 📝 成果物

1. **テストファイル**
   - `backend/src/services/__tests__/PropertyListingRestSyncService.integration.test.ts`
   - `backend/src/services/__tests__/PropertyListingSyncProcessor.integration.test.ts`
   - `backend/src/services/__tests__/SyncStateService.integration.test.ts`

2. **テストユーティリティ**
   - `backend/src/services/__tests__/helpers/testHelpers.ts`
   - `backend/src/services/__tests__/helpers/mockDataGenerator.ts`
   - `backend/src/services/__tests__/fixtures/testData.ts`

3. **ドキュメント**
   - `backend/src/services/__tests__/README.md` - テスト実行ガイド
   - `backend/src/services/__tests__/COVERAGE_REPORT.md` - カバレッジレポート

## 🎯 次のステップ

Task 4.1が完了したら、Task 4.2（負荷テスト）に進みます。

---

**作成日:** 2025-01-09  
**最終更新:** 2025-01-09  
**ステータス:** 📋 計画中  
**前提条件:** Phase 1-3完了
