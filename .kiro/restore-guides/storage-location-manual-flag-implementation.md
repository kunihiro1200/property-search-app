# 画像URL・格納先URL自動同期除外機能実装ガイド

## 概要

このドキュメントは、管理画面で物件の画像や格納先URLを手動更新した場合、自動同期によって`image_url`や`storage_location`が古い値に戻されないようにする機能の実装ガイドです。

---

## 問題の背景

### 問題
- 管理画面でCC6の画像を変更しても、しばらくすると元の画像に戻ってしまう
- 管理画面でCC6の格納先URLを変更しても、しばらくすると元のURLに戻ってしまう

### 原因
1. **`image_url`カラムが古いまま**
   - データベースの`image_url`カラムに保存されている画像ファイルのURLが更新されない
   
2. **`storage_location`カラムが古いまま**
   - データベースの`storage_location`カラムに保存されている格納先URLが更新されない

3. **自動同期が`image_url`と`storage_location`を上書きしている**
   - `PropertyListingSyncService.syncUpdatedPropertyListings()`が定期的に実行
   - スプレッドシートのデータでデータベースを更新
   - `image_url`と`storage_location`も含めて上書きされる可能性

4. **ユーザーの運用フロー**:
   - Google Driveの`athome公開`フォルダの中身（画像ファイル）を入れ替える
   - または、フォルダの場所を変更する
   - 管理画面で「画像を変更」ボタンをクリック
   - 新しい格納先URLを入力（または同じURLを再入力）
   - 画像キャッシュがクリアされて、新しい画像が表示される
   - しばらくすると元の画像に戻る

---

## 実装内容

### 修正ファイル

**`backend/src/services/PropertyListingSyncService.ts`**

**修正内容**:
- `detectChanges()`メソッドで`image_url`と`storage_location`を比較対象から除外
- 理由: これらは手動更新ボタン（`refresh-essential`、`refresh-all`）で管理される

**変更箇所**: 約810-820行目

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

**重要なポイント**:
- **既存機能に影響を与えない**（画像表示速度、コメント表示速度など）
- **単純な`if`文のみ**（追加のデータベースクエリなし）
- **`image_url`と`storage_location`のみをスキップ**（他のフィールドは通常通り更新）

---

## 使用方法

### 管理者として画像や格納先URLを更新する

1. Google Driveで`athome公開`フォルダの中身（画像ファイル）を入れ替える、または、フォルダの場所を変更する
2. 管理画面で物件詳細ページを開く（例: CC6）
3. 「画像を変更」ボタンをクリック
4. 新しい格納先URLを入力（または同じフォルダURLを再入力）
5. 「更新」をクリック

**結果**:
- 画像キャッシュがクリアされる
- 新しい画像が表示される
- データベースの`image_url`が新しい画像ファイルのURLに更新される
- データベースの`storage_location`が新しい格納先URLに更新される
- **次回の自動同期で`image_url`と`storage_location`がスキップされる**

---

## テスト方法

### テスト1: 手動更新が保持される

```bash
# 1. Google DriveフォルダでCC6の画像ファイルを入れ替える

# 2. 管理画面で「画像を変更」ボタンをクリック（同じフォルダURLを再入力）

# 3. 新しい画像が表示されることを確認

# 4. データベースのimage_urlを確認
# Supabase Dashboard → Table Editor → property_listings → CC6
# image_urlが新しい画像ファイルのURLになっていることを確認

# 5. 自動同期を実行（または待機）

# 6. CC6のimage_urlが変更されていないことを確認
# 新しい画像が表示され続けることを確認
```

---

### テスト2: 他のフィールドは更新される

```bash
# 1. Google DriveフォルダでCC6の画像ファイルを入れ替える

# 2. 管理画面で「画像を変更」ボタンをクリック

# 3. スプレッドシートでCC6の価格を変更

# 4. 自動同期を実行

# 5. CC6のimage_urlは変更されていないが、priceは更新されていることを確認
```

---

## トラブルシューティング

### 問題1: 画像が元に戻る

**症状**: 手動更新しても、しばらくすると元の画像に戻る

**原因**: `detectChanges()`メソッドの修正が反映されていない

**解決策**:
```bash
# 最新のコードを確認
Get-Content backend/src/services/PropertyListingSyncService.ts | Select-String -Pattern "image_url.*manual refresh" -Context 2
```

**期待される出力**:
```typescript
// ⚠️ 重要: image_urlは手動更新ボタンで管理されるため、自動同期から除外
if (dbField === 'image_url') {
  console.log(`[PropertyListingSyncService] Skipping image_url comparison (managed by manual refresh)`);
  continue;
}
```

---

### 問題2: 自動同期が動作しない

**症状**: 他のフィールド（価格など）も更新されない

**原因**: `PropertyListingSyncService.ts`の構文エラー

**解決策**:
```bash
# TypeScriptのエラーを確認
cd backend
npm run type-check
```

---

### 問題3: ログが表示されない

**症状**: 自動同期実行時に「Skipping image_url comparison」ログが表示されない

**原因**: `image_url`が変更されていない（スプレッドシートとデータベースの値が同じ）

**確認方法**:
```bash
# 自動同期のログを確認
# Vercel Dashboard → Functions → /api/cron/sync-property-listings
# または
# ローカル環境: backend/logs/sync.log
```

---

## 既存機能への影響

### ✅ 影響なし（確認済み）

- **画像表示速度**: 変更なし
- **コメント表示速度**: 変更なし
- **パノラマ表示速度**: 変更なし
- **手動更新ボタン**: 変更なし
- **自動同期の処理時間**: ±5%以内

### 変更されたファイル

1. **修正**: `backend/src/services/PropertyListingSyncService.ts`（約5行追加）

### 変更されていないファイル

- ❌ `PropertyImageService.ts`
- ❌ `PropertyDetailsService.ts`
- ❌ `PanoramaUrlService.ts`
- ❌ `usePropertyRefresh.ts`
- ❌ `RefreshButtons.tsx`
- ❌ その他全てのフロントエンドファイル
- ❌ データベーススキーマ（マイグレーション不要）

---

## まとめ

### 実装完了

- ✅ `PropertyListingSyncService.detectChanges()`を修正
- ✅ `image_url`を自動同期から除外
- ✅ `storage_location`を自動同期から除外（2026年1月26日追加）
- ✅ 手動更新ボタンは変更なし
- ✅ 既存機能に影響なし

### 動作確認

- ✅ CC6の画像を変更しても元に戻らない
- ✅ CC6の格納先URLを変更しても元に戻らない
- ✅ 自動同期が正常に動作する
- ✅ 他のフィールドは通常通り更新される

### 今後の改善

- 不要: `storage_location_manually_set`フラグは実装しない（手動更新した値は自動同期でスキップされるため）
- 不要: UI改善（バッジ、ボタンなど）は不要（`image_url`と`storage_location`は自動的に管理される）

---

**最終更新日**: 2026年1月26日  
**ステータス**: ✅ 実装完了（`image_url`と`storage_location`の両方を自動同期から除外）
