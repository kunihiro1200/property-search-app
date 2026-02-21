# 買主自動同期機能 - 設計書

## アーキテクチャ概要

買主自動同期機能は、`EnhancedAutoSyncService`に買主同期機能を追加することで実装します。売主同期と同様のアーキテクチャを採用し、5分ごとの自動同期で実行されます。

## コンポーネント設計

### 1. EnhancedAutoSyncService（拡張）

#### 1.1 買主用プロパティ

```typescript
// 買主用のGoogle Sheetsクライアント
private buyerSheetsClient: GoogleSheetsClient | null = null;
private buyerColumnMapper: any | null = null;
private isBuyerInitialized = false;

// 買主スプレッドシートキャッシュ
private buyerSpreadsheetCache: any[] | null = null;
private buyerSpreadsheetCacheExpiry: number = 0;
```

#### 1.2 初期化メソッド

```typescript
/**
 * 買主用Google Sheetsクライアントを初期化
 */
async initializeBuyer(): Promise<void>
```

**処理内容**:
1. 環境変数から買主スプレッドシートIDとシート名を取得
2. Google Sheetsクライアントを初期化
3. BuyerColumnMapperをインポート
4. 初期化フラグを設定

#### 1.3 データ取得メソッド

```typescript
/**
 * 買主スプレッドシートデータを取得（キャッシュ対応）
 */
private async getBuyerSpreadsheetData(forceRefresh: boolean = false): Promise<any[]>
```

**処理内容**:
1. キャッシュが有効な場合は、キャッシュから返す
2. キャッシュが無効な場合は、スプレッドシートから取得
3. 取得したデータを60分間キャッシュ

#### 1.4 検出メソッド

```typescript
/**
 * DBから全買主番号を取得（ページネーション対応）
 */
private async getAllDbBuyerNumbers(): Promise<Set<string>>

/**
 * スプレッドシートにあってDBにない買主番号を検出
 */
async detectMissingBuyers(): Promise<string[]>

/**
 * 更新が必要な買主を検出
 */
async detectUpdatedBuyers(): Promise<string[]>
```

**処理内容**:
- `getAllDbBuyerNumbers()`: データベースから全買主番号を取得（ページネーション対応）
- `detectMissingBuyers()`: スプレッドシートとデータベースの差分を計算
- `detectUpdatedBuyers()`: スプレッドシートとデータベースのデータを比較し、変更があった買主を検出

#### 1.5 同期メソッド

```typescript
/**
 * 不足している買主を同期
 */
async syncMissingBuyers(buyerNumbers: string[]): Promise<SyncResult>

/**
 * 既存買主のデータを更新
 */
async syncUpdatedBuyers(buyerNumbers: string[]): Promise<SyncResult>

/**
 * 単一の買主を同期（新規作成）
 */
private async syncSingleBuyer(buyerNumber: string, row: any): Promise<void>

/**
 * 単一の買主を更新
 */
private async updateSingleBuyer(buyerNumber: string, row: any): Promise<void>

/**
 * 買主の完全同期を実行
 */
async syncBuyers(): Promise<{
  missingBuyers: string[];
  updatedBuyers: string[];
  syncMissingResult: SyncResult | null;
  syncUpdatedResult: SyncResult | null;
}>
```

**処理内容**:
- `syncMissingBuyers()`: 不足している買主を一括同期
- `syncUpdatedBuyers()`: 既存買主のデータを一括更新
- `syncSingleBuyer()`: 単一の買主を同期（INSERT/UPDATE方式）
- `updateSingleBuyer()`: 単一の買主を更新
- `syncBuyers()`: 完全同期を実行（不足買主の検出→同期、更新買主の検出→更新）

#### 1.6 日付フォーマットメソッド

```typescript
/**
 * 日付を YYYY-MM-DD 形式にフォーマット（買主用）
 */
private formatBuyerDate(value: any): string | null
```

**処理内容**:
1. Excelシリアル値（数値）の場合、日付に変換
2. 日付が有効範囲内（1900-01-01 ～ 2100-12-31）かチェック
3. 異常な値の場合はnullを返す
4. 文字列の場合、YYYY-MM-DD形式に変換

### 2. runFullSync()への統合

```typescript
// Phase 5: 買主同期
console.log('\n👥 Phase 5: Buyer Sync');
console.log('   Syncing buyers from spreadsheet...');

const buyerSyncResult = await this.syncBuyers();

const buyerAddedCount = buyerSyncResult.syncMissingResult?.newSellersCount || 0;
const buyerUpdatedCount = buyerSyncResult.syncUpdatedResult?.updatedSellersCount || 0;
const buyerFailedCount = (buyerSyncResult.syncMissingResult?.errors.length || 0) + (buyerSyncResult.syncUpdatedResult?.errors.length || 0);

console.log(`✅ Buyer sync completed: ${buyerAddedCount} added, ${buyerUpdatedCount} updated, ${buyerFailedCount} failed`);
```

## データフロー

### 1. 自動同期フロー

```
EnhancedPeriodicSyncManager (5分ごと)
  ↓
runFullSync()
  ↓
Phase 5: Buyer Sync
  ↓
syncBuyers()
  ↓
├─ detectMissingBuyers() → syncMissingBuyers()
│   ↓
│   syncSingleBuyer() (各買主)
│     ↓
│     ├─ 既存買主を確認
│     ├─ 存在する場合: UPDATE
│     └─ 存在しない場合: INSERT
│
└─ detectUpdatedBuyers() → syncUpdatedBuyers()
    ↓
    updateSingleBuyer() (各買主)
      ↓
      UPDATE (buyer_numberで識別)
```

### 2. データ変換フロー

```
スプレッドシート
  ↓
getBuyerSpreadsheetData() (キャッシュ60分)
  ↓
BuyerColumnMapper.mapSpreadsheetToDatabase()
  ↓
formatBuyerDate() (日付変換)
  ↓
Supabase (buyers テーブル)
```

## エラーハンドリング

### 1. UPSERT制約エラー

**問題**: `onConflict: 'buyer_number'`を指定しているが、`buyer_number`にユニーク制約が存在しない

**解決策**: UPSERTの代わりにINSERT/UPDATEを使用

```typescript
// 既存の買主を確認
const { data: existingBuyer, error: checkError } = await this.supabase
  .from('buyers')
  .select('buyer_id')
  .eq('buyer_number', buyerNumber)
  .maybeSingle();

if (existingBuyer) {
  // 既存の買主を更新
  await this.supabase
    .from('buyers')
    .update(buyerData)
    .eq('buyer_number', buyerNumber);
} else {
  // 新規買主を挿入
  await this.supabase
    .from('buyers')
    .insert(buyerData);
}
```

### 2. 日付範囲エラー

**問題**: 異常なExcelシリアル値（45000番台）が存在し、「time zone displacement out of range」エラーが発生

**解決策**: `formatBuyerDate()`メソッドで日付範囲チェックを実装

```typescript
// 日付が有効範囲内かチェック（1900-01-01 ～ 2100-12-31）
const year = date.getFullYear();
if (year < 1900 || year > 2100) {
  console.warn(`⚠️  Invalid year from Excel serial: ${year} (serial: ${numValue})`);
  return null;
}
```

### 3. エラーログ

同期エラーが発生した場合、以下の情報をログに記録：
- 買主番号
- エラーメッセージ
- タイムスタンプ

```typescript
errors.push({
  sellerNumber: buyerNumber,
  message: error.message,
  timestamp: new Date(),
});
console.error(`❌ ${buyerNumber}: ${error.message}`);
```

## パフォーマンス最適化

### 1. キャッシュ戦略

**買主スプレッドシートデータ**:
- キャッシュ時間: 60分
- 理由: Google Sheets APIクォータ対策
- 手動同期時: キャッシュを自動的にクリア

### 2. ページネーション

**データベースからの買主番号取得**:
- ページサイズ: 1000件
- 理由: Supabaseのデフォルト制限（1000件）を回避

### 3. バッチ処理

**買主同期**:
- 一括処理: 全買主を一度に同期
- エラーハンドリング: 個別の買主でエラーが発生しても、他の買主の同期を継続

## セキュリティ

### 1. 認証

- Google Sheets API: サービスアカウント認証
- Supabase: サービスキー認証

### 2. データ暗号化

- 買主の個人情報（名前、電話番号、メールアドレス）は暗号化されない
- 理由: BuyerColumnMapperが暗号化を処理

## テスト戦略

### 1. 単体テスト

- `initializeBuyer()`: 初期化が正しく行われるか
- `getBuyerSpreadsheetData()`: キャッシュが正しく動作するか
- `detectMissingBuyers()`: 不足買主が正しく検出されるか
- `detectUpdatedBuyers()`: 更新買主が正しく検出されるか
- `syncSingleBuyer()`: 単一の買主が正しく同期されるか
- `updateSingleBuyer()`: 単一の買主が正しく更新されるか
- `formatBuyerDate()`: 日付が正しく変換されるか

### 2. 統合テスト

- `syncBuyers()`: 完全同期が正しく動作するか
- `runFullSync()`: Phase 5が正しく実行されるか

### 3. E2Eテスト

- 5分ごとの自動同期が正常に動作するか
- 買主6666のデータが正しく同期されるか

## デプロイメント

### 1. 環境変数

```bash
# 買主スプレッドシート設定
GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GOOGLE_SHEETS_BUYER_SHEET_NAME=買主リスト
```

### 2. デプロイ手順

1. コードをコミット
2. バックエンドサーバーを再起動
3. 自動同期が動作することを確認
4. 買主6666のデータが正しく同期されることを確認

## モニタリング

### 1. ログ

- 同期開始/終了ログ
- 追加/更新/エラー件数
- 処理時間

### 2. アラート

- 同期エラーが10件以上発生した場合
- 同期時間が5分を超えた場合

## 今後の改善

### 1. ユニーク制約の追加

`buyer_number`にユニーク制約を追加し、UPSERTを使用できるようにする。

**マイグレーション**: `backend/migrations/094_add_buyer_number_unique_constraint.sql`

### 2. 異常なExcelシリアル値の修正

14件の買主の異常なExcelシリアル値を手動で修正する。

### 3. パフォーマンス改善

- 並列処理の導入
- データベースクエリの最適化

## 参考資料

- `backend/src/services/EnhancedAutoSyncService.ts` - 実装ファイル
- `backend/src/services/BuyerColumnMapper.ts` - カラムマッピング実装
- `backend/src/config/buyer-column-mapping.json` - カラムマッピング定義
- `.kiro/steering/buyer-table-column-definition.md` - 買主テーブルのカラム定義

## 更新履歴

- 2026-02-05: 初版作成
