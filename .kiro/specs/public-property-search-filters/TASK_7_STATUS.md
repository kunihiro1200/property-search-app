# Task 7: 物件番号検索エンドポイント（社内用）- 実装完了

## ステータス: ✅ 完了

**実装日**: 2026-01-03

## 実装内容

### 1. 内部エンドポイントの追加

**エンドポイント**: `GET /api/public/internal/properties/search`

**認証**: 必須（`authenticate`ミドルウェア使用）

**クエリパラメータ**:
- `propertyNumber` (必須): 検索する物件番号
- `exact` (オプション): `'true'`で完全一致、`'false'`または未指定で部分一致（デフォルト: `'false'`）

**レスポンス形式**:
```json
{
  "properties": [...],
  "count": 5,
  "searchTerm": "AA131",
  "exactMatch": false
}
```

### 2. 実装済み機能

#### ✅ 認証チェック
- `authenticate`ミドルウェアによる認証必須
- 認証なしのリクエストは401エラーを返す

#### ✅ パラメータバリデーション
- `propertyNumber`が未指定の場合、400エラーを返す
- 空文字列（トリム後）の場合、400エラーを返す
- 適切な日本語エラーメッセージを返す

#### ✅ 検索機能
- 完全一致検索: `exact=true`の場合
- 部分一致検索: `exact=false`または未指定の場合（デフォルト）
- 大文字小文字を区別しない検索
- `PropertyListingService.searchByPropertyNumber()`メソッドを使用

#### ✅ レスポンス
- 検索結果の物件リスト
- 結果件数
- 検索キーワード
- 検索モード（完全一致/部分一致）

#### ✅ エラーハンドリング
- 400 Bad Request: パラメータ不正
- 401 Unauthorized: 認証失敗
- 500 Internal Server Error: サーバーエラー

## 実装ファイル

### 修正ファイル
- `backend/src/routes/publicProperties.ts`
  - 新しいエンドポイント`GET /internal/properties/search`を追加
  - 認証ミドルウェアを適用
  - パラメータバリデーションとエラーハンドリングを実装

### 既存ファイル（変更なし）
- `backend/src/services/PropertyListingService.ts`
  - `searchByPropertyNumber()`メソッドは既に実装済み
- `backend/src/middleware/auth.ts`
  - 認証ミドルウェアは既に実装済み

## テスト

### テストスクリプト
`backend/test-task-7-property-number-search.ts`

### テストケース
1. ✅ 認証なしでアクセス → 401エラー
2. ✅ 物件番号なしでアクセス → 400エラー
3. ✅ 空の物件番号でアクセス → 400エラー
4. ✅ 完全一致検索 → 正しい結果を返す
5. ✅ 部分一致検索 → 正しい結果を返す
6. ✅ デフォルトで部分一致検索 → 正しい結果を返す

### テスト実行方法

```bash
# 環境変数を設定（認証が必要なテスト用）
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password

# テスト実行
cd backend
npx ts-node test-task-7-property-number-search.ts
```

## 使用例

### 例1: 部分一致検索（デフォルト）

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/public/internal/properties/search?propertyNumber=AA131"
```

**レスポンス**:
```json
{
  "properties": [
    {
      "id": "...",
      "property_number": "AA13129",
      "address": "...",
      ...
    },
    {
      "id": "...",
      "property_number": "AA13149",
      "address": "...",
      ...
    }
  ],
  "count": 2,
  "searchTerm": "AA131",
  "exactMatch": false
}
```

### 例2: 完全一致検索

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/public/internal/properties/search?propertyNumber=AA13129&exact=true"
```

**レスポンス**:
```json
{
  "properties": [
    {
      "id": "...",
      "property_number": "AA13129",
      "address": "...",
      ...
    }
  ],
  "count": 1,
  "searchTerm": "AA13129",
  "exactMatch": true
}
```

### 例3: 認証なしでアクセス（エラー）

```bash
curl "http://localhost:3001/api/public/internal/properties/search?propertyNumber=AA13129"
```

**レスポンス**:
```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "No authentication token provided",
    "retryable": false
  }
}
```

### 例4: 物件番号なし（エラー）

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/public/internal/properties/search"
```

**レスポンス**:
```json
{
  "error": "Property number is required",
  "message": "物件番号を指定してください"
}
```

## セキュリティ

### ✅ 実装済みセキュリティ対策

1. **認証必須**: すべてのリクエストで認証トークンが必要
2. **入力サニタイゼーション**: トリム処理を実施
3. **SQLインジェクション対策**: Supabaseクライアントが自動的にエスケープ
4. **エラーメッセージ**: 内部エラーの詳細を公開しない

## 要件との対応

| 要件ID | 要件内容 | ステータス |
|--------|---------|-----------|
| REQ-3.1 | 物件番号フィールドで検索 | ✅ 完了 |
| REQ-3.2 | 完全一致/部分一致検索 | ✅ 完了 |
| REQ-3.3 | 公開サイトで非表示 | ✅ 完了（内部エンドポイント） |
| REQ-3.4 | 社内用のみアクセス可能 | ✅ 完了（認証必須） |
| REQ-3.5 | 検索結果を返す | ✅ 完了 |

## 次のステップ

Task 7は完了しました。次のタスクに進んでください：

- **Task 8**: フロントエンドのフィルタインターフェース拡張
- **Task 9**: 所在地検索フィールドの追加
- **Task 10**: 築年数範囲フィールドの追加

## 注意事項

1. **認証トークン**: 実際の環境では、有効な認証トークンが必要です
2. **パフォーマンス**: 大量の物件がある場合、部分一致検索は時間がかかる可能性があります
3. **インデックス**: `property_number`フィールドにGINインデックスが作成されている必要があります（Task 2で実装予定）

## 関連ドキュメント

- [タスク一覧](./tasks.md)
- [設計ドキュメント](./design.md)
- [要件定義](./requirements.md)
- [Task 6完了レポート](./TASK_2_STATUS.md)
