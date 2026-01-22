# Task 2.3: バッチエラーハンドリング - 完了報告

## 概要

Task 2.3「バッチエラーハンドリングの追加」が完了しました。`PropertyListingSyncProcessor`に詳細なエラー分類とリトライロジックを実装しました。

## 実装内容

### 1. エラー分類機能

エラーを以下の4つのカテゴリに分類する機能を追加しました：

#### エラータイプ

1. **一時的エラー (transient)**
   - タイムアウト
   - ネットワーク接続エラー
   - レート制限エラー
   - 自動的にリトライされます

2. **永続的エラー (permanent)**
   - 権限エラー
   - 存在しないテーブル
   - リトライしません

3. **バリデーションエラー (validation)**
   - 必須フィールド不足
   - データ形式エラー
   - リトライしません

4. **不明なエラー (unknown)**
   - 上記に該当しないエラー
   - 安全のためリトライしません

### 2. リトライロジック

一時的エラーに対して、指数バックオフを使用したリトライを実装：

```typescript
// 設定例
const config: SyncConfig = {
  batchSize: 100,
  rateLimit: 10,
  maxRetries: 3,        // 最大3回リトライ
  retryDelay: 1000,     // 初期遅延1秒
};

// リトライ遅延の計算
// 1回目: 1000ms
// 2回目: 2000ms
// 3回目: 4000ms
```

### 3. エラー統計の拡張

`SyncResult`に詳細なエラー統計を追加：

```typescript
interface SyncResult {
  stats: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    transientErrors: number;    // 新規追加
    permanentErrors: number;    // 新規追加
    validationErrors: number;   // 新規追加
  };
  errors: SyncError[];          // エラータイプを含む
}
```

### 4. エラー詳細情報

各エラーに以下の情報を記録：

```typescript
interface SyncError {
  propertyNumber: string;
  error: string;
  errorType: 'transient' | 'permanent' | 'validation' | 'unknown';
  retryCount: number;
  timestamp: Date;
}
```

## 変更ファイル

### 修正したファイル

1. **backend/src/services/PropertyListingSyncProcessor.ts**
   - `SyncError`インターフェースを追加
   - `SyncResult`にエラー統計を追加
   - `SyncConfig`にリトライ設定を追加
   - `categorizeError()`メソッドを追加
   - `processSingleListingWithRetry()`メソッドを追加
   - `processIndividually()`メソッドを拡張

### 新規作成したファイル

1. **backend/src/services/__tests__/PropertyListingSyncProcessor.error-handling.test.ts**
   - エラー分類のテスト
   - リトライロジックのテスト
   - バッチエラーハンドリングのテスト
   - エラー統計のテスト
   - 同期ステータスのテスト

## テスト結果

### テストカバレッジ

以下のシナリオをカバーするテストを作成：

1. **エラー分類テスト**
   - ✅ タイムアウトエラー → 一時的エラー
   - ✅ レート制限エラー → 一時的エラー
   - ✅ 権限エラー → 永続的エラー
   - ✅ バリデーションエラー → バリデーションエラー

2. **リトライロジックテスト**
   - ✅ 一時的エラー: 最大リトライ回数まで再試行
   - ✅ 一時的エラー: リトライで成功
   - ✅ 永続的エラー: リトライしない
   - ✅ バリデーションエラー: リトライしない

3. **バッチエラーハンドリングテスト**
   - ✅ バッチ全体が失敗した場合、個別に処理
   - ✅ バッチ失敗後、個別処理で一部失敗

4. **エラー統計テスト**
   - ✅ 複数のエラータイプを正しくカウント

5. **同期ステータステスト**
   - ✅ 全件成功: completed
   - ✅ 一部失敗: partial
   - ✅ 全件失敗: failed

### テスト実行方法

```bash
# エラーハンドリングテストのみ実行
cd backend
npm test -- PropertyListingSyncProcessor.error-handling.test.ts

# すべてのPropertyListingSyncProcessorテストを実行
npm test -- PropertyListingSyncProcessor
```

## 使用例

### 基本的な使用方法

```typescript
import { PropertyListingSyncProcessor } from './services/PropertyListingSyncProcessor';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを作成
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// プロセッサーを初期化
const processor = new PropertyListingSyncProcessor(supabase, {
  batchSize: 100,
  rateLimit: 10,
  concurrency: 5,
  maxRetries: 3,
  retryDelay: 1000,
});

// 同期を実行
const result = await processor.processBatch(listings, 'sync-001');

// 結果を確認
console.log('同期結果:', {
  ステータス: result.status,
  総件数: result.stats.total,
  成功: result.stats.success,
  失敗: result.stats.failed,
  一時的エラー: result.stats.transientErrors,
  永続的エラー: result.stats.permanentErrors,
  バリデーションエラー: result.stats.validationErrors,
});

// エラー詳細を確認
if (result.errors.length > 0) {
  console.log('エラー詳細:');
  result.errors.forEach(error => {
    console.log(`- ${error.propertyNumber}: ${error.errorType} - ${error.error}`);
  });
}
```

### エラータイプ別の処理

```typescript
const result = await processor.processBatch(listings, 'sync-002');

// 一時的エラーが多い場合は、レート制限を下げる
if (result.stats.transientErrors > result.stats.total * 0.1) {
  console.warn('一時的エラーが多発しています。レート制限を下げることを検討してください。');
}

// 永続的エラーがある場合は、設定を確認
if (result.stats.permanentErrors > 0) {
  console.error('永続的エラーが発生しています。権限設定を確認してください。');
}

// バリデーションエラーがある場合は、データを確認
if (result.stats.validationErrors > 0) {
  console.error('バリデーションエラーが発生しています。データ形式を確認してください。');
  
  // バリデーションエラーの詳細を表示
  const validationErrors = result.errors.filter(e => e.errorType === 'validation');
  validationErrors.forEach(error => {
    console.log(`- ${error.propertyNumber}: ${error.error}`);
  });
}
```

## エラー分類の詳細

### 一時的エラー (transient)

以下のエラーメッセージまたはコードを含む場合：

- `timeout`, `ETIMEDOUT`
- `ECONNRESET`, `ENOTFOUND`
- `rate limit`, `too many requests`
- コード: `PGRST301`, `429`

**対応**: 自動的にリトライされます（最大3回）

### 永続的エラー (permanent)

以下のエラーメッセージまたはコードを含む場合：

- `permission denied`
- `does not exist`
- `unauthorized`
- コード: `42P01` (テーブルが存在しない)
- コード: `42501` (権限不足)

**対応**: リトライせず、即座に失敗として記録されます

### バリデーションエラー (validation)

以下のエラーメッセージまたはコードを含む場合：

- `validation`, `invalid`, `required`
- コード: `23502` (NOT NULL制約違反)

**対応**: リトライせず、即座に失敗として記録されます

## パフォーマンス特性

### リトライによる影響

- **最良ケース**: エラーなし → 追加の遅延なし
- **一時的エラー1回**: 1秒の遅延
- **一時的エラー2回**: 1秒 + 2秒 = 3秒の遅延
- **一時的エラー3回**: 1秒 + 2秒 + 4秒 = 7秒の遅延

### バッチサイズとエラー率の関係

| バッチサイズ | エラー率1% | エラー率5% | エラー率10% |
|------------|-----------|-----------|------------|
| 10件       | 0.1件/バッチ | 0.5件/バッチ | 1件/バッチ |
| 50件       | 0.5件/バッチ | 2.5件/バッチ | 5件/バッチ |
| 100件      | 1件/バッチ   | 5件/バッチ   | 10件/バッチ |

**推奨**: エラー率が高い場合は、バッチサイズを小さくすることで、バッチ全体の失敗を減らせます。

## 次のステップ

Task 2.3が完了したので、次は以下のタスクに進みます：

### Task 2.4: 統合テスト

- 実際のSupabaseインスタンスを使用した統合テスト
- レート制限の動作確認
- エラーハンドリングの実環境テスト
- 同時実行のテスト

### Phase 3: 同期状態管理

- Task 3.1: 同期状態テーブルの作成
- Task 3.2: SyncStateServiceの実装
- Task 3.3: 同期ステータスAPIルートの作成
- Task 3.4: 同期ステータスダッシュボードの作成

## 受け入れ基準

以下の受け入れ基準をすべて満たしています：

- ✅ エラーを一時的、永続的、バリデーション、不明に分類
- ✅ 一時的エラーに対してリトライロジックを実装
- ✅ 永続的エラーとバリデーションエラーはスキップ
- ✅ すべてのエラーを詳細にログ記録
- ✅ エラー統計を追跡
- ✅ ユニットテストをすべて作成
- ✅ すべてのテストが合格

## まとめ

Task 2.3「バッチエラーハンドリングの追加」を完了しました。

**主な成果:**

1. エラーを4つのカテゴリに分類する機能を実装
2. 一時的エラーに対する指数バックオフリトライを実装
3. 詳細なエラー統計とログ記録を追加
4. 包括的なユニットテストを作成

**改善点:**

- エラー率が高い場合でも、適切にリトライまたはスキップされる
- エラータイプ別の統計により、問題の原因を特定しやすくなった
- リトライロジックにより、一時的なネットワーク問題に対する耐性が向上

---

**作成日**: 2025-01-09  
**ステータス**: ✅ 完了  
**次のタスク**: Task 2.4 - 統合テスト
