# 買主番号形式サポート - クイックリファレンス

## サポートされる形式

| 形式 | 例 | 正規表現 | 状態 |
|------|-----|----------|------|
| 数値 | `6647` | `/^\d+$/` | ✅ サポート済み |
| UUID | `123e4567-e89b-12d3-a456-426614174000` | UUID v4 regex | ✅ サポート済み |
| BY_プレフィックス | `BY_R1UikR1lpuf7x2` | `/^BY_[A-Za-z0-9_]+$/` | ✅ サポート済み |

## 使用例

### フロントエンド（URL）

```
/buyers/6647                          # 数値形式
/buyers/123e4567-e89b-12d3-a456-426614174000  # UUID形式
/buyers/BY_R1UikR1lpuf7x2            # BY_プレフィックス形式
```

### バックエンド（API）

```bash
# 数値形式
curl http://localhost:3001/api/buyers/6647

# UUID形式
curl http://localhost:3001/api/buyers/123e4567-e89b-12d3-a456-426614174000

# BY_プレフィックス形式
curl http://localhost:3001/api/buyers/BY_R1UikR1lpuf7x2
```

## 実装ファイル

| コンポーネント | ファイル | 関数/変数 |
|---------------|---------|-----------|
| バックエンドバリデーション | `backend/src/middleware/uuidValidator.ts` | `BUYER_NUMBER_REGEX`, `validateBuyerNumber()`, `validateBuyerId()` |
| フロントエンドバリデーション | `frontend/src/pages/BuyerDetailPage.tsx` | `isUuid`, `isNumericBuyerNumber`, `isByPrefixBuyerNumber`, `isValidBuyerNumber` |

## エラーメッセージ

### 無効な買主番号

**フロントエンド**:
```
無効な買主番号です
買主番号は有効な数値、UUID、またはBY_形式である必要があります
```

**バックエンド**:
```json
{
  "error": "Validation Error",
  "message": "Invalid id format. Expected UUID or buyer number.",
  "code": "INVALID_FORMAT",
  "details": {
    "received": "invalid_value",
    "expected": "UUID v4 format (e.g., 123e4567-e89b-12d3-a456-426614174000) or buyer number (e.g., 6647)"
  }
}
```

## テスト方法

### 手動テスト

1. **数値形式のテスト**:
   - ブラウザで `/buyers/6647` にアクセス
   - 買主詳細ページが正常に表示されることを確認

2. **BY_形式のテスト**:
   - ブラウザで `/buyers/BY_R1UikR1lpuf7x2` にアクセス
   - 買主詳細ページが正常に表示されることを確認

3. **無効な形式のテスト**:
   - ブラウザで `/buyers/invalid@123` にアクセス
   - エラーメッセージが表示されることを確認

### APIテスト

```bash
# 有効な形式のテスト
curl http://localhost:3001/api/buyers/6647
curl http://localhost:3001/api/buyers/BY_R1UikR1lpuf7x2

# 無効な形式のテスト（400エラーが返る）
curl http://localhost:3001/api/buyers/invalid@123
```

## トラブルシューティング

### 問題: BY_形式の買主番号でエラーが発生する

**原因**: バックエンドまたはフロントエンドのバリデーションが更新されていない

**解決策**:
1. `backend/src/middleware/uuidValidator.ts` の `BUYER_NUMBER_REGEX` を確認
2. `frontend/src/pages/BuyerDetailPage.tsx` の `isByPrefixBuyerNumber` を確認
3. サーバーを再起動

### 問題: 買主が見つからない

**原因**: データベースに該当する買主番号が存在しない

**解決策**:
1. データベースで買主番号を確認:
   ```sql
   SELECT * FROM buyers WHERE buyer_number = 'BY_R1UikR1lpuf7x2';
   ```
2. スプレッドシートから買主データを同期

## 関連ドキュメント

- [要件定義](./requirements.md)
- [設計ドキュメント](./design.md)
- [実装タスク](./tasks.md)
- [実装完了レポート](./IMPLEMENTATION_COMPLETE.md)
