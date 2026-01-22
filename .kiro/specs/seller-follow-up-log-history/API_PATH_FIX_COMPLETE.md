# APIパス修正完了 - 売主関連エンドポイント

## 日付: 2025/12/22

## 問題の概要

2つの問題が発見されました：

### 1. 追客ログ履歴API（初回修正）
- **問題**: 通話モードページで追客ログ履歴が表示されない
- **エラー**: `Error fetching follow-up log history: SyntaxError: Unexpected token '<'`
- **原因**: `FollowUpLogHistoryTable.tsx` が `/sellers/...` を使用していたが、Viteプロキシは `/api` で始まるパスのみをプロキシ

### 2. 売主リストAPI（新たに発見）
- **問題**: 売主リストページで「売主が見つかりませんでした」エラー
- **エラー**: `Failed to load resource: 404 (Not Found)` - `:3000/sellers?page=...`
- **原因**: 複数のコンポーネントが `/sellers` を使用していたが、バックエンドは `/api/sellers` で登録されていた

## 修正内容

### フロントエンド修正

#### 1. FollowUpLogHistoryTable.tsx
```typescript
// 修正前
const url = `/sellers/${sellerNumber}/follow-up-logs/history${forceRefresh ? '?refresh=true' : ''}`;

// 修正後
const url = `/api/sellers/${sellerNumber}/follow-up-logs/history${forceRefresh ? '?refresh=true' : ''}`;
```

#### 2. SellersPage.tsx
```typescript
// 修正前
const response = await api.get('/sellers', { params });
const response = await api.get('/sellers/search', { params: { q: searchQuery } });

// 修正後
const response = await api.get('/api/sellers', { params });
const response = await api.get('/api/sellers/search', { params: { q: searchQuery } });
```

#### 3. NewSellerPage.tsx
```typescript
// 修正前
await api.post('/sellers', data);

// 修正後
await api.post('/api/sellers', data);
```

#### 4. SellerDetailPage.tsx
```typescript
// 修正前
const response = await api.get(`/sellers/${id}?_t=${timestamp}`);
const response = await api.get(`/sellers/${id}/activities`);
await api.put(`/sellers/${id}`, updateData);
await api.post(`/sellers/${id}/activities`, { ... });

// 修正後
const response = await api.get(`/api/sellers/${id}?_t=${timestamp}`);
const response = await api.get(`/api/sellers/${id}/activities`);
await api.put(`/api/sellers/${id}`, updateData);
await api.post(`/api/sellers/${id}/activities`, { ... });
```

### バックエンド

バックエンドは既に正しく設定されていました：

```typescript
// backend/src/index.ts
app.use('/api/sellers', sellerRoutes);
app.use('/api/sellers', sellersManagementRoutes);
app.use('/api/sellers', valuationRoutes);
app.use('/api/sellers', emailRoutes);
app.use('/api/sellers', followUpRoutes);
```

## 修正されたファイル一覧

### フロントエンド
1. `frontend/src/components/FollowUpLogHistoryTable.tsx`
2. `frontend/src/pages/SellersPage.tsx`
3. `frontend/src/pages/NewSellerPage.tsx`
4. `frontend/src/pages/SellerDetailPage.tsx`

### バックエンド
- 修正不要（既に正しく設定されていた）

## 影響範囲

### 修正されたエンドポイント

| 機能 | 旧パス | 新パス | 状態 |
|------|--------|--------|------|
| 売主一覧取得 | `/sellers` | `/api/sellers` | ✅ 修正済み |
| 売主検索 | `/sellers/search` | `/api/sellers/search` | ✅ 修正済み |
| 売主作成 | `/sellers` | `/api/sellers` | ✅ 修正済み |
| 売主詳細取得 | `/sellers/:id` | `/api/sellers/:id` | ✅ 修正済み |
| 売主更新 | `/sellers/:id` | `/api/sellers/:id` | ✅ 修正済み |
| アクティビティ取得 | `/sellers/:id/activities` | `/api/sellers/:id/activities` | ✅ 修正済み |
| アクティビティ作成 | `/sellers/:id/activities` | `/api/sellers/:id/activities` | ✅ 修正済み |
| 追客ログ履歴 | `/sellers/:id/follow-up-logs/history` | `/api/sellers/:id/follow-up-logs/history` | ✅ 修正済み |

### 影響を受けるページ

1. ✅ **売主リストページ** (`/`) - 修正済み
2. ✅ **売主詳細ページ** (`/sellers/:id`) - 修正済み
3. ✅ **新規売主作成ページ** (`/sellers/new`) - 修正済み
4. ✅ **通話モードページ** (`/call-mode/:id`) - 修正済み

## 動作確認手順

### 1. フロントエンドをハードリロード
- Ctrl+Shift+R（Windows）または Cmd+Shift+R（Mac）

### 2. 売主リストページ
- [ ] `http://localhost:5173/` にアクセス
- [ ] 売主リストが正しく表示される
- [ ] ページネーションが動作する
- [ ] 検索機能が動作する
- [ ] フィルター機能が動作する

### 3. 売主詳細ページ
- [ ] 売主をクリックして詳細ページに移動
- [ ] 売主情報が正しく表示される
- [ ] 編集機能が動作する
- [ ] 通話メモの保存が動作する
- [ ] SMS送信記録が動作する

### 4. 新規売主作成
- [ ] 新規売主作成ページにアクセス
- [ ] 売主情報を入力して保存
- [ ] 正しく保存され、売主リストに表示される

### 5. 通話モードページ
- [ ] 通話モードページにアクセス
- [ ] 追客ログ履歴（APPSHEET）セクションが表示される
- [ ] 履歴データが正しく表示される
- [ ] リフレッシュボタンが動作する

### 6. ブラウザのコンソール確認
- [ ] F12キーを押して開発者ツールを開く
- [ ] Consoleタブでエラーがないことを確認
- [ ] Networkタブで以下のAPIリクエストが200 OKを返すことを確認：
  - `/api/sellers?page=...`
  - `/api/sellers/:id`
  - `/api/sellers/:id/activities`
  - `/api/sellers/:id/follow-up-logs/history`

## トラブルシューティング

### 問題: 売主リストが表示されない

**確認事項:**
1. ブラウザのコンソールでエラーを確認
2. Networkタブで `/api/sellers` のリクエストを確認
   - Status: 200 OK
   - Response: JSON形式のデータ
3. バックエンドが起動していることを確認

**解決方法:**
- フロントエンドをハードリロード（Ctrl+Shift+R）
- バックエンドを再起動
- ブラウザのキャッシュをクリア

### 問題: 追客ログ履歴が表示されない

**確認事項:**
1. ブラウザのコンソールでエラーを確認
2. Networkタブで `/api/sellers/.../follow-up-logs/history` のリクエストを確認
3. 環境変数が正しく設定されているか確認：
   ```
   FOLLOW_UP_LOG_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
   FOLLOW_UP_LOG_SHEET_NAME=売主追客ログ
   FOLLOW_UP_LOG_CACHE_TTL=300
   ```

**解決方法:**
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照

### 問題: 404エラーが発生する

**原因:**
- APIパスが正しくない可能性があります

**確認事項:**
1. フロントエンドのコードで `/api/sellers` を使用しているか確認
2. バックエンドで `app.use('/api/sellers', ...)` が設定されているか確認

## 今後の対応

### 完了事項
- ✅ すべての売主関連APIパスを `/api/sellers` に統一
- ✅ フロントエンドの4つのファイルを修正
- ✅ 動作確認手順を文書化

### 推奨事項
1. **他のAPIエンドポイントの確認**
   - 他のAPIエンドポイントも `/api` プレフィックスで統一されているか確認
   - 必要に応じて修正

2. **テストの追加**
   - APIエンドポイントの統合テストを追加
   - フロントエンドのE2Eテストを追加

3. **ドキュメントの更新**
   - API仕様書を更新
   - 開発者ガイドを更新

## 関連ドキュメント

- [修正サマリー](./FIX_SUMMARY.md)
- [実装完了ドキュメント](./IMPLEMENTATION_COMPLETE.md)
- [トラブルシューティングガイド](./TROUBLESHOOTING.md)
- [ユーザーガイド](./USER_GUIDE.md)

## まとめ

すべての売主関連APIパスが `/api/sellers` に統一されました。フロントエンドをハードリロードして、すべての機能が正常に動作することを確認してください。

問題が解決しない場合は、ブラウザのコンソールとNetworkタブのスクリーンショットを共有してください。
