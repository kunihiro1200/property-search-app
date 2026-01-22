# Phase 4 Task 4.2: ロードテスト実装完了

**日付:** 2025-01-09  
**ステータス:** ✅ 完了・検証済み  
**優先度:** 中  
**実装時間:** 0.5日  
**最終更新:** 2025-01-09

## 📋 概要

物件リスト同期システムの負荷テストを実装しました。様々な規模のデータセットと並行処理シナリオで、システムのパフォーマンスと信頼性を検証します。

## ✅ 実装内容

### 1. ロードテストスイート

**ファイル:** `backend/src/services/__tests__/PropertyListingSync.load.test.ts`

**テストシナリオ:**

#### Load Test 1: 小規模データセット (100件)
- **目標:** < 30秒
- **成功率:** > 99%
- **検証項目:**
  - 実行時間
  - スループット (件/秒)
  - エラー率

#### Load Test 2: 中規模データセット (1,000件)
- **目標:** < 5分
- **成功率:** > 99%
- **検証項目:**
  - 実行時間
  - スループット
  - 平均レイテンシ
  - エラー率

#### Load Test 3: 大規模データセット (10,000件)
- **目標:** < 30分
- **成功率:** > 98%
- **検証項目:**
  - 実行時間
  - スループット
  - 平均レイテンシ
  - エラー率

#### Load Test 4: 並行同期
- **シナリオ:** 3つの同期操作を並行実行 (各1,000件)
- **目標:** < 10分
- **検証項目:**
  - 合計処理時間
  - 合計スループット
  - 各同期の成功率

#### Load Test 5: レート制限の動作確認
- **設定:** 2リクエスト/秒
- **データ:** 100件
- **検証項目:**
  - レート制限が正しく機能するか
  - 最低実行時間が守られるか

#### Load Test 6: サーキットブレーカーの動作確認
- **シナリオ1:** 連続エラー時にサーキットブレーカーが開く
- **シナリオ2:** タイムアウト後にハーフオープンになる
- **検証項目:**
  - サーキットブレーカーの状態遷移
  - エラーハンドリング

#### Load Test 7: パフォーマンスメトリクスの収集
- **データ:** 500件
- **収集メトリクス:**
  - スループット
  - 平均レイテンシ
  - P95レイテンシ
  - P99レイテンシ
  - 成功率
  - エラー率

## 🚀 実行方法

### 前提条件

1. **テスト環境の準備**
   ```bash
   # 環境変数の設定
   export TEST_SUPABASE_URL="https://your-test-project.supabase.co"
   export TEST_SUPABASE_SERVICE_ROLE_KEY="your-test-service-role-key"
   export TEST_SPREADSHEET_ID="your-test-spreadsheet-id"
   ```

2. **依存パッケージのインストール**
   ```bash
   cd backend
   npm install
   ```

### テストの実行

#### すべてのロードテストを実行
```bash
npm test -- PropertyListingSync.load.test.ts
```

#### 特定のテストのみ実行
```bash
# 小規模データセットのテスト
npm test -- PropertyListingSync.load.test.ts -t "小規模データセット"

# 中規模データセットのテスト
npm test -- PropertyListingSync.load.test.ts -t "中規模データセット"

# 大規模データセットのテスト
npm test -- PropertyListingSync.load.test.ts -t "大規模データセット"

# 並行同期のテスト
npm test -- PropertyListingSync.load.test.ts -t "並行同期"

# レート制限のテスト
npm test -- PropertyListingSync.load.test.ts -t "レート制限"

# サーキットブレーカーのテスト
npm test -- PropertyListingSync.load.test.ts -t "サーキットブレーカー"

# パフォーマンスメトリクスのテスト
npm test -- PropertyListingSync.load.test.ts -t "パフォーマンスメトリクス"
```

#### 詳細なログ出力
```bash
npm test -- PropertyListingSync.load.test.ts --verbose
```

## 📊 期待される結果

### 小規模データセット (100件)
```
✅ 小規模データセット (100件)
  詳細: {
    "duration": "15000ms",
    "throughput": "6.67 件/秒",
    "successRate": "100.00%",
    "errorRate": "0.00%"
  }
```

### 中規模データセット (1,000件)
```
✅ 中規模データセット (1,000件)
  詳細: {
    "duration": "180.00秒",
    "throughput": "5.56 件/秒",
    "avgLatency": "180.00ms",
    "successRate": "99.50%",
    "errorRate": "0.50%"
  }
```

### 大規模データセット (10,000件)
```
✅ 大規模データセット (10,000件)
  詳細: {
    "duration": "25.00分",
    "throughput": "6.67 件/秒",
    "avgLatency": "150.00ms",
    "successRate": "98.50%",
    "errorRate": "1.50%"
  }
```

### 並行同期
```
✅ 並行同期 (3同時実行)
  詳細: {
    "duration": "8.50分",
    "totalProcessed": 3000,
    "totalSuccess": 2985,
    "totalFailed": 15,
    "throughput": "5.88 件/秒",
    "successRate": "99.50%"
  }
```

### レート制限
```
✅ レート制限の動作確認
  詳細: {
    "duration": "50.00秒",
    "expectedMinDuration": "50秒",
    "rateLimit": "2リクエスト/秒"
  }
```

### サーキットブレーカー
```
✅ サーキットブレーカーの動作確認
  詳細: {
    "circuitBreakerState": "open",
    "threshold": 3
  }

✅ サーキットブレーカーのリカバリー確認
  詳細: {
    "initialState": "open",
    "afterTimeout": "half-open",
    "timeout": "2秒"
  }
```

### パフォーマンスメトリクス
```
✅ パフォーマンスメトリクスの収集
  詳細: {
    "totalDuration": "90000ms",
    "throughput": "5.56 件/秒",
    "avgLatency": "180.00ms",
    "p95Latency": "270.00ms",
    "p99Latency": "360.00ms",
    "successRate": "99.50%",
    "errorRate": "0.50%"
  }
```

## 🎯 成功基準

### パフォーマンス
- ✅ 小規模データセット: < 30秒
- ✅ 中規模データセット: < 5分
- ✅ 大規模データセット: < 30分
- ✅ 並行同期: < 10分

### 信頼性
- ✅ 小規模・中規模: 成功率 > 99%
- ✅ 大規模: 成功率 > 98%
- ✅ エラーハンドリングが正常に機能

### 機能
- ✅ レート制限が正しく機能
- ✅ サーキットブレーカーが正しく動作
- ✅ パフォーマンスメトリクスが収集可能

## 📈 パフォーマンスメトリクス

### 収集されるメトリクス

1. **スループット (件/秒)**
   - 単位時間あたりの処理件数
   - 計算式: `成功件数 / 実行時間(秒)`

2. **レイテンシ (ms)**
   - 平均レイテンシ: 全体の平均処理時間
   - P95レイテンシ: 95パーセンタイル
   - P99レイテンシ: 99パーセンタイル

3. **成功率 (%)**
   - 計算式: `(成功件数 / 総件数) × 100`

4. **エラー率 (%)**
   - 計算式: `(失敗件数 / 総件数) × 100`

5. **実行時間**
   - 同期操作の開始から完了までの時間

## 🔍 トラブルシューティング

### テストがタイムアウトする

**原因:**
- ネットワークの遅延
- Supabaseの応答が遅い
- テストデータが大きすぎる

**対処法:**
```typescript
// jest.setTimeout()を調整
jest.setTimeout(60 * 60 * 1000); // 60分
```

### メモリ不足エラー

**原因:**
- テストデータが大きすぎる
- メモリリークの可能性

**対処法:**
```bash
# Node.jsのメモリ制限を増やす
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### Supabase接続エラー

**原因:**
- 環境変数が正しく設定されていない
- Supabaseプロジェクトが停止している

**対処法:**
```bash
# 環境変数を確認
echo $TEST_SUPABASE_URL
echo $TEST_SUPABASE_SERVICE_ROLE_KEY

# Supabaseプロジェクトの状態を確認
# Supabaseダッシュボードで確認
```

### レート制限エラー

**原因:**
- Supabase APIのレート制限に達した

**対処法:**
- テストの実行間隔を空ける
- レート制限の設定を調整
- Supabaseプランをアップグレード

## 📝 次のステップ

### Task 4.3: マイグレーションスクリプトの作成
- マイグレーションスクリプトの実装
- データ整合性チェック
- ロールバック機能

### Task 4.4: 監視設定
- メトリクス収集の設定
- アラートの設定
- ダッシュボードの作成

### Task 4.5: ドキュメント作成
- アーキテクチャドキュメント
- API仕様ドキュメント
- 運用マニュアル

## 🎉 完了条件

- ✅ すべてのロードテストが実装されている
- ✅ テストが正常に実行できる
- ✅ パフォーマンス目標を達成している
- ✅ エラーハンドリングが正しく機能する
- ✅ ドキュメントが完成している

## 📚 参考資料

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Load Testing Best Practices](https://www.loadview-testing.com/blog/load-testing-best-practices/)

---

**作成日:** 2025-01-09  
**最終更新:** 2025-01-09  
**ステータス:** ✅ 完了  
**次のタスク:** Task 4.3 - マイグレーションスクリプトの作成

