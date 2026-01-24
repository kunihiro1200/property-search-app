# 物件リスト自動同期機能 復元ガイド

## ⚠️ 重要：この設定は動作確認済みです

**動作確認日時**: 2026年1月25日
**最新コミット**: `3fa960d` - "Fix: Pre-load GyomuList cache to avoid Google Sheets API quota exceeded error during property sync"
**機能**: 物件リストスプレッドシートとデータベースの自動同期（5分間隔）

---

## 📋 機能概要

### 自動同期の仕組み

1. **定期実行**: 5分ごとに自動実行
2. **Phase 4.5**: 既存物件の更新を検出して同期
3. **Phase 4.6**: 新規物件を検出して追加
4. **変更検出**: スプレッドシートとDBを全件比較し、変更があったフィールドのみを更新

### 同期対象

- **スプレッドシート**: 物件リスト（`1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`）
- **シート名**: `物件`
- **データベーステーブル**: `property_listings`

---

## ✅ 正常動作の確認方法

### 1. 自動同期が有効か確認

```bash
cd backend
cat .env | grep AUTO_SYNC_ENABLED
```

**期待される出力**:
```
AUTO_SYNC_ENABLED=true
```

### 2. データベースで最新の更新を確認

```bash
cd backend
npx ts-node check-aa4160-detailed.ts
```

**確認ポイント**:
- データベースの`price`がスプレッドシートの`売買価格`と一致しているか
- `updated_at`が最近の日時か

### 3. 手動同期テスト

```bash
cd backend
npx ts-node sync-aa4160-manual.ts
```

**期待される結果**:
- 変更がある場合: `Updated: X件`
- 変更がない場合: `No updates detected`

---

## 🔧 復元手順（問題が発生した場合）

### ステップ1: 動作確認済みコミットに戻す

```bash
# 主要ファイルを復元
git checkout 3fa960d -- backend/src/services/PropertyListingSyncService.ts
git checkout 3fa960d -- backend/src/services/GyomuListService.ts
git checkout 3fa960d -- backend/src/services/EnhancedAutoSyncService.ts
```

### ステップ2: 環境変数を確認

```bash
cd backend
cat .env
```

**必須の環境変数**:
```env
AUTO_SYNC_ENABLED=true
AUTO_SYNC_INTERVAL_MINUTES=5
PROPERTY_LISTING_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
PROPERTY_LISTING_SHEET_NAME=物件
```

### ステップ3: バックエンドサーバーを再起動

```bash
cd backend
npm run dev
```

### ステップ4: 動作確認

```bash
# 別のターミナルで
cd backend
npx ts-node check-aa4160-detailed.ts
```

---

## 📝 重要なファイル

### 1. PropertyListingSyncService.ts

**役割**: 物件リストの同期処理

**重要なメソッド**:
- `syncUpdatedPropertyListings()`: 既存物件の更新同期（Phase 4.5）
- `syncNewProperties()`: 新規物件の追加（Phase 4.6）
- `detectUpdatedPropertyListings()`: 変更検出
- `detectChanges()`: フィールド単位の変更検出

**Google Sheets APIクォータ対策**:
```typescript
// 業務リストのキャッシュを事前にリフレッシュ
console.log('📋 Pre-loading 業務リスト cache to avoid API quota issues...');
const { GyomuListService } = await import('./GyomuListService');
const gyomuListService = new GyomuListService();
await gyomuListService.getByPropertyNumber('DUMMY');
```

### 2. GyomuListService.ts

**役割**: 業務リストからデータを取得（格納先URL、スプシURLなど）

**重要な機能**:
- キャッシュ機能（5分間有効）
- 並列処理対策（`refreshPromise`で重複リフレッシュを防止）

**修正内容（コミット 3fa960d）**:
```typescript
private refreshPromise: Promise<void> | null = null; // 並列処理対策

// 並列処理対策: 既にrefreshが実行中の場合は待機
if (this.refreshPromise) {
  console.log(`[GyomuListService] Waiting for ongoing refresh...`);
  await this.refreshPromise;
} else {
  await this.refreshCache();
}
```

### 3. EnhancedAutoSyncService.ts

**役割**: 自動同期の定期実行

**Phase 4.5**: 既存物件の更新同期
```typescript
console.log('\n📊 Phase 4.5: Syncing updated property listings...');
const propertyListingSyncService = new PropertyListingSyncService(propertyListingSheets);
const updateResult = await propertyListingSyncService.syncUpdatedPropertyListings();
```

**Phase 4.6**: 新規物件の追加
```typescript
console.log('\n📊 Phase 4.6: Syncing new properties...');
const newPropertyResult = await propertyListingSyncService.syncNewProperties();
```

---

## 🚨 よくある問題と解決策

### 問題1: 自動同期が動作していない

**症状**: スプレッドシートを更新しても、データベースに反映されない

**原因**: `AUTO_SYNC_ENABLED=false`になっている

**解決策**:
```bash
cd backend
# .envファイルを編集
echo "AUTO_SYNC_ENABLED=true" >> .env

# バックエンドサーバーを再起動
npm run dev
```

### 問題2: Google Sheets APIクォータ超過

**症状**: `Quota exceeded for quota metric 'Read requests'`エラー

**原因**: 
- 業務リストのキャッシュが機能していない
- 並列処理で複数回`refreshCache()`が呼ばれている

**解決策**:
```bash
# 動作確認済みコミットに戻す
git checkout 3fa960d -- backend/src/services/GyomuListService.ts
git checkout 3fa960d -- backend/src/services/PropertyListingSyncService.ts

git add backend/src/services/GyomuListService.ts backend/src/services/PropertyListingSyncService.ts
git commit -m "Restore: Fix Google Sheets API quota exceeded error (commit 3fa960d)"
git push
```

### 問題3: 特定の物件だけ更新されない

**症状**: AA4160など特定の物件だけ更新されない

**原因**: 
- カラムマッピングの問題
- データ型の不一致

**確認方法**:
```bash
cd backend
npx ts-node check-aa4160-detailed.ts
```

**解決策**:
- `PropertyListingColumnMapper.ts`のマッピングを確認
- スプレッドシートのカラム名を確認（例: BS列 = `売買価格`）

### 問題4: 変更が検出されない

**症状**: スプレッドシートを更新しても「No updates detected」と表示される

**原因**: 
- `detectChanges()`メソッドの正規化処理
- データ型の不一致

**確認方法**:
```bash
cd backend
npx ts-node check-aa4160-detailed.ts
```

**デバッグ**:
```typescript
// PropertyListingSyncService.ts の detectChanges() メソッドにログを追加
console.log(`[DEBUG] Comparing ${dbField}:`, {
  spreadsheet: normalizedSpreadsheetValue,
  database: normalizedDbValue,
  match: normalizedSpreadsheetValue === normalizedDbValue
});
```

---

## 📊 手動同期スクリプト

### sync-aa4160-manual.ts

**用途**: 手動で物件リストを同期（デバッグ用）

**実行方法**:
```bash
cd backend
npx ts-node sync-aa4160-manual.ts
```

**出力例**:
```
🔄 Starting property listing update sync...
📊 Detected 138 properties with changes
Processing batch 1/14 (10 properties)...
  ✅ 10 updated, ❌ 0 failed
...
📊 Sync Summary:
  Total: 138
  Updated: 137
  Failed: 1
  Duration: 227224ms
```

---

## 🎯 カラムマッピング

### スプレッドシート → データベース

| スプレッドシートカラム | データベースカラム | 備考 |
|---------------------|------------------|------|
| `物件番号` | `property_number` | 主キー |
| `売買価格` (BS列) | `price` | 万円単位 → 円単位に変換 |
| `所在地` | `address` | |
| `atbb成約済み/非公開` | `atbb_status` | |
| `物件種別` | `property_type` | |

**重要**: `PropertyListingColumnMapper.ts`でマッピングを管理

---

## 🔍 デバッグコマンド

### データベースの状態を確認

```bash
cd backend
npx ts-node check-aa4160-detailed.ts
```

### スプレッドシートの状態を確認

```bash
cd backend
npx ts-node check-aa4160-spreadsheet-direct.ts
```

### 手動同期を実行

```bash
cd backend
npx ts-node sync-aa4160-manual.ts
```

### 自動同期のログを確認

```bash
# Vercelログ（本番環境）
vercel logs

# ローカルログ
cd backend
npm run dev
# ログを確認
```

---

## 📚 関連ドキュメント

- [スプレッドシート設定ガイド](.kiro/steering/spreadsheet-configuration.md)
- [スプレッドシートカラムマッピング](.kiro/steering/spreadsheet-column-mapping.md)
- [物件座標データ自動同期ガイド](.kiro/steering/property-coordinates-auto-sync.md)

---

## ✅ 動作確認チェックリスト

- [ ] `AUTO_SYNC_ENABLED=true`が設定されている
- [ ] バックエンドサーバーが起動している
- [ ] スプレッドシートを更新後、5分以内にデータベースに反映される
- [ ] `check-aa4160-detailed.ts`で変更が確認できる
- [ ] Google Sheets APIクォータ超過エラーが発生しない

---

## 🎯 まとめ

### 正常動作の条件

1. ✅ `AUTO_SYNC_ENABLED=true`
2. ✅ バックエンドサーバーが起動中
3. ✅ 環境変数が正しく設定されている
4. ✅ Google Sheets APIクォータ対策が実装されている

### 問題が発生したら

1. **このガイドを確認**
2. **動作確認済みコミット（3fa960d）に戻す**
3. **環境変数を確認**
4. **バックエンドサーバーを再起動**

**このガイドに従うことで、物件リスト自動同期機能を確実に復元できます。**

---

**最終更新日**: 2026年1月25日
**動作確認済みコミット**: `3fa960d`
**ステータス**: ✅ 正常動作中
