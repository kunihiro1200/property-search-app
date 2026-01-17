# Property Details システム - クイックリファレンス

## 🚨 緊急時の対応

### お気に入り文言が表示されない場合
```bash
cd backend

# 1. 状態確認
node check-db-property-details-status.ts

# 2. 特定物件の確認
node check-property-details-favorite-comment.ts

# 3. 再同期
node sync-favorite-comments-to-database.ts --force --property-number AA12345
```

### データが消えた場合
```bash
# 詳細な復旧手順は以下を参照
cat FAVORITE_COMMENT_SYSTEM_GUIDE.md
```

---

## 📚 ドキュメント

### メインガイド
- **[FAVORITE_COMMENT_SYSTEM_GUIDE.md](./FAVORITE_COMMENT_SYSTEM_GUIDE.md)** ⭐ 最重要
  - システム全体の説明
  - データフロー
  - バグ修正履歴
  - トラブルシューティング
  - データ復旧手順

### 補足ドキュメント
- **[DRIVE_FOLDER_FALLBACK_SUMMARY.md](./DRIVE_FOLDER_FALLBACK_SUMMARY.md)**
  - Driveフォルダフォールバック機能の詳細

---

## 🔧 よく使うコマンド

### 診断
```bash
# 全体の状態
node check-db-property-details-status.ts

# 特定物件
node check-property-details-favorite-comment.ts

# 業務リストカバレッジ
node check-gyomu-list-coverage.ts
```

### 同期
```bash
# 1件同期
node sync-favorite-comments-to-database.ts --property-number AA12345

# バッチ同期
node sync-favorite-comments-to-database.ts --limit 20

# 自動同期（10分間隔）
node auto-sync-all-favorite-comments.ts
```

---

## ⚠️ 重要な注意事項

### PropertyDetailsService.upsertPropertyDetails() の使用
```typescript
// ❌ 間違い: 他のフィールドがnullで上書きされる
await service.upsertPropertyDetails('AA12345', {
  recommended_comments: [...],
  // favorite_commentを指定していない → nullで上書き！
});

// ✅ 正しい: 既存データを保持
// サービス内部で既存データを取得してマージするため、
// 更新したいフィールドのみ指定すればOK
await service.upsertPropertyDetails('AA12345', {
  recommended_comments: [...],
  // favorite_commentは既存値を保持
});
```

### Google Sheets APIクォータ
- 1分あたりの読み取り制限あり
- 自動同期は10分間隔で実行
- エラー時は待機してから再試行

---

## 📊 現在の状態（2026-01-16）

- **総物件数**: 1,291件
- **favorite_comment保存済み**: 10件 (1%)
- **自動同期**: 実行中（バッチ15完了、300件処理済み）

---

## 🆘 サポート

問題が解決しない場合は、以下の情報を添えて報告してください：

1. 症状の詳細
2. 影響を受けている物件番号
3. `check-db-property-details-status.ts`の出力
4. エラーメッセージ（あれば）

**詳細は [FAVORITE_COMMENT_SYSTEM_GUIDE.md](./FAVORITE_COMMENT_SYSTEM_GUIDE.md) を参照してください。**
