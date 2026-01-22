# 物件公開サイト検索機能修正（AA13129検索エラー）

## 概要
物件公開サイトの検索バーでAA13129を検索すると、ブラウザコンソールにエラーが表示され、検索が機能しない問題を修正する。

## 問題の詳細

### 報告されたエラー
```
Uncaught TypeError: onChange is not a function
Cannot read properties of undefined (reading 'trim')
```

### 現状分析
コードレビューの結果、実装自体は正しいことが判明：

1. **UnifiedSearchBar.tsx**: `onChange` propを正しく受け取り、使用している
2. **useUnifiedSearch.ts**: `setSearchQuery` 関数を正しく返している
3. **PublicPropertiesPage.tsx**: `setSearchQuery` を `onChange` propとして正しく渡している
4. **searchQueryDetector.ts**: AA13129を物件番号として正しく検出できる

### 推定される原因
1. **ブラウザキャッシュ**: 古いバージョンのJavaScriptがキャッシュされている
2. **ビルド問題**: フロントエンドが最新コードでビルドされていない
3. **開発サーバー**: 開発サーバーが古いコードを提供している

## 解決策

### ステップ1: フロントエンドの完全リビルド
```bash
cd frontend
npm run build
```

### ステップ2: 開発サーバーの再起動
```bash
# 既存のサーバーを停止
# Ctrl+C または taskkill コマンド

# 再起動
cd frontend
npm run dev
```

### ステップ3: ブラウザキャッシュのクリア
1. ブラウザで開発者ツールを開く（F12）
2. ネットワークタブを開く
3. 「キャッシュを無効化」にチェック
4. ページをハードリロード（Ctrl+Shift+R）

### ステップ4: 動作確認
1. 物件公開サイト（http://localhost:5173/public/properties）にアクセス
2. 検索バーに「AA13129」と入力
3. エラーが表示されないことを確認
4. 検索結果が表示されることを確認

## 検証項目

### 機能テスト
- [ ] AA13129で検索できる
- [ ] 検索結果が表示される
- [ ] コンソールエラーが表示されない
- [ ] 物件番号検索として認識される（「物件番号で検索中」と表示）

### その他の検索パターン
- [ ] AA12345（別の物件番号）で検索できる
- [ ] 所在地（例：大分市）で検索できる
- [ ] 空文字で検索すると全件表示される

## バックエンドAPI確認

### エンドポイント
```
GET /api/public/properties?propertyNumber=AA13129
```

### 期待されるレスポンス
```json
{
  "properties": [
    {
      "id": "uuid",
      "propertyNumber": "AA13129",
      "address": "...",
      "price": 1234,
      "propertyType": "土地",
      ...
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "filters": {
    "propertyNumber": "AA13129",
    ...
  }
}
```

## 追加の確認事項

### データベース確認
AA13129が `property_listings` テーブルに存在し、`site_display` が `'Y'` であることを確認：

```sql
SELECT 
  id,
  property_number,
  address,
  site_display,
  atbb_status
FROM property_listings
WHERE property_number = 'AA13129';
```

### 期待される結果
- `site_display` = 'Y'
- `atbb_status` が公開可能なステータス（'公開中' など）

## 関連ファイル
- `frontend/src/components/UnifiedSearchBar.tsx`
- `frontend/src/hooks/useUnifiedSearch.ts`
- `frontend/src/pages/PublicPropertiesPage.tsx`
- `frontend/src/utils/searchQueryDetector.ts`
- `backend/src/routes/publicProperties.ts`
- `backend/src/services/PropertyListingService.ts`

## 注意事項
- この問題は実装の問題ではなく、ビルド/キャッシュの問題である可能性が高い
- 本番環境では必ず最新のビルドをデプロイすること
- ブラウザキャッシュ対策として、ビルド時にハッシュ付きファイル名を使用すること（Viteはデフォルトで対応済み）
