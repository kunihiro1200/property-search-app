# 売主追客ログ履歴機能 - 修正サマリー

## 日付: 2025/12/22

## 問題

通話モードページで売主追客ログ履歴が表示されない。

ブラウザのコンソールに以下のエラーが表示：
```
Error fetching follow-up log history: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## 根本原因

APIエンドポイントのパスが正しくプロキシされていなかった。

- **フロントエンド**: `/sellers/...` を呼び出していた
- **Viteプロキシ設定**: `/api` で始まるパスのみをプロキシ
- **結果**: リクエストがバックエンドに到達せず、404エラー（HTMLページ）が返される

## 修正内容

### 1. フロントエンド修正

**ファイル**: `frontend/src/components/FollowUpLogHistoryTable.tsx`

```typescript
// 修正前
const url = `/sellers/${sellerNumber}/follow-up-logs/history${forceRefresh ? '?refresh=true' : ''}`;

// 修正後
const url = `/api/sellers/${sellerNumber}/follow-up-logs/history${forceRefresh ? '?refresh=true' : ''}`;
```

### 2. バックエンド修正

**ファイル**: `backend/src/index.ts`

```typescript
// 修正前
app.use('/sellers', sellerRoutes);
app.use('/sellers', sellersManagementRoutes);
app.use('/sellers', valuationRoutes);
app.use('/sellers', emailRoutes);
app.use('/sellers', followUpRoutes);

// 修正後
app.use('/api/sellers', sellerRoutes);
app.use('/api/sellers', sellersManagementRoutes);
app.use('/api/sellers', valuationRoutes);
app.use('/api/sellers', emailRoutes);
app.use('/api/sellers', followUpRoutes);
```

## 影響範囲

この修正により、以下のエンドポイントのパスが変更されました：

### 変更されたエンドポイント

| 旧パス | 新パス |
|--------|--------|
| `/sellers/:id` | `/api/sellers/:id` |
| `/sellers/:id/follow-up-logs/history` | `/api/sellers/:id/follow-up-logs/history` |
| `/sellers/:id/valuations` | `/api/sellers/:id/valuations` |
| `/sellers/:id/emails` | `/api/sellers/:id/emails` |
| `/sellers/:id/follow-ups` | `/api/sellers/:id/follow-ups` |

### 影響を受けるコンポーネント

以下のコンポーネントが影響を受ける可能性があります：

1. ✅ `FollowUpLogHistoryTable.tsx` - 修正済み
2. ⚠️ 他の売主関連のAPIを呼び出すコンポーネント - 確認が必要

## 確認事項

### 必須確認

- [ ] バックエンドを再起動
- [ ] フロントエンドをハードリロード（Ctrl+Shift+R）
- [ ] 通話モードページで履歴が表示されることを確認
- [ ] ブラウザのコンソールにエラーがないことを確認

### 追加確認（推奨）

- [ ] 他の売主関連のAPIが正常に動作することを確認
  - 売主詳細ページ
  - 査定機能
  - メール送信機能
  - 追客ログ機能

## テスト手順

1. **バックエンドを再起動**
   ```bash
   cd backend
   npm run dev
   ```

2. **フロントエンドをハードリロード**
   - ブラウザで Ctrl+Shift+R (Windows) または Cmd+Shift+R (Mac)

3. **通話モードページにアクセス**
   - 例: `http://localhost:5173/call-mode/AA12923`

4. **履歴が表示されることを確認**
   - 「追客ログ履歴（APPSHEET）」セクションが表示される
   - テーブルにデータが表示される
   - リフレッシュボタンが機能する

5. **ブラウザのコンソールを確認**
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーがないことを確認
   - Networkタブで `/api/sellers/.../follow-up-logs/history` のリクエストが成功（200 OK）することを確認

## ロールバック手順

万が一問題が発生した場合、以下の手順でロールバックできます：

1. **フロントエンド**
   ```typescript
   // FollowUpLogHistoryTable.tsx
   const url = `/sellers/${sellerNumber}/follow-up-logs/history${forceRefresh ? '?refresh=true' : ''}`;
   ```

2. **バックエンド**
   ```typescript
   // index.ts
   app.use('/sellers', sellerRoutes);
   app.use('/sellers', sellersManagementRoutes);
   app.use('/sellers', valuationRoutes);
   app.use('/sellers', emailRoutes);
   app.use('/sellers', followUpRoutes);
   ```

3. **再起動**
   - バックエンドとフロントエンドを再起動

## 今後の対応

### 推奨事項

1. **統一性の確保**
   - すべてのAPIエンドポイントを `/api` プレフィックスで統一
   - 既存のコードを段階的に移行

2. **テストの追加**
   - APIエンドポイントの統合テストを追加
   - フロントエンドのE2Eテストを追加

3. **ドキュメントの更新**
   - API仕様書を更新
   - 開発者ガイドを更新

## 関連ドキュメント

- [実装完了ドキュメント](./IMPLEMENTATION_COMPLETE.md)
- [トラブルシューティングガイド](./TROUBLESHOOTING.md)
- [ユーザーガイド](./USER_GUIDE.md)
