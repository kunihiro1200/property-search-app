# 格納先URL自動同期除外機能 - 設計書

## 概要

`PropertyListingSyncService.detectChanges()`メソッドで、`storage_location`を自動同期の比較対象から除外します。

## アーキテクチャ

### 既存の実装（`image_url`の除外）

```typescript
// backend/src/services/PropertyListingSyncService.ts (約810行目)

// ⚠️ 重要: image_urlは手動更新ボタンで管理されるため、自動同期から除外
if (dbField === 'image_url') {
  console.log(`[PropertyListingSyncService] Skipping image_url comparison (managed by manual refresh)`);
  continue;
}
```

### 新しい実装（`storage_location`の除外）

```typescript
// backend/src/services/PropertyListingSyncService.ts (約810行目の直後)

// ⚠️ 重要: storage_locationは手動更新ボタンで管理されるため、自動同期から除外
if (dbField === 'storage_location') {
  console.log(`[PropertyListingSyncService] Skipping storage_location comparison (managed by manual refresh)`);
  continue;
}
```

## 実装の詳細

### 修正ファイル

**ファイル**: `backend/src/services/PropertyListingSyncService.ts`

**メソッド**: `detectChanges()`

**行番号**: 約810-815行目

### 修正内容

#### 修正前

```typescript
// Compare each field
for (const [dbField, spreadsheetValue] of Object.entries(mappedData)) {
  // Skip metadata fields
  if (dbField === 'created_at' || dbField === 'updated_at') {
    continue;
  }

  // ⚠️ 重要: image_urlは手動更新ボタンで管理されるため、自動同期から除外
  if (dbField === 'image_url') {
    console.log(`[PropertyListingSyncService] Skipping image_url comparison (managed by manual refresh)`);
    continue;
  }

  const dbValue = dbProperty[dbField];
  const normalizedSpreadsheetValue = this.normalizeValue(spreadsheetValue);
  const normalizedDbValue = this.normalizeValue(dbValue);

  if (normalizedSpreadsheetValue !== normalizedDbValue) {
    changes[dbField] = {
      old: normalizedDbValue,
      new: normalizedSpreadsheetValue
    };
  }
}
```

#### 修正後

```typescript
// Compare each field
for (const [dbField, spreadsheetValue] of Object.entries(mappedData)) {
  // Skip metadata fields
  if (dbField === 'created_at' || dbField === 'updated_at') {
    continue;
  }

  // ⚠️ 重要: image_urlは手動更新ボタンで管理されるため、自動同期から除外
  if (dbField === 'image_url') {
    console.log(`[PropertyListingSyncService] Skipping image_url comparison (managed by manual refresh)`);
    continue;
  }

  // ⚠️ 重要: storage_locationは手動更新ボタンで管理されるため、自動同期から除外
  if (dbField === 'storage_location') {
    console.log(`[PropertyListingSyncService] Skipping storage_location comparison (managed by manual refresh)`);
    continue;
  }

  const dbValue = dbProperty[dbField];
  const normalizedSpreadsheetValue = this.normalizeValue(spreadsheetValue);
  const normalizedDbValue = this.normalizeValue(dbValue);

  if (normalizedSpreadsheetValue !== normalizedDbValue) {
    changes[dbField] = {
      old: normalizedDbValue,
      new: normalizedSpreadsheetValue
    };
  }
}
```

## データフロー

### 手動更新フロー

```
1. 管理者が「画像を変更」ボタンをクリック
   ↓
2. 新しい格納先URLを入力
   ↓
3. 「更新」ボタンをクリック
   ↓
4. フロントエンド: usePropertyRefresh.ts
   ↓
5. バックエンド: /api/public/properties/:propertyNumber/refresh-essential
   ↓
6. データベース: property_listings.storage_location を更新
   ↓
7. 画像キャッシュをクリア
   ↓
8. 新しい画像が表示される
```

### 自動同期フロー（修正後）

```
1. Vercel Cron Job: /api/cron/sync-property-listings
   ↓
2. PropertyListingSyncService.syncUpdatedPropertyListings()
   ↓
3. detectUpdatedPropertyListings()
   ↓
4. detectChanges() ← ここで storage_location をスキップ
   ↓
5. storage_location 以外のフィールドを更新
   ↓
6. 手動更新した storage_location は保持される ✅
```

## 正確性プロパティ

### プロパティ1: 手動更新の保持

**説明**: 管理者が手動更新した`storage_location`は、自動同期で上書きされない。

**検証方法**:
1. 管理者が格納先URLを手動更新
2. データベースの`storage_location`を確認（新しい値）
3. 自動同期を実行
4. データベースの`storage_location`を再確認（変更されていない）

**期待される結果**: 手動更新した値が保持される

### プロパティ2: 他のフィールドの自動同期

**説明**: `storage_location`以外のフィールドは、引き続き自動同期される。

**検証方法**:
1. スプレッドシートで価格を変更
2. 自動同期を実行
3. データベースの`price`を確認（更新されている）
4. データベースの`storage_location`を確認（変更されていない）

**期待される結果**: 価格は更新され、`storage_location`は保持される

### プロパティ3: ログ出力

**説明**: `storage_location`がスキップされたことがログに出力される。

**検証方法**:
1. 自動同期を実行
2. Vercelログを確認

**期待される出力**:
```
[PropertyListingSyncService] Skipping storage_location comparison (managed by manual refresh)
```

## エッジケース

### エッジケース1: 新規物件の作成

**シナリオ**: 新規物件が作成される場合

**期待される動作**:
- `storage_location`は初回のみ設定される
- 以降は自動同期でスキップされる

**実装**: 既存のロジックで対応済み（`detectChanges()`は既存物件のみ比較）

### エッジケース2: 手動更新前の自動同期

**シナリオ**: 手動更新前に自動同期が実行される場合

**期待される動作**:
- 自動同期で`storage_location`が設定される
- 手動更新後は自動同期でスキップされる

**実装**: 既存のロジックで対応済み

### エッジケース3: 複数の管理者が同時に更新

**シナリオ**: 複数の管理者が同時に`storage_location`を更新する場合

**期待される動作**:
- 最後に更新した値が保持される
- 自動同期では上書きされない

**実装**: データベースのトランザクション機能で対応済み

## パフォーマンス

### 影響分析

| 項目 | 影響 | 理由 |
|------|------|------|
| 自動同期の処理時間 | なし | 単純な`if`文のみ |
| データベースクエリ数 | なし | 追加のクエリなし |
| メモリ使用量 | なし | 追加のデータ構造なし |
| ログ出力 | 微増 | `console.log()`が1回追加 |

### ベンチマーク

**想定される処理時間**:
- `if`文の実行: < 1ms
- `console.log()`の実行: < 1ms
- **合計**: < 2ms（無視できるレベル）

## セキュリティ

### 脅威モデル

| 脅威 | 対策 | ステータス |
|------|------|-----------|
| 一般ユーザーが`storage_location`を更新 | `?canHide=true`パラメータが必要 | ✅ 既存機能で対応済み |
| 自動同期で手動更新が上書きされる | `storage_location`を自動同期から除外 | ✅ 本実装で対応 |
| 不正なURLの設定 | バリデーション機能 | ✅ 既存機能で対応済み |

## テスト計画

### 単体テスト

**テスト1**: `storage_location`がスキップされる

```typescript
describe('detectChanges', () => {
  it('should skip storage_location comparison', () => {
    const spreadsheetRow = { '物件番号': 'CC6', '格納先URL': 'https://new-url.com' };
    const dbProperty = { property_number: 'CC6', storage_location: 'https://old-url.com' };
    
    const changes = service.detectChanges(spreadsheetRow, dbProperty);
    
    expect(changes).not.toHaveProperty('storage_location');
  });
});
```

### 統合テスト

**テスト2**: 手動更新が保持される

```typescript
describe('syncUpdatedPropertyListings', () => {
  it('should preserve manually updated storage_location', async () => {
    // 1. 手動更新
    await updateStorageLocation('CC6', 'https://new-url.com');
    
    // 2. 自動同期
    await service.syncUpdatedPropertyListings();
    
    // 3. 確認
    const property = await getProperty('CC6');
    expect(property.storage_location).toBe('https://new-url.com');
  });
});
```

### E2Eテスト

**テスト3**: 実際の運用フロー

```
1. 管理者が格納先URLを手動更新
2. 画像が正しく表示される
3. 自動同期を実行（または待機）
4. 画像が引き続き正しく表示される
5. データベースの`storage_location`が変更されていない
```

## デプロイ計画

### デプロイ手順

1. **コード修正**: `PropertyListingSyncService.ts`を修正
2. **コミット**: Git にコミット
3. **プッシュ**: GitHub にプッシュ
4. **自動デプロイ**: Vercel が自動的にデプロイ
5. **動作確認**: 本番環境で動作確認

### ロールバック計画

**問題が発生した場合**:

```bash
# 直前のコミットに戻す
git revert HEAD
git push
```

**または**:

```bash
# 特定のコミットに戻す
git checkout <working-commit> -- backend/src/services/PropertyListingSyncService.ts
git add backend/src/services/PropertyListingSyncService.ts
git commit -m "Rollback: Restore storage_location auto-sync"
git push
```

## モニタリング

### ログ監視

**確認項目**:
- `[PropertyListingSyncService] Skipping storage_location comparison`が出力されているか
- エラーログが増加していないか
- 自動同期の処理時間が変化していないか

**確認方法**:
- Vercel Dashboard → Functions → `/api/cron/sync-property-listings`
- ログを検索: `Skipping storage_location`

### メトリクス

**監視項目**:
- 自動同期の成功率
- 自動同期の処理時間
- 手動更新の成功率

## 関連ドキュメント

- [要件定義](./requirements.md)
- [画像URL自動同期除外機能実装ガイド](.kiro/steering/storage-location-manual-flag-implementation.md)
- [手動更新ボタン実装記録](.kiro/steering/session-2026-01-25-manual-refresh-buttons.md)

---

**作成日**: 2026年1月26日  
**ステータス**: ✅ 設計完了
