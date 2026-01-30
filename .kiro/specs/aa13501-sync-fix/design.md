# AA13501同期修正 - 設計書

## 概要

AA13501の不通フィールド（`unreachable_status`）、物件住所（`property_address`）、コメント（`comments`）がスプレッドシートに同期されない問題を修正します。

## アーキテクチャ

### 影響を受けるコンポーネント

```
┌─────────────────────────────────────────────────────────────┐
│                    売主管理システム                          │
│                   (backend/src/)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │  SellerService   │────────▶│  SpreadsheetSync │        │
│  │                  │         │     Service      │        │
│  └──────────────────┘         └──────────────────┘        │
│           │                            │                   │
│           │                            │                   │
│           ▼                            ▼                   │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │   Supabase DB    │         │  ColumnMapper    │        │
│  │  (sellers table) │         │                  │        │
│  └──────────────────┘         └──────────────────┘        │
│                                         │                   │
│                                         │                   │
│                                         ▼                   │
│                                ┌──────────────────┐        │
│                                │ column-mapping   │        │
│                                │     .json        │        │
│                                └──────────────────┘        │
│                                         │                   │
└─────────────────────────────────────────┼───────────────────┘
                                          │
                                          ▼
                                ┌──────────────────┐
                                │  Google Sheets   │
                                │   売主リスト      │
                                └──────────────────┘
```

### データフロー

#### 1. データベース → スプレッドシート（同期）

```
SellerService.updateSeller()
    │
    ├─ データベースを更新
    │   └─ unreachable_status, property_address を保存
    │
    └─ SpreadsheetSyncService.syncToSpreadsheet()
        │
        └─ ColumnMapper.mapToSheet()
            │
            ├─ unreachable_status → 「不通」列
            └─ property_address → 「物件所在地」列
```

#### 2. スプレッドシート → データベース（逆同期）

```
SpreadsheetSyncService (逆同期時)
    │
    └─ ColumnMapper.mapToDatabase()
        │
        ├─ 「不通」列 → unreachable_status
        └─ 「物件所在地」列 → property_address
```

## 詳細設計

### 1. column-mapping.json の修正

#### 1.1 現状の問題

**spreadsheetToDatabase（スプレッドシート → データベース）**:
```json
{
  "不通": "is_unreachable",  // ← boolean型にマッピング（問題）
  "物件所在地": "property_address",  // ← OK
  // "コメント"のマッピングが存在しない ← 問題
}
```

**databaseToSpreadsheet（データベース → スプレッドシート）**:
```json
{
  "is_unreachable": "不通",  // ← boolean型のみ
  // unreachable_status のマッピングが存在しない ← 問題
  // property_address のマッピングが存在しない ← 問題
  // comments のマッピングが存在しない ← 問題
}
```

#### 1.2 修正後

**spreadsheetToDatabase（スプレッドシート → データベース）**:
```json
{
  "不通": "unreachable_status",  // ← string型にマッピング（変更）
  "物件所在地": "property_address",  // ← 変更なし
  "コメント": "comments"  // ← 追加
}
```

**databaseToSpreadsheet（データベース → スプレッドシート）**:
```json
{
  "unreachable_status": "不通",  // ← 追加
  "property_address": "物件所在地",  // ← 追加
  "comments": "コメント",  // ← 追加
  "is_unreachable": "不通"  // ← 後方互換性のため残す
}
```

**注意**: `is_unreachable`と`unreachable_status`が同じ「不通」列にマッピングされますが、`ColumnMapper.mapToSheet()`で`unreachable_status`を優先的に使用します。

### 2. ColumnMapper の修正

#### 2.1 mapToSheet() メソッドの修正

**現状**:
```typescript
mapToSheet(sellerData: SellerData): SheetRow {
  const sheetRow: SheetRow = {};

  for (const [dbColumn, sheetColumn] of Object.entries(this.dbToSpreadsheet)) {
    const value = sellerData[dbColumn];
    
    if (value === null || value === undefined) {
      sheetRow[sheetColumn] = '';
      continue;
    }

    // 型変換（逆方向）
    const targetType = this.typeConversions[dbColumn];
    sheetRow[sheetColumn] = this.convertValueToSheet(value, targetType);
  }

  return sheetRow;
}
```

**修正後**:
```typescript
mapToSheet(sellerData: SellerData): SheetRow {
  const sheetRow: SheetRow = {};

  for (const [dbColumn, sheetColumn] of Object.entries(this.dbToSpreadsheet)) {
    // 「不通」列の特殊処理: unreachable_status を優先
    if (dbColumn === 'is_unreachable' && sellerData['unreachable_status']) {
      // unreachable_status が存在する場合はスキップ
      // （unreachable_status が後で処理される）
      continue;
    }

    const value = sellerData[dbColumn];
    
    if (value === null || value === undefined) {
      sheetRow[sheetColumn] = '';
      continue;
    }

    // 型変換（逆方向）
    const targetType = this.typeConversions[dbColumn];
    sheetRow[sheetColumn] = this.convertValueToSheet(value, targetType);
  }

  return sheetRow;
}
```

#### 2.2 mapToDatabase() メソッドの確認

**現状**: 既に正しく動作しているため、変更不要

```typescript
mapToDatabase(sheetRow: SheetRow): SellerData {
  const dbData: any = {};

  for (const [sheetColumn, dbColumn] of Object.entries(this.spreadsheetToDb)) {
    const value = sheetRow[sheetColumn];
    
    // ... 変換処理 ...
    
    dbData[dbColumn] = this.convertValue(value, targetType);
  }

  return dbData as SellerData;
}
```

**動作**:
- 「不通」列 → `unreachable_status`（修正後）
- 「物件所在地」列 → `property_address`（既存）

### 3. SellerService の確認

#### 3.1 decryptSeller() メソッド

**現状**: 既に正しく実装されている

```typescript
async decryptSeller(seller: any): Promise<Seller> {
  // ...
  
  const decrypted: Seller = {
    // ...
    unreachableStatus: seller.unreachable_status || null,  // ← OK
    // ...
    property: {
      // ...
      address: property.property_address || property.address,  // ← OK
      // ...
    }
  };
  
  return decrypted;
}
```

**確認事項**:
- ✅ `unreachable_status`が正しく返される
- ✅ `property.address`が`property_address`を優先して返される

#### 3.2 updateSeller() メソッド

**現状**: 既に正しく実装されている

```typescript
async updateSeller(sellerId: string, data: UpdateSellerRequest): Promise<Seller> {
  const updates: any = {};

  // ...

  if (data.isUnreachable !== undefined) {
    updates.is_unreachable = data.isUnreachable;
    if (data.isUnreachable) {
      updates.unreachable_since = new Date();
    } else {
      updates.unreachable_since = null;
    }
  }

  // ... データベースを更新 ...

  // スプレッドシートに同期
  if (this.syncQueue) {
    await this.syncQueue.enqueue({
      type: 'update',
      sellerId: sellerId,
    });
  }

  return decryptedSeller;
}
```

**確認事項**:
- ✅ `is_unreachable`が正しく更新される
- ✅ スプレッドシート同期が呼び出される

**注意**: `unreachable_status`の更新ロジックは別途実装が必要（要件に含まれていない場合は除外）

### 4. SpreadsheetSyncService の確認

#### 4.1 syncToSpreadsheet() メソッド

**現状**: 既に正しく実装されている

```typescript
async syncToSpreadsheet(sellerId: string): Promise<SyncResult> {
  // Supabaseから売主データを取得
  const { data: seller, error } = await this.supabase
    .from('sellers')
    .select('*')
    .eq('id', sellerId)
    .single();

  // スプレッドシート形式に変換
  const sheetRow = this.columnMapper.mapToSheet(seller as SellerData);

  // 既存行を更新または新規行を追加
  // ...
}
```

**確認事項**:
- ✅ `ColumnMapper.mapToSheet()`が呼び出される
- ✅ 修正後の`mapToSheet()`で`unreachable_status`と`property_address`が正しく変換される

## 実装計画

### Phase 1: データベーススキーマの修正

**ファイル**: `backend/supabase/migrations/20260130_add_property_address_to_sellers.sql`

**変更内容**:
1. `sellers`テーブルに`property_address`カラムを追加（TEXT型、NULL許可）

**実装状況**: ✅ 完了（ユーザーが実行）

### Phase 2: column-mapping.json の修正

**ファイル**: `backend/src/config/column-mapping.json`

**変更内容**:
1. `spreadsheetToDatabase`セクション:
   - `"不通": "is_unreachable"` → `"不通": "unreachable_status"`に変更
   - `"コメント": "comments"`を追加
2. `databaseToSpreadsheet`セクション:
   - `"unreachable_status": "不通"`を追加
   - `"property_address": "物件所在地"`を追加
   - `"comments": "コメント"`を追加

**実装状況**: ✅ 完了

### Phase 3: ColumnMapper の修正

**ファイル**: `backend/src/services/ColumnMapper.ts`

**変更内容**:
1. `mapToSheet()`メソッドに「不通」列の特殊処理を追加
   - `is_unreachable`と`unreachable_status`が同じ列にマッピングされる場合、`unreachable_status`を優先

**実装状況**: ✅ 完了

### Phase 4: データ同期の実行

**ファイル**: 
- `backend/force-sync-aa13501-from-sheet.ts`
- `backend/sync-aa13501-property-address.ts`
- `backend/clear-aa13501-cache.ts`

**変更内容**:
1. スプレッドシートからAA13501のデータを強制同期
2. `property_address`を個別に同期（データベースに「未入力」が保存されていたため）
3. キャッシュをクリア

**実装状況**: ✅ 完了

### Phase 5: ステアリングドキュメントの作成

**ファイル**:
- `.kiro/steering/seller-table-column-definition.md`
- `.kiro/steering/seller-spreadsheet-column-mapping.md`

**変更内容**:
1. 売主テーブルのカラム定義を明確化
2. スプレッドシートとデータベースのカラムマッピングを完全に文書化

**実装状況**: ✅ 完了

### Phase 6: テストと検証

**テスト項目**:
1. ✅ AA13501の不通ステータスがスプレッドシートに同期されることを確認
2. ✅ AA13501の物件住所がスプレッドシートに同期されることを確認
3. ✅ AA13501のコメントがスプレッドシートに同期されることを確認
4. ✅ 既存のデータが正しく移行されることを確認
5. ✅ 双方向同期が正しく動作することを確認

**実装状況**: ✅ 完了（ユーザー確認済み）

## データ型とバリデーション

### unreachable_status

**データ型**: `string | null`

**許可される値**:
- `null`: 不通ではない
- `"不通"`: 不通
- その他の文字列: カスタムステータス（将来の拡張用）

**バリデーション**: なし（任意の文字列を許可）

### property_address

**データ型**: `string | null`

**許可される値**:
- `null`: 物件住所が未設定
- 任意の文字列: 物件住所

**バリデーション**: なし（任意の文字列を許可）

## エラーハンドリング

### 1. マッピングエラー

**シナリオ**: `column-mapping.json`の設定が不正

**対応**:
- エラーログを出力
- 空文字列を返す（データの欠損を防ぐ）

### 2. 型変換エラー

**シナリオ**: データ型の変換に失敗

**対応**:
- エラーログを出力
- `null`を返す

### 3. 同期エラー

**シナリオ**: スプレッドシート同期に失敗

**対応**:
- エラーログを出力
- リトライ（`SyncQueue`が自動的に処理）

## パフォーマンス考慮事項

### 1. 同期頻度

**現状**: 売主情報が更新されるたびに同期

**影響**: なし（既存の動作を維持）

### 2. バッチ同期

**現状**: `syncBatchToSpreadsheet()`でバッチ同期をサポート

**影響**: なし（既存の動作を維持）

## セキュリティ考慮事項

### 1. データ暗号化

**現状**: `unreachable_status`と`property_address`は暗号化されていない

**影響**: なし（機密情報ではないため）

### 2. アクセス制御

**現状**: スプレッドシートへのアクセスはサービスアカウントで制御

**影響**: なし（既存のアクセス制御を維持）

## 後方互換性

### 1. is_unreachable フィールド

**対応**: `is_unreachable`（boolean）は引き続きサポート

**動作**:
- `unreachable_status`が存在する場合、`unreachable_status`を優先
- `unreachable_status`が存在しない場合、`is_unreachable`を使用

### 2. 既存のスプレッドシートデータ

**対応**: 既存のデータは自動的に移行される

**動作**:
- スプレッドシートの「不通」列 → `unreachable_status`にマッピング
- データベースの`unreachable_status` → スプレッドシートの「不通」列にマッピング

## テスト計画

### 1. ユニットテスト

**対象**: `ColumnMapper`

**テストケース**:
1. `mapToSheet()`で`unreachable_status`が正しく変換される
2. `mapToSheet()`で`property_address`が正しく変換される
3. `mapToSheet()`で`unreachable_status`が`is_unreachable`より優先される
4. `mapToDatabase()`で「不通」列が`unreachable_status`にマッピングされる
5. `mapToDatabase()`で「物件所在地」列が`property_address`にマッピングされる

### 2. 統合テスト

**対象**: `SpreadsheetSyncService`

**テストケース**:
1. AA13501の不通ステータスがスプレッドシートに同期される
2. AA13501の物件住所がスプレッドシートに同期される
3. スプレッドシートの「不通」列がデータベースに同期される
4. スプレッドシートの「物件所在地」列がデータベースに同期される

### 3. E2Eテスト

**対象**: 売主管理システム全体

**テストケース**:
1. 通話モードページで不通ステータスを設定 → スプレッドシートに同期される
2. 売主詳細ページで物件住所を設定 → スプレッドシートに同期される
3. スプレッドシートで不通ステータスを変更 → データベースに同期される
4. スプレッドシートで物件住所を変更 → データベースに同期される

## デプロイ計画

### 1. デプロイ手順

1. `column-mapping.json`を修正
2. `ColumnMapper.ts`を修正
3. 変更をコミット
4. Vercelにデプロイ
5. AA13501で動作確認

### 2. ロールバック計画

**問題が発生した場合**:
1. 前のコミットに戻す
2. Vercelに再デプロイ

### 3. モニタリング

**確認項目**:
1. スプレッドシート同期のエラーログ
2. AA13501の不通ステータスと物件住所の同期状況

## 正確性プロパティ

### Property 1: 不通ステータスの双方向同期

**プロパティ**: データベースの`unreachable_status`とスプレッドシートの「不通」列が一致する

**検証方法**:
```typescript
// データベース → スプレッドシート
const seller = await sellerService.getSeller('AA13501');
await spreadsheetSyncService.syncToSpreadsheet('AA13501');
const sheetRow = await sheetsClient.findRowBySellerId('AA13501');
assert(sheetRow['不通'] === seller.unreachableStatus);

// スプレッドシート → データベース
await sheetsClient.updateRow(rowIndex, { '不通': '不通' });
await spreadsheetSyncService.syncFromSpreadsheet('AA13501');
const updatedSeller = await sellerService.getSeller('AA13501');
assert(updatedSeller.unreachableStatus === '不通');
```

### Property 2: 物件住所の双方向同期

**プロパティ**: データベースの`property_address`とスプレッドシートの「物件所在地」列が一致する

**検証方法**:
```typescript
// データベース → スプレッドシート
const seller = await sellerService.getSeller('AA13501');
await spreadsheetSyncService.syncToSpreadsheet('AA13501');
const sheetRow = await sheetsClient.findRowBySellerId('AA13501');
assert(sheetRow['物件所在地'] === seller.property?.address);

// スプレッドシート → データベース
await sheetsClient.updateRow(rowIndex, { '物件所在地': '大分市中央町1-1-1' });
await spreadsheetSyncService.syncFromSpreadsheet('AA13501');
const updatedSeller = await sellerService.getSeller('AA13501');
assert(updatedSeller.property?.address === '大分市中央町1-1-1');
```

### Property 3: 後方互換性

**プロパティ**: `is_unreachable`が存在する場合でも正しく動作する

**検証方法**:
```typescript
// is_unreachable のみが存在する場合
const seller = { is_unreachable: true, unreachable_status: null };
const sheetRow = columnMapper.mapToSheet(seller);
assert(sheetRow['不通'] === 'はい');

// unreachable_status が存在する場合
const seller2 = { is_unreachable: true, unreachable_status: '不通' };
const sheetRow2 = columnMapper.mapToSheet(seller2);
assert(sheetRow2['不通'] === '不通');
```

## まとめ

### 変更ファイル

1. ✅ `backend/supabase/migrations/20260130_add_property_address_to_sellers.sql` - `property_address`カラムの追加
2. ✅ `backend/src/config/column-mapping.json` - カラムマッピング設定の修正
3. ✅ `backend/src/services/ColumnMapper.ts` - `mapToSheet()`メソッドの修正
4. ✅ `backend/force-sync-aa13501-from-sheet.ts` - 強制同期スクリプト
5. ✅ `backend/sync-aa13501-property-address.ts` - 物件住所同期スクリプト
6. ✅ `backend/clear-aa13501-cache.ts` - キャッシュクリアスクリプト
7. ✅ `.kiro/steering/seller-table-column-definition.md` - 売主テーブルカラム定義
8. ✅ `.kiro/steering/seller-spreadsheet-column-mapping.md` - カラムマッピング完全版

### 変更内容

1. ✅ `sellers`テーブルに`property_address`カラムを追加
2. ✅ `unreachable_status`の双方向マッピングを追加
3. ✅ `property_address`の逆方向マッピングを追加
4. ✅ `comments`の双方向マッピングを追加
5. ✅ 「不通」列で`unreachable_status`を優先的に使用
6. ✅ AA13501のデータを強制同期
7. ✅ ステアリングドキュメントを作成

### 期待される効果

1. ✅ AA13501の不通ステータスがスプレッドシートに同期される
2. ✅ AA13501の物件住所がスプレッドシートに同期される
3. ✅ AA13501のコメントがスプレッドシートに同期される
4. ✅ 双方向同期が正しく動作する
5. ✅ 後方互換性が保たれる

### 根本原因

1. **不通フィールド**: `column-mapping.json`で`is_unreachable`（boolean）にマッピングされていたが、実際には`unreachable_status`（string）を使用すべきだった
2. **物件住所**: `sellers`テーブルに`property_address`カラムが存在せず、データベースに「未入力」が保存されていた
3. **コメント**: `column-mapping.json`に`comments`のマッピングが完全に存在しなかった

---

**作成日**: 2026年1月30日  
**更新日**: 2026年1月30日  
**作成者**: Kiro AI  
**ステータス**: ✅ 完了
