# お気に入り文言システム - 完全ガイド

## 📋 目次
1. [システム概要](#システム概要)
2. [データフロー](#データフロー)
3. [重要な修正履歴](#重要な修正履歴)
4. [トラブルシューティング](#トラブルシューティング)
5. [診断コマンド](#診断コマンド)
6. [データ復旧手順](#データ復旧手順)

---

## システム概要

### お気に入り文言とは
公開物件サイトの物件詳細ページで、画像上に表示される物件の魅力を伝える短文。

### データの保存場所
- **テーブル**: `property_details`
- **カラム**: `favorite_comment` (TEXT型)
- **関連カラム**: `property_about`, `recommended_comments`, `athome_data`

### データソース
1. **優先**: 業務リスト（業務依頼スプレッドシート）の「スプシURL」列
2. **フォールバック**: 業務依頼Driveフォルダ内の物件番号を含むスプレッドシート

### 取得方法
個別物件スプレッドシートの`athome`シートから物件タイプ別のセルを取得：
- **土地**: B53
- **戸建て**: B142
- **マンション**: B150

---

## データフロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 公開物件サイトでユーザーが物件詳細ページを表示           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. PropertyListingService.getPublicPropertyById()           │
│    - property_listingsテーブルから物件情報を取得            │
│    - property_detailsテーブルからfavorite_commentを取得     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. favorite_commentがnullの場合                             │
│    → FavoriteCommentService.getFavoriteComment()を呼び出し  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. GyomuListService: 業務リストから「スプシURL」を検索      │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    見つからない場合
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. GyomuDriveFolderService: Driveフォルダから検索           │
│    - フォルダID: 1d9oHRSQ1_UAC5XakBLijUsendj0ZxD4F           │
│    - 物件番号を含むスプレッドシートを検索                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. GoogleSheetsClient: athomeシートから文言を取得           │
│    - 物件タイプに応じたセル位置から取得                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Redisキャッシュに保存（5分間）                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 重要な修正履歴

### 🐛 バグ1: データ削除問題（2026-01-14 03:10-03:11）

#### 問題
`PropertyDetailsService.upsertPropertyDetails()`が部分更新時に**全フィールドをnullで上書き**していた。

#### 原因
```typescript
// ❌ 間違った実装
async upsertPropertyDetails(propertyNumber: string, details: Partial<PropertyDetails>) {
  await supabase
    .from('property_details')
    .upsert({
      property_number: propertyNumber,
      recommended_comments: details.recommended_comments || null,  // ← nullで上書き！
      athome_data: details.athome_data || null,                    // ← nullで上書き！
      favorite_comment: details.favorite_comment || null,          // ← nullで上書き！
      property_about: details.property_about || null,              // ← nullで上書き！
    });
}
```

#### 修正内容
```typescript
// ✅ 正しい実装
async upsertPropertyDetails(propertyNumber: string, details: Partial<PropertyDetails>) {
  // 既存データを取得
  const existing = await this.getByPropertyNumber(propertyNumber);
  
  // 既存データとマージ（提供されたフィールドのみ更新）
  const merged = {
    property_number: propertyNumber,
    recommended_comments: details.recommended_comments ?? existing?.recommended_comments ?? null,
    athome_data: details.athome_data ?? existing?.athome_data ?? null,
    favorite_comment: details.favorite_comment ?? existing?.favorite_comment ?? null,
    property_about: details.property_about ?? existing?.property_about ?? null,
  };
  
  await supabase.from('property_details').upsert(merged);
}
```

#### 影響を受けたファイル
- `backend/src/services/PropertyDetailsService.ts` ✅ 修正済み
- `backend/src/scripts/populatePropertyDetails.ts` ✅ 修正済み

---

### 🐛 バグ2: property_number検索問題

#### 問題
`PropertyListingService.getPublicPropertyById()`がUUIDのみ受け付けていたが、フロントエンドは`property_number`を渡していた。

#### 修正内容
```typescript
// ✅ UUIDとproperty_numberの両方に対応
async getPublicPropertyById(identifier: string): Promise<any> {
  // UUIDかproperty_numberかを判定
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  
  const query = supabase
    .from('property_listings')
    .select('*, property_details(*)')
    .in('atbb_status', PUBLIC_ATBB_STATUSES);
  
  if (isUUID) {
    query.eq('id', identifier);
  } else {
    query.eq('property_number', identifier);
  }
  
  const { data } = await query.single();
  return data;
}
```

#### 影響を受けたファイル
- `backend/src/services/PropertyListingService.ts` ✅ 修正済み

---

### ✨ 機能追加: Driveフォルダフォールバック

#### 概要
業務リストにない物件でも、業務依頼Driveフォルダから物件番号を含むスプレッドシートを自動検索。

#### 実装
- `backend/src/services/GyomuDriveFolderService.ts` （既存）
- `backend/src/services/FavoriteCommentService.ts` ✅ 更新済み

#### 検索ロジック
1. 業務リストの「スプシURL」列を検索
2. 見つからない場合 → Driveフォルダ内を検索
   - フォルダID: `1d9oHRSQ1_UAC5XakBLijUsendj0ZxD4F`
   - クエリ: `name contains '物件番号' and mimeType='application/vnd.google-apps.spreadsheet'`
3. 複数見つかった場合 → スコアリングで最適なマッチを選択

---

## トラブルシューティング

### 症状1: お気に入り文言が表示されない

#### 診断手順
```bash
# 1. データベースの状態を確認
cd backend
node check-db-property-details-status.ts

# 2. 特定の物件を確認
node check-property-details-favorite-comment.ts
```

#### 確認ポイント
1. **property_detailsテーブルにデータがあるか？**
   - ある → フロントエンドの表示ロジックを確認
   - ない → 同期スクリプトを実行

2. **業務リストに物件が登録されているか？**
   ```bash
   node check-gyomu-list-coverage.ts
   ```

3. **Driveフォルダにスプレッドシートがあるか？**
   ```bash
   node test-drive-folder-search.ts
   ```

---

### 症状2: データが突然消えた

#### 原因の特定
```bash
# 最近の更新を確認
node investigate-favorite-comment-deletion.ts
```

#### よくある原因
1. **`PropertyDetailsService.upsertPropertyDetails()`の誤用**
   - 部分更新時にnullを渡していないか確認
   - 修正済みだが、他のスクリプトで同様の問題がないか確認

2. **`populatePropertyDetails.ts`の実行**
   - このスクリプトは全フィールドを更新する
   - 実行前に必ずバックアップを取る

#### データ復旧手順
```bash
# 1. バックアップから復旧（推奨）
# Supabaseダッシュボードでバックアップを確認

# 2. 再同期
node sync-favorite-comments-to-database.ts --force --property-number AA12345
```

---

### 症状3: Google Sheets APIクォータエラー

#### エラーメッセージ
```
Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'
```

#### 対策
1. **待機**: 1分間待ってから再試行
2. **バッチ処理**: 自動同期スクリプトは10分間隔で実行
3. **キャッシュ活用**: 
   - GyomuListService: 5分間キャッシュ
   - GyomuDriveFolderService: 30分間キャッシュ

---

## 診断コマンド

### 基本診断
```bash
cd backend

# 全体の状態を確認
node check-db-property-details-status.ts

# 特定の物件を確認
node check-property-details-favorite-comment.ts

# 業務リストのカバレッジを確認
node check-gyomu-list-coverage.ts
```

### 詳細診断
```bash
# お気に入り文言の問題を診断
node diagnose-favorite-comment-issue.ts

# 表示問題を診断
node diagnose-favorite-comment-display-issue.ts

# Driveフォルダ検索をテスト
node test-drive-folder-search.ts

# フォールバック機能をテスト
node test-favorite-comment-with-drive-fallback.ts
```

### 同期スクリプト
```bash
# 手動同期（1件）
node sync-favorite-comments-to-database.ts --property-number AA12345

# 手動同期（バッチ）
node sync-favorite-comments-to-database.ts --limit 20 --offset 0

# 強制上書き
node sync-favorite-comments-to-database.ts --force --property-number AA12345

# ドライラン（実際には保存しない）
node sync-favorite-comments-to-database.ts --dry-run --limit 10

# 自動バッチ同期（10分間隔）
node auto-sync-all-favorite-comments.ts
```

---

## データ復旧手順

### ケース1: 特定の物件のデータが消えた

```bash
# 1. 現在の状態を確認
node check-property-details-favorite-comment.ts

# 2. 再同期（強制上書き）
node sync-favorite-comments-to-database.ts --force --property-number AA12345

# 3. 確認
node check-property-details-favorite-comment.ts
```

### ケース2: 複数の物件のデータが消えた

```bash
# 1. 影響範囲を確認
node check-db-property-details-status.ts

# 2. バッチ再同期
node sync-favorite-comments-to-database.ts --force --limit 100 --offset 0

# 3. 確認
node check-db-property-details-status.ts
```

### ケース3: 全データが消えた

```bash
# 1. Supabaseダッシュボードでバックアップを確認
# https://supabase.com/dashboard/project/krxhrbtlgfjzsseegaqq

# 2. バックアップから復旧（推奨）

# 3. または全件再同期
node auto-sync-all-favorite-comments.ts
```

---

## 現在の状態（2026-01-16）

### データベース統計
- **総レコード数**: 1,291件
- **favorite_comment保存済み**: 10件 (1%)
- **property_about保存済み**: 109件 (8%)
- **recommended_comments保存済み**: 19件 (1%)
- **athome_data保存済み**: 16件 (1%)

### 自動同期の進捗
- **実行中**: `auto-sync-all-favorite-comments.ts`
- **完了バッチ**: 15バッチ（300件処理）
- **待機中**: バッチ16（オフセット300）
- **バッチサイズ**: 20件
- **待機時間**: 10分間

### 既知の問題
- **Google Sheets APIクォータ**: 頻繁に制限に達する
- **対策**: 10分間隔のバッチ処理で対応中

---

## 重要なファイル

### サービス
- `backend/src/services/FavoriteCommentService.ts` - お気に入り文言取得
- `backend/src/services/PropertyDetailsService.ts` - property_details操作
- `backend/src/services/PropertyListingService.ts` - 物件情報取得
- `backend/src/services/GyomuListService.ts` - 業務リスト検索
- `backend/src/services/GyomuDriveFolderService.ts` - Driveフォルダ検索

### スクリプト
- `backend/sync-favorite-comments-to-database.ts` - 手動同期
- `backend/auto-sync-all-favorite-comments.ts` - 自動バッチ同期
- `backend/check-db-property-details-status.ts` - 状態確認

### ドキュメント
- `backend/FAVORITE_COMMENT_SYSTEM_GUIDE.md` - このファイル
- `backend/DRIVE_FOLDER_FALLBACK_SUMMARY.md` - フォールバック機能の詳細

---

## まとめ

### ✅ 修正済み
1. `PropertyDetailsService.upsertPropertyDetails()`の部分更新バグ
2. `PropertyListingService.getPublicPropertyById()`のproperty_number対応
3. Driveフォルダフォールバック機能の追加

### 🔄 進行中
- 全公開物件のお気に入り文言同期（自動バッチ処理）

### ⚠️ 注意事項
- `PropertyDetailsService.upsertPropertyDetails()`を使用する際は、必ず既存データを保持すること
- Google Sheets APIクォータに注意（1分あたりの読み取り制限）
- データ削除が発生した場合は、このガイドの「データ復旧手順」を参照

---

**最終更新**: 2026-01-16  
**作成者**: Kiro AI Assistant
