# お気に入り文言機能 - クイックスタート

## 概要

物件公開サイトの画像上に「お気に入り文言」をオーバーレイ表示する機能です。

## 実装完了 ✅

バックエンドとフロントエンドの実装が完了しました。

## 動作確認手順

### 1. バックエンドの起動

```bash
cd backend
npm run dev
```

### 2. フロントエンドの起動

```bash
cd frontend
npm run dev
```

### 3. ブラウザで確認

1. `http://localhost:5173/public/properties` にアクセス
2. 任意の物件をクリックして詳細ページを開く
3. 画像の左上にお気に入り文言が表示される（設定されている場合）

## 文言の設定方法

### スプレッドシートで設定

1. 業務リストスプレッドシートを開く
2. 物件番号のシートを開く（例: AA12345）
3. 「athome」シートに移動
4. 物件タイプに応じたセルに文言を入力:
   - **土地:** B53
   - **戸建て:** B142
   - **マンション:** B150

### 例

```
B53セル（土地）: 駅近！徒歩5分の好立地
B142セル（戸建て）: 新築同様！リフォーム済み
B150セル（マンション）: 眺望良好！南向きバルコニー
```

## トラブルシューティング

### 文言が表示されない場合

**チェック項目:**

1. **スプレッドシートURLが設定されているか**
   ```sql
   SELECT property_number, storage_location 
   FROM property_listings 
   WHERE id = '<物件ID>';
   ```

2. **セルに文言が入力されているか**
   - スプレッドシートの該当セル（B53/B142/B150）を確認

3. **Google Sheets APIの権限**
   - サービスアカウントがスプレッドシートにアクセスできるか確認

4. **キャッシュの確認**
   ```bash
   redis-cli
   > GET favorite-comment:<物件ID>
   ```

### キャッシュをクリアする

```bash
redis-cli
> DEL favorite-comment:<物件ID>
```

または5分待つ（自動的に期限切れ）

## APIエンドポイント

### お気に入り文言を取得

```
GET /api/public/properties/:id/favorite-comment
```

**レスポンス例:**
```json
{
  "comment": "駅近で生活便利！スーパー・コンビニ徒歩5分圏内",
  "propertyType": "マンション"
}
```

**文言がない場合:**
```json
{
  "comment": null,
  "propertyType": "マンション"
}
```

## 主要ファイル

### バックエンド
- `backend/src/services/FavoriteCommentService.ts` - メインサービス
- `backend/src/routes/publicProperties.ts` - APIエンドポイント

### フロントエンド
- `frontend/src/components/FavoriteCommentOverlay.tsx` - オーバーレイコンポーネント
- `frontend/src/components/PropertyImageWithFavoriteComment.tsx` - 統合コンポーネント
- `frontend/src/pages/PublicPropertyDetailPage.tsx` - 詳細ページ

## 仕様

### セル位置マッピング

| 物件タイプ | セル位置 |
|-----------|---------|
| 土地 | B53 |
| 戸建て | B142 |
| 戸建 | B142 |
| マンション | B150 |

### キャッシュ

- **バックエンド:** Redis（5分間）
- **フロントエンド:** React Query（5分間）

### パフォーマンス

- **キャッシュヒット:** < 50ms
- **キャッシュミス:** < 2秒
- **タイムアウト:** 10秒

## 次のステップ

1. 実際の物件データでテスト
2. 各物件タイプ（土地、戸建て、マンション）で動作確認
3. モバイル/タブレットでレスポンシブ表示を確認
4. エラーケース（文言なし、APIエラー）の動作確認

## サポート

問題が発生した場合は、以下を確認してください:

1. バックエンドのログ（コンソール出力）
2. フロントエンドのブラウザコンソール
3. Redisの接続状態
4. Google Sheets APIの認証状態

詳細は `IMPLEMENTATION_COMPLETE.md` を参照してください。
