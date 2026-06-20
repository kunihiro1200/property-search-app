# 格納先URL自動同期除外機能 - 要件定義

## 概要

公開物件サイトで物件の格納先URL（`storage_location`）を手動更新した場合、自動同期によって元の値に戻されないようにする機能を実装します。

## 背景

### 現在の問題

1. **手動更新が元に戻る**:
   - 管理者が公開物件サイトで格納先URLを手動更新
   - 「更新」ボタンをクリックして成功
   - しばらくすると元のURLに戻ってしまう

2. **原因**:
   - `PropertyListingSyncService.detectChanges()`メソッドで`storage_location`が比較対象に含まれている
   - 自動同期（`syncUpdatedPropertyListings()`）が定期的に実行される
   - スプレッドシートのデータでデータベースを上書き
   - 手動更新した`storage_location`も上書きされる

3. **既存の実装**:
   - `image_url`は既に自動同期から除外されている（コミット: storage-location-manual-flag-implementation.md参照）
   - しかし、`storage_location`は除外されていない

### ユーザーの運用フロー

1. Google Driveで物件フォルダの構造を変更（例：`athome公開`フォルダの場所を変更）
2. 公開物件サイトの管理者モード（`?canHide=true`）で物件詳細ページを開く
3. 「画像を変更」ボタンをクリック
4. 新しい格納先URLを入力
5. 「更新」ボタンをクリック
6. 画像が更新される
7. **しばらくすると元のURLに戻る** ← 問題

## 要件

### 1. 格納先URLの自動同期除外

**優先度**: 高

**説明**: `PropertyListingSyncService.detectChanges()`メソッドで、`storage_location`を比較対象から除外する。

**受け入れ基準**:
- [ ] `detectChanges()`メソッドで`storage_location`をスキップ
- [ ] `image_url`と同様のロジックを実装
- [ ] コメントで「手動更新ボタンで管理される」と明記

**実装箇所**:
- `backend/src/services/PropertyListingSyncService.ts`（約810行目）

**実装例**:
```typescript
// ⚠️ 重要: storage_locationは手動更新ボタンで管理されるため、自動同期から除外
if (dbField === 'storage_location') {
  console.log(`[PropertyListingSyncService] Skipping storage_location comparison (managed by manual refresh)`);
  continue;
}
```

### 2. 既存機能への影響確認

**優先度**: 高

**説明**: `storage_location`を自動同期から除外しても、既存機能に影響がないことを確認する。

**受け入れ基準**:
- [ ] 画像表示速度に影響がない
- [ ] 新規物件の`storage_location`は正常に設定される
- [ ] 手動更新ボタンは正常に動作する

### 3. ログ出力

**優先度**: 中

**説明**: `storage_location`がスキップされたことをログに出力する。

**受け入れ基準**:
- [ ] `console.log()`で「Skipping storage_location comparison」と出力
- [ ] Vercelログで確認可能

## 非機能要件

### パフォーマンス

- **既存機能に影響を与えない**: `storage_location`のスキップは単純な`if`文のみ
- **追加のデータベースクエリなし**: フラグやカラムの追加は不要

### セキュリティ

- **管理者のみ更新可能**: 手動更新ボタンは`?canHide=true`パラメータが必要
- **一般ユーザーには非表示**: 既存のセキュリティ機能を維持

## 制約事項

### 技術的制約

- **データベーススキーマ変更なし**: 新しいカラムやフラグは追加しない
- **最小限の変更**: `image_url`と同じパターンを使用

### ビジネス制約

- **既存の自動同期を維持**: 他のフィールドは引き続き自動同期される
- **手動更新の優先**: 手動更新した値は自動同期で上書きされない

## 成功基準

### 機能的成功基準

1. **手動更新が保持される**:
   - 管理者が格納先URLを手動更新
   - 自動同期が実行されても元に戻らない
   - 画像が正しく表示される

2. **自動同期が正常に動作**:
   - 他のフィールド（価格、住所など）は引き続き自動同期される
   - `storage_location`のみがスキップされる

### 技術的成功基準

1. **コード品質**:
   - `image_url`と同じパターンを使用
   - コメントで意図を明確に記述
   - ログ出力で動作を確認可能

2. **パフォーマンス**:
   - 既存機能に影響なし
   - 追加のデータベースクエリなし

## 関連ドキュメント

- [画像URL自動同期除外機能実装ガイド](.kiro/steering/storage-location-manual-flag-implementation.md)
- [手動更新ボタン実装記録](.kiro/steering/session-2026-01-25-manual-refresh-buttons.md)
- [公開物件サイト手動更新実装](.kiro/steering/public-property-manual-refresh-implementation.md)

## 次のステップ

1. **設計ドキュメント作成**: 実装の詳細を設計
2. **実装**: `PropertyListingSyncService.ts`を修正
3. **テスト**: 手動更新が保持されることを確認
4. **デプロイ**: Vercelに自動デプロイ

---

**作成日**: 2026年1月26日  
**ステータス**: ✅ 要件定義完了
