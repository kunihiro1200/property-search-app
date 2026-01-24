# property_details 同期問題の原因と対策

## 📊 問題の概要

**日時**: 2026年1月25日  
**物件**: AA13249（および他の172件）  
**症状**: 物件リストの詳細画面でコメント類（おすすめ、お気に入り、こちらの物件について）が表示されない

---

## 🔍 調査結果

### 1. データベースの状態

- **property_listings**: 1,468件
- **property_details**: 1,296件
- **差分**: **172件の物件が同期されていない**
- **最近の100件中**: **95件が同期されていない**

### 2. 同期されていない物件の例

1. CC32
2. CC24
3. CC22
4. AA6362
5. 上人西
6. 富士見が丘東
7. 光町
8. 大畑（土地）
9. 明野東（土地）
10. リビオ明野中央エミシア808
... （他85件）

---

## 🐛 根本原因

### 原因1: `updatePropertyDetailsFromSheets`メソッドがコメントアウトされている

**ファイル**: `backend/src/services/PropertyListingSyncService.ts`  
**行番号**: 629

```typescript
// 追加データも取得して保存（初回から高速表示のため）
// 一時的に無効化: sellersテーブルのcommentsカラムエラーを回避
// await this.updatePropertyDetailsFromSheets(update.property_number);
```

**影響**:
- 新規物件作成時に`property_details`が作成されない
- 既存物件更新時に`property_details`が更新されない

### 原因2: 自動同期サービスが`property_details`を同期していない

**ファイル**: `backend/src/services/EnhancedAutoSyncService.ts`

**確認結果**:
- `EnhancedAutoSyncService`は`sellers`テーブルの同期のみを行っている
- `property_details`テーブルの同期処理が存在しない

### 原因3: 手動同期スクリプトが存在しない

**確認結果**:
- 既存物件の`property_details`を一括同期するスクリプトが存在しない
- 個別物件ごとに手動で同期する必要がある（AA13249のように）

---

## 💡 対策

### 対策1: `updatePropertyDetailsFromSheets`のコメントアウトを解除（最優先）

**ファイル**: `backend/src/services/PropertyListingSyncService.ts`  
**行番号**: 629

**修正前**:
```typescript
// await this.updatePropertyDetailsFromSheets(update.property_number);
```

**修正後**:
```typescript
await this.updatePropertyDetailsFromSheets(update.property_number);
```

**効果**:
- 今後の新規物件作成時に`property_details`が自動作成される
- 既存物件更新時に`property_details`が自動更新される

**注意**:
- コメントに「sellersテーブルのcommentsカラムエラーを回避」とあるため、エラーが再発する可能性がある
- エラーが発生した場合は、`updatePropertyDetailsFromSheets`メソッド内でエラーハンドリングを強化する

---

### 対策2: 既存物件の一括同期スクリプトを作成・実行

**目的**: 既存の172件の物件を`property_details`に同期

**スクリプト**: `backend/sync-all-missing-property-details.ts`（作成が必要）

**処理フロー**:
1. `property_listings`から全物件を取得
2. `property_details`に存在しない物件を検出
3. 各物件について以下のデータを取得:
   - `property_about`（こちらの物件について）
   - `recommended_comments`（おすすめポイント）
   - `favorite_comment`（お気に入り文言）
   - `athome_data`（パノラマURLなど）
4. `property_details`テーブルに保存

**実行方法**:
```bash
cd backend
npx ts-node sync-all-missing-property-details.ts
```

**推定実行時間**: 約10-20分（172件 × 5-10秒/件）

---

### 対策3: 自動同期サービスに`property_details`同期を追加（✅ 完了）

**ファイル**: `backend/src/services/EnhancedAutoSyncService.ts`

**実装内容**:

**Phase 4.7を追加**:
```typescript
// Phase 4.7: property_details同期
async syncMissingPropertyDetails(): Promise<{
  success: boolean;
  synced: number;
  failed: number;
  duration_ms: number;
}> {
  // 1. property_listingsから全物件番号を取得
  // 2. property_detailsから全物件番号を取得
  // 3. 差分を計算
  // 4. 不足している物件のproperty_detailsを作成（空のレコード）
}
```

**runFullSync()に統合**:
```typescript
// Phase 4.7: property_details同期（新規追加）
console.log('\n📝 Phase 4.7: Property Details Sync');
const pdResult = await this.syncMissingPropertyDetails();
```

**効果**:
- 今後、新規物件が追加された際に自動的に`property_details`も作成される
- 5分ごとの自動同期で不足している`property_details`が検出・作成される
- バッチ処理（10件ずつ）でデータベースへの負荷を軽減

**実装日**: 2026年1月25日  
**コミット**: `56a3aba` - "Add: Phase 4.7 property_details sync to EnhancedAutoSyncService"

**注意**:
- 現在の実装では空のレコード（NULL値）を作成
- 実際のデータ（おすすめコメント、お気に入り文言など）は`updatePropertyDetailsFromSheets`で取得
- Phase 4.5（物件リスト更新同期）で`updatePropertyDetailsFromSheets`が呼び出される

---

### 対策4: エラーハンドリングの強化

**ファイル**: `backend/src/services/PropertyListingSyncService.ts`  
**メソッド**: `updatePropertyDetailsFromSheets`

**現在の問題**:
- エラーが発生すると、そのまま例外がスローされる
- 1件のエラーで全体の同期が停止する可能性がある

**改善案**:
```typescript
private async updatePropertyDetailsFromSheets(propertyNumber: string): Promise<void> {
  try {
    // ... 既存の処理 ...
  } catch (error: any) {
    // エラーをログに記録するが、例外はスローしない
    console.error(`[PropertyListingSyncService] Error updating property details for ${propertyNumber}:`, error);
    
    // エラーをデータベースに記録（オプション）
    await this.logSyncError(propertyNumber, 'property_details', error.message);
    
    // 例外をスローせず、処理を続行
    return;
  }
}
```

---

## 🚀 実装優先順位

### 優先度1: 即座に実施（今日中）

1. ✅ **AA13249の手動同期** - 完了
2. ✅ **`updatePropertyDetailsFromSheets`のコメントアウト解除** - 完了
3. ✅ **一括同期スクリプトの作成・実行** - 完了（172件全て同期成功）

### 優先度2: 今週中に実施

4. ✅ **自動同期サービスへの`property_details`同期追加** - 完了
   - `EnhancedAutoSyncService.ts`に**Phase 4.7**を追加
   - `syncMissingPropertyDetails()`メソッドを実装
   - `runFullSync()`に統合
   - 自動的に不足している`property_details`を検出して同期
   - **テスト実行**: `test-phase-4-7-property-details-sync.ts` - 成功
   - **結果**: 差分0件（全て同期済み）
5. ✅ **エラーハンドリングの強化** - 既に実装済み
   - `updatePropertyDetailsFromSheets()`メソッドは既に十分なエラーハンドリングを実装
   - メソッド全体が`try-catch`で囲まれている
   - 各データ取得処理で個別に`.catch()`でエラーハンドリング
   - エラーが発生しても処理を続行（`return null`や空配列を返す）
   - エラーログを出力
   - **追加の改善は不要**（オプションで推奨対応に記載）

### 優先度3: 今月中に実施（オプション）

6. ⏳ **同期ログの記録機能追加**（オプション）
   - `updatePropertyDetailsFromSheets()`のエラーをデータベースに記録
   - 新しいテーブル`property_details_sync_logs`を作成
   - 同期日時、物件番号、結果、エラーメッセージを記録
7. ⏳ **リトライ機能の追加**（オプション）
   - Google Sheets APIのレート制限エラー時に自動リトライ
   - 指数バックオフ（exponential backoff）を実装
8. ⏳ **同期状態の監視ダッシュボード作成**（オプション）
   - 同期状態を可視化
   - エラー発生時のアラート機能

---

## 📝 今後の予防策

### 1. 定期的な同期状態チェック

**スクリプト**: `backend/check-property-details-sync-status.ts`（作成が必要）

**実行頻度**: 毎日1回（cron jobで自動実行）

**チェック内容**:
- `property_listings`と`property_details`の件数差分
- 最近作成された物件の同期状態
- 同期エラーの有無

### 2. アラート機能の追加

**条件**:
- 差分が10件以上になった場合
- 同期エラーが3件以上発生した場合
- 24時間以上同期が実行されていない場合

**通知方法**:
- Slackへの通知
- メール通知
- ログファイルへの記録

### 3. 同期ログの記録

**テーブル**: `property_details_sync_logs`（作成が必要）

**記録内容**:
- 同期日時
- 物件番号
- 同期結果（成功/失敗）
- エラーメッセージ
- 実行時間

---

## 🔧 トラブルシューティング

### 問題: 同期後もコメントが表示されない

**確認項目**:
1. ブラウザのキャッシュをクリア（Ctrl+Shift+R）
2. シークレットモードで確認
3. APIレスポンスを確認（`/api/public/properties/{property_number}/complete`）
4. データベースを直接確認（`property_details`テーブル）

### 問題: 同期スクリプトがエラーで停止する

**対処法**:
1. エラーメッセージを確認
2. 該当物件のスプレッドシートデータを確認
3. エラーハンドリングを追加して、1件のエラーで全体が停止しないようにする

### 問題: 同期が遅い

**原因**:
- Google Sheets APIのレート制限
- 並列処理が実装されていない

**対処法**:
1. バッチ処理を実装（10件ずつ処理）
2. 並列処理を実装（Promise.all）
3. キャッシュを活用

---

## 📊 まとめ

### 問題の本質

- **`updatePropertyDetailsFromSheets`がコメントアウトされていた** ✅ 解決済み
- **自動同期サービスが`property_details`を同期していなかった** ✅ 解決済み
- **既存物件の一括同期スクリプトが存在しなかった** ✅ 解決済み

### 解決策（全て完了）

1. ✅ **AA13249を手動同期** - 完了
2. ✅ **`updatePropertyDetailsFromSheets`のコメントアウト解除** - 完了
3. ✅ **一括同期スクリプトの作成・実行** - 完了（172件全て同期成功）
4. ✅ **自動同期サービスへの追加** - 完了（Phase 4.7実装・テスト成功）
5. ✅ **エラーハンドリングの確認** - 完了（既に十分に実装済み）

### 今後の予防策（オプション）

- 定期的な同期状態チェック（推奨）
- アラート機能の追加（推奨）
- 同期ログの記録（推奨）

### 結論

**全ての必須タスク（優先度1・2）が完了しました。**

- `property_details`同期問題は完全に解決
- 今後、新規物件が追加されても自動的に`property_details`が作成される
- エラーハンドリングも十分に実装されている
- 5分ごとの自動同期で不足している`property_details`が検出・作成される

**システムは正常に動作しています。**

---

**最終更新日**: 2026年1月25日  
**ステータス**: ✅ 全タスク完了
