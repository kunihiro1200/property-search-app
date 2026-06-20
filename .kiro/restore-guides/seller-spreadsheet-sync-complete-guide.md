# 売主スプレッドシート同期 - 完全復元ガイド

## 🚨 このドキュメントの目的

**査定額、物件住所、コメント、不通など、あらゆるフィールドが同期されない場合の完全な復元ガイド**

このドキュメントには、売主スプレッドシートとデータベース間の**全フィールドの同期ルール**が記載されています。

---

## 📋 問題の症状

以下のいずれかの症状が発生した場合、このガイドを使用してください：

### 基本情報が同期されない
- ✅ 売主番号、名前、住所、電話番号、メールアドレス

### 物件情報が同期されない
- ✅ 物件所在地（R列）、種別、土地面積、建物面積、築年、構造、間取り

### 査定情報が同期されない
- ✅ 査定額1、査定額2、査定額3（自動計算・手動）

### 訪問情報が同期されない
- ✅ 訪問取得日、訪問日、訪問時間、営担、訪問査定取得者、査定担当

### 連絡情報が同期されない
- ✅ 電話担当、連絡取りやすい時間、連絡方法

### ステータス情報が同期されない
- ✅ 状況（売主）、状況（当社）、不通、確度、次電日

### その他の情報が同期されない
- ✅ コメント、Pinrich、契約年月、競合名、専任・他決要因、訪問メモ

---

## 🔧 復元の基本原則

### 原則1: column-mapping.jsonが全ての真実

**ファイルパス**: `backend/src/config/column-mapping.json`

このファイルに定義されていないマッピングは**同期されません**。

### 原則2: 双方向マッピングが必要

**スプレッドシート → データベース**:
- `spreadsheetToDatabase`セクションに定義

**データベース → スプレッドシート**:
- `databaseToSpreadsheet`セクションに定義

**両方に定義されていないと、双方向同期は動作しません。**

### 原則3: データベースカラムが存在する必要がある

マッピングが定義されていても、データベースにカラムが存在しない場合は同期されません。

---

## 📊 完全なカラムマッピング表

### スプレッドシート → データベース（spreadsheetToDatabase）

| 列 | スプレッドシートカラム名 | データベースカラム名 | 型 | 説明 |
|----|---------------------|-------------------|-----|------|
| A | `売主番号` | `seller_number` | TEXT | 売主の一意識別子 |
| B | `名前(漢字のみ）` | `name` | TEXT | 売主名（必須） |
| C | `依頼者住所(物件所在と異なる場合）` | `address` | TEXT | 売主住所 |
| D | `電話番号\nハイフン不要` | `phone_number` | TEXT | 電話番号 |
| E | `メールアドレス` | `email` | TEXT | メールアドレス |
| - | `サイト` | `inquiry_site` | TEXT | 問い合わせサイト |
| - | `種別` | `property_type` | TEXT | 物件種別 |
| **R** | **`物件所在地`** | **`property_address`** | **TEXT** | **物件の住所** |
| - | `土（㎡）` | `land_area` | NUMBER | 土地面積 |
| - | `建（㎡）` | `building_area` | NUMBER | 建物面積 |
| - | `築年` | `build_year` | NUMBER | 築年数 |
| - | `構造` | `structure` | TEXT | 建物構造 |
| - | `間取り` | `floor_plan` | TEXT | 間取り |
| - | `状況（売主）` | `current_status` | TEXT | 売主の状況 |
| - | `反響年` | `inquiry_year` | TEXT | 反響年 |
| - | `反響日付` | `inquiry_date` | DATE | 反響日付 |
| - | `反響詳細日時` | `inquiry_detailed_datetime` | DATETIME | 反響詳細日時 |
| - | `査定額1（自動計算）v` | `valuation_amount_1` | NUMBER | 査定額1（自動） |
| - | `査定額2（自動計算）v` | `valuation_amount_2` | NUMBER | 査定額2（自動） |
| - | `査定額3（自動計算）v` | `valuation_amount_3` | NUMBER | 査定額3（自動） |
| - | `査定額1` | `manual_valuation_amount_1` | NUMBER | 査定額1（手動） |
| - | `査定額2` | `manual_valuation_amount_2` | NUMBER | 査定額2（手動） |
| - | `査定額3` | `manual_valuation_amount_3` | NUMBER | 査定額3（手動） |
| - | `訪問取得日\n年/月/日` | `visit_acquisition_date` | DATE | 訪問取得日 |
| - | `訪問日 \nY/M/D` | `visit_date` | DATE | 訪問日 |
| - | `訪問時間` | `visit_time` | TEXT | 訪問時間 |
| - | `営担` | `visit_assignee` | TEXT | 営業担当 |
| - | `訪問査定取得者` | `visit_valuation_acquirer` | TEXT | 訪問査定取得者 |
| - | `査定担当` | `valuation_assignee` | TEXT | 査定担当 |
| - | `電話担当（任意）` | `phone_contact_person` | TEXT | 電話担当 |
| - | `連絡取りやすい日、時間帯` | `preferred_contact_time` | TEXT | 連絡取りやすい時間 |
| - | `連絡方法` | `contact_method` | TEXT | 連絡方法 |
| - | `状況（当社）` | `status` | TEXT | 当社の状況 |
| - | **`コメント`** | **`comments`** | **TEXT** | **コメント** |
| - | `Pinrich` | `pinrich_status` | TEXT | Pinrichステータス |
| - | **`不通`** | **`unreachable_status`** | **TEXT** | **不通ステータス** |
| - | `確度` | `confidence_level` | TEXT | 確度 |
| - | `次電日` | `next_call_date` | DATE | 次回電話日 |
| - | `契約年月 他決は分かった時点` | `contract_year_month` | DATE | 契約年月 |
| - | `競合名` | `competitor_name` | TEXT | 競合名 |
| - | `競合名、理由\n（他決、専任）` | `competitor_name_and_reason` | TEXT | 競合名と理由 |
| - | `専任・他決要因` | `exclusive_other_decision_factor` | TEXT | 専任・他決要因 |
| - | `作成日時` | `created_at` | DATETIME | 作成日時 |
| - | `更新日時` | `updated_at` | DATETIME | 更新日時 |
| - | `訪問メモ` | `visit_notes` | TEXT | 訪問メモ |

### データベース → スプレッドシート（databaseToSpreadsheet）

| データベースカラム名 | スプレッドシートカラム名 | 型 | 説明 |
|-------------------|---------------------|-----|------|
| `seller_number` | `売主番号` | TEXT | 売主の一意識別子 |
| `name` | `名前(漢字のみ）` | TEXT | 売主名 |
| `address` | `依頼者住所(物件所在と異なる場合）` | TEXT | 売主住所 |
| `phone_number` | `電話番号\nハイフン不要` | TEXT | 電話番号 |
| `email` | `メールアドレス` | TEXT | メールアドレス |
| `inquiry_site` | `サイト` | TEXT | 問い合わせサイト |
| `property_type` | `種別` | TEXT | 物件種別 |
| **`property_address`** | **`物件所在地`** | **TEXT** | **物件の住所** |
| `inquiry_year` | `反響年` | TEXT | 反響年 |
| `inquiry_date` | `反響日付` | DATE | 反響日付 |
| `inquiry_detailed_datetime` | `反響詳細日時` | DATETIME | 反響詳細日時 |
| `valuation_amount_1` | `査定額1` | NUMBER | 査定額1 |
| `valuation_amount_2` | `査定額2` | NUMBER | 査定額2 |
| `valuation_amount_3` | `査定額3` | NUMBER | 査定額3 |
| `visit_acquisition_date` | `訪問取得日\n年/月/日` | DATE | 訪問取得日 |
| `visit_date` | `訪問日 \nY/M/D` | DATE | 訪問日 |
| `visit_time` | `訪問時間` | TEXT | 訪問時間 |
| `visit_assignee` | `営担` | TEXT | 営業担当 |
| `visit_valuation_acquirer` | `訪問査定取得者` | TEXT | 訪問査定取得者 |
| `valuation_assignee` | `査定担当` | TEXT | 査定担当 |
| `phone_contact_person` | `電話担当（任意）` | TEXT | 電話担当 |
| `preferred_contact_time` | `連絡取りやすい日、時間帯` | TEXT | 連絡取りやすい時間 |
| `contact_method` | `連絡方法` | TEXT | 連絡方法 |
| `status` | `状況（当社）` | TEXT | 当社の状況 |
| **`comments`** | **`コメント`** | **TEXT** | **コメント** |
| `pinrich_status` | `Pinrich` | TEXT | Pinrichステータス |
| `is_unreachable` | `不通` | BOOLEAN | 不通フラグ（後方互換性） |
| **`unreachable_status`** | **`不通`** | **TEXT** | **不通ステータス**（優先） |
| `confidence_level` | `確度` | TEXT | 確度 |
| `next_call_date` | `次電日` | DATE | 次回電話日 |
| `contract_year_month` | `契約年月 他決は分かった時点` | DATE | 契約年月 |
| `competitor_name` | `競合名` | TEXT | 競合名 |
| `competitor_name_and_reason` | `競合名、理由\n（他決、専任）` | TEXT | 競合名と理由 |
| `exclusive_other_decision_factor` | `専任・他決要因` | TEXT | 専任・他決要因 |
| `created_at` | `作成日時` | DATETIME | 作成日時 |
| `updated_at` | `更新日時` | DATETIME | 更新日時 |
| `visit_notes` | `訪問メモ` | TEXT | 訪問メモ |

---

## 🚨 特殊なマッピングルール

### 1. 不通フィールド（2つのカラムが同じ列にマッピング）

**スプレッドシート**: 「不通」列

**データベース**:
- `unreachable_status`（TEXT） ← **優先**
- `is_unreachable`（BOOLEAN） ← 後方互換性用

**ルール**:
- `unreachable_status`が存在する場合、それを優先
- `unreachable_status`が存在しない場合、`is_unreachable`を使用

**実装**: `ColumnMapper.mapToSheet()`で特殊処理

### 2. 査定額（自動計算 vs 手動）

**スプレッドシート**:
- `査定額1（自動計算）v` → `valuation_amount_1`
- `査定額1` → `manual_valuation_amount_1`

**注意**: 自動計算と手動は別のカラム

### 3. 型変換が必要なフィールド

**NUMBER型**:
- 査定額（全6種類）
- 土地面積、建物面積、築年

**DATE型**:
- 反響日付、訪問取得日、訪問日、次電日、契約年月

**DATETIME型**:
- 反響詳細日時、作成日時、更新日時

---

## 🔍 復元手順

### ステップ1: column-mapping.jsonを確認

```bash
# ファイルを開く
cat backend/src/config/column-mapping.json
```

**確認ポイント**:
1. `spreadsheetToDatabase`セクションに目的のフィールドが存在するか？
2. `databaseToSpreadsheet`セクションに目的のフィールドが存在するか？
3. スプレッドシートのカラム名が**完全に一致**しているか？（改行文字`\n`も含む）

### ステップ2: データベーススキーマを確認

```sql
-- 目的のカラムが存在するか確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name = '<カラム名>';
```

**カラムが存在しない場合**:
1. マイグレーションファイルを作成
2. マイグレーションを実行

### ステップ3: マッピングを追加（必要な場合）

**例: 新しいフィールド「メモ」を追加**

```json
// backend/src/config/column-mapping.json

// spreadsheetToDatabaseに追加
"メモ": "memo"

// databaseToSpreadsheetに追加
"memo": "メモ"

// 型変換が必要な場合はtypeConversionsに追加
"memo": "text"  // または "number", "date", "datetime"
```

### ステップ4: ColumnMapperを確認

**ファイルパス**: `backend/src/services/ColumnMapper.ts`

**確認ポイント**:
- `mapToSheet()`メソッドで特殊処理が必要か？
- `mapToDatabase()`メソッドで特殊処理が必要か？

### ステップ5: 強制同期を実行

```bash
# 特定の売主を強制同期
npx ts-node backend/force-sync-<売主番号>-from-sheet.ts

# または汎用スクリプト
npx ts-node backend/sync-seller-from-sheet.ts <売主番号>
```

### ステップ6: キャッシュをクリア

```bash
# キャッシュをクリア
npx ts-node backend/clear-<売主番号>-cache.ts

# または汎用スクリプト
npx ts-node backend/clear-seller-cache.ts <売主番号>
```

### ステップ7: 動作確認

1. ブラウザで売主詳細ページまたは通話モードページを開く
2. 目的のフィールドが表示されることを確認
3. スプレッドシートで値を変更
4. 同期が実行されることを確認
5. ブラウザで変更が反映されることを確認

---

## 🚨 よくある間違いと修正方法

### ❌ 間違い1: スプレッドシートのカラム名が完全一致していない

**症状**: マッピングが定義されているのに同期されない

**原因**: スプレッドシートのカラム名が微妙に違う

**例**:
```json
// ❌ 間違い
"電話番号": "phone_number"  // 改行文字が抜けている

// ✅ 正しい
"電話番号\nハイフン不要": "phone_number"  // 改行文字を含む
```

**修正方法**:
1. スプレッドシートのヘッダー行を確認
2. 改行文字、全角・半角、スペースなどを完全に一致させる

### ❌ 間違い2: 双方向マッピングの片方が欠けている

**症状**: スプレッドシート→データベースは同期されるが、逆方向が同期されない

**原因**: `databaseToSpreadsheet`セクションにマッピングが存在しない

**例**:
```json
// spreadsheetToDatabaseには存在
"コメント": "comments"

// ❌ databaseToSpreadsheetに存在しない
// → データベース→スプレッドシートの同期が動作しない

// ✅ 正しい（両方に定義）
"spreadsheetToDatabase": {
  "コメント": "comments"
},
"databaseToSpreadsheet": {
  "comments": "コメント"
}
```

### ❌ 間違い3: データベースカラムが存在しない

**症状**: マッピングが定義されているのに同期されない

**原因**: データベースにカラムが存在しない

**確認方法**:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name = 'property_address';
```

**修正方法**:
1. マイグレーションファイルを作成
2. マイグレーションを実行

**例**:
```sql
-- backend/supabase/migrations/20260130_add_property_address_to_sellers.sql
ALTER TABLE sellers ADD COLUMN property_address TEXT;
```

### ❌ 間違い4: 型変換が定義されていない

**症状**: 数値や日付が文字列として保存される

**原因**: `typeConversions`セクションに型変換が定義されていない

**例**:
```json
// ❌ 型変換が定義されていない
// → 査定額が文字列として保存される

// ✅ 正しい
"typeConversions": {
  "valuation_amount_1": "number",
  "valuation_amount_2": "number",
  "valuation_amount_3": "number"
}
```

### ❌ 間違い5: 間違ったカラム名にマッピングされている

**症状**: 不通フィールドが同期されない

**原因**: `is_unreachable`（boolean）にマッピングされているが、実際には`unreachable_status`（string）を使用すべき

**例**:
```json
// ❌ 間違い
"不通": "is_unreachable"  // boolean型

// ✅ 正しい
"不通": "unreachable_status"  // string型
```

---

## 📝 新しいフィールドを追加する手順

### ステップ1: データベースにカラムを追加

```sql
-- マイグレーションファイルを作成
-- backend/supabase/migrations/YYYYMMDD_add_<field_name>_to_sellers.sql

ALTER TABLE sellers ADD COLUMN <field_name> <data_type>;
```

### ステップ2: column-mapping.jsonに追加

```json
{
  "spreadsheetToDatabase": {
    "<スプレッドシートカラム名>": "<database_column_name>"
  },
  "databaseToSpreadsheet": {
    "<database_column_name>": "<スプレッドシートカラム名>"
  },
  "typeConversions": {
    "<database_column_name>": "<type>"  // "text", "number", "date", "datetime"
  }
}
```

### ステップ3: SellerServiceを更新（必要な場合）

**ファイルパス**: `backend/src/services/SellerService.supabase.ts`

```typescript
// decryptSeller()メソッドに追加
async decryptSeller(seller: any): Promise<Seller> {
  return {
    // ...
    <fieldName>: seller.<database_column_name> || null,
  };
}
```

### ステップ4: フロントエンドを更新（必要な場合）

**型定義**: `frontend/src/types/index.ts`

```typescript
export interface Seller {
  // ...
  <fieldName>?: string | number | Date | null;
}
```

**UI**: 該当するページコンポーネント

### ステップ5: テスト

1. マイグレーションを実行
2. 強制同期を実行
3. ブラウザで確認
4. スプレッドシートで値を変更
5. 同期が動作することを確認

---

## 🎯 次回の復元依頼の仕方

### パターン1: 症状を伝える（最も簡単）

```
査定額がスプレッドシートに同期されない。
復元ガイド「seller-spreadsheet-sync-complete-guide.md」を参照して修正して。
```

### パターン2: 具体的なフィールドを指定

```
「訪問取得日」フィールドが同期されない。
column-mapping.jsonを確認して修正して。
```

### パターン3: 全体的な確認を依頼

```
売主スプレッドシートの同期が全体的におかしい。
column-mapping.jsonとデータベーススキーマを確認して。
```

---

## 📚 関連ドキュメント

### ステアリングドキュメント
- `.kiro/steering/seller-table-column-definition.md` - 売主テーブルカラム定義
- `.kiro/steering/seller-spreadsheet-column-mapping.md` - カラムマッピング完全版

### 実装ファイル
- `backend/src/config/column-mapping.json` - カラムマッピング設定（**最重要**）
- `backend/src/services/ColumnMapper.ts` - マッピングロジック
- `backend/src/services/SellerService.supabase.ts` - 売主サービス（売主管理システム用）

### スペックファイル
- `.kiro/specs/aa13501-sync-fix/` - AA13501同期修正のスペック
  - `requirements.md` - 要件定義
  - `design.md` - 設計書
  - `tasks.md` - タスクリスト

---

## 🎓 重要なポイント

### 1. column-mapping.jsonが全ての真実

**絶対に推測しないでください。必ずこのファイルを参照してください。**

### 2. 双方向マッピングが必要

**スプレッドシート → データベース**と**データベース → スプレッドシート**の両方に定義が必要です。

### 3. スプレッドシートのカラム名は完全一致

改行文字（`\n`）、全角・半角、スペースなど、**完全に一致**させる必要があります。

### 4. データベースカラムが存在する必要がある

マッピングが定義されていても、データベースにカラムが存在しない場合は同期されません。

### 5. 型変換が必要なフィールドは定義する

数値、日付、日時型のフィールドは`typeConversions`セクションに定義が必要です。

---

## 🚨 重要：データベースとAPIレスポンスの不一致問題

### 問題の症状

**データベースには正しくデータが保存されているのに、フロントエンドに表示されない**

### 具体例：AA13500の不通フィールド問題（2026年1月30日）

**症状**:
- スプレッドシートの「不通」列に`不通`が入力されている ✅
- データベースの`unreachable_status`カラムに`不通`が保存されている ✅
- しかし、フロントエンドの通話モードページで「不通」ボタンが選択されていない ❌

**原因**:
- `SellerService.decryptSeller()`メソッドで、`unreachableStatus`フィールドが**返されていなかった**
- データベースにはあるが、APIレスポンスには含まれない
- フロントエンドはAPIレスポンスからデータを取得するため、表示できない

**データフロー**:
```
スプレッドシート → データベース → API → フロントエンド
     ✅              ✅           ❌        ❌
   (同期成功)    (保存成功)   (含まれない) (表示されない)
```

**問題箇所**: `backend/src/services/SellerService.supabase.ts`の`decryptSeller`メソッド

```typescript
// ❌ 修正前（unreachableStatusが欠けている）
private async decryptSeller(seller: any): Promise<Seller> {
  return {
    // ... 他のフィールド
    isUnreachable: seller.is_unreachable || false,
    unreachableSince: seller.unreachable_since ? new Date(seller.unreachable_since) : undefined,
    // unreachableStatus が欠けている！
    // ...
  };
}

// ✅ 修正後（unreachableStatusを追加）
private async decryptSeller(seller: any): Promise<Seller> {
  return {
    // ... 他のフィールド
    isUnreachable: seller.is_unreachable || false,
    unreachableStatus: seller.unreachable_status, // ← 追加
    unreachableSince: seller.unreachable_since ? new Date(seller.unreachable_since) : undefined,
    // ...
  };
}
```

### 同じパターンの過去の問題

**AA13500の査定方法フィールド問題（2026年1月30日）**:
- データベースの`valuation_method`カラムに`机上査定（不通）`が保存されている ✅
- しかし、フロントエンドに表示されない ❌
- 原因: `decryptSeller`メソッドで`valuationMethod`フィールドが返されていなかった

**修正**: `valuationMethod: seller.valuation_method,`を追加

### なぜこの問題が発生するのか？

**根本原因**: **新しいフィールドを追加する際の手順が不完全**

新しいフィールドを追加する際、以下の**5つのステップ**が必要ですが、**ステップ3を忘れがち**：

1. ✅ **データベースマイグレーション**を作成 → 実行される
2. ✅ **スプレッドシート同期**のマッピングを追加 → 実行される
3. ❌ **`decryptSeller`メソッド**にフィールドを追加 → **忘れがち**
4. ✅ **Seller型定義**にフィールドを追加 → 実行される
5. ✅ **フロントエンド**でフィールドを使用 → 実行される

**結果**: データベースには保存されるが、APIレスポンスに含まれない

### 今後の対策

#### 対策1: 新しいフィールド追加時のチェックリスト

新しいフィールドを追加する際は、以下を**必ず確認**：

- [ ] **ステップ1**: データベースマイグレーションを作成
- [ ] **ステップ2**: `column-mapping.json`にマッピングを追加
- [ ] **ステップ3**: **`decryptSeller`メソッドにフィールドを追加** ← **最重要**
- [ ] **ステップ4**: Seller型定義にフィールドを追加
- [ ] **ステップ5**: フロントエンドでフィールドを使用

#### 対策2: テストスクリプトで検証

新しいフィールドを追加したら、必ず以下をテスト：

```bash
# 1. データベースに保存されているか確認
npx ts-node backend/check-<field>-in-db.ts

# 2. APIレスポンスに含まれているか確認（最重要）
npx ts-node backend/test-<field>-api-response.ts

# 3. フロントエンドで表示されるか確認（ブラウザ）
```

**テストスクリプトの例**:

```typescript
// backend/test-<field>-api-response.ts
import { SellerService } from './src/services/SellerService.supabase';

async function testAPI() {
  const sellerService = new SellerService();
  const seller = await sellerService.getSeller('<seller-id>');
  
  console.log('🎯 Testing <field> field:');
  console.log('  <field>:', seller.<field>);
  
  if (seller.<field> === '<expected-value>') {
    console.log('  ✅ <field> is correct');
  } else {
    console.log('  ❌ <field> is incorrect:', seller.<field>);
  }
}

testAPI();
```

#### 対策3: `decryptSeller`メソッドの自動チェック（将来的）

将来的には、以下のような自動チェックを実装：

```typescript
// データベースのカラムとdecryptSellerの返り値を比較
// 欠けているフィールドを検出
async function validateDecryptSeller() {
  // 1. データベースのカラム一覧を取得
  const dbColumns = await getTableColumns('sellers');
  
  // 2. decryptSellerの返り値のフィールド一覧を取得
  const decryptedFields = Object.keys(await decryptSeller(sampleSeller));
  
  // 3. 差分を検出
  const missingFields = dbColumns.filter(col => !decryptedFields.includes(col));
  
  if (missingFields.length > 0) {
    console.warn('⚠️ Missing fields in decryptSeller:', missingFields);
  }
}
```

### 修正手順（この問題が発生した場合）

#### ステップ1: データベースを確認

```bash
# データベースに正しくデータが保存されているか確認
npx ts-node backend/check-<seller-number>-<field>.ts
```

**期待される結果**: データベースに正しい値が保存されている

#### ステップ2: APIレスポンスを確認

```bash
# APIレスポンスにフィールドが含まれているか確認
npx ts-node backend/test-<seller-number>-api-response.ts
```

**期待される結果**: APIレスポンスにフィールドが含まれている

**実際の結果**: APIレスポンスにフィールドが含まれていない ← **問題発見**

#### ステップ3: `decryptSeller`メソッドを確認

**ファイルパス**: `backend/src/services/SellerService.supabase.ts`

**確認箇所**: `decryptSeller`メソッド（約950行目付近）

```typescript
private async decryptSeller(seller: any): Promise<Seller> {
  return {
    // ... 他のフィールド
    
    // ← ここに目的のフィールドが含まれているか確認
    
    // ...
  };
}
```

#### ステップ4: フィールドを追加

```typescript
private async decryptSeller(seller: any): Promise<Seller> {
  return {
    // ... 他のフィールド
    <fieldName>: seller.<database_column_name>, // ← 追加
    // ...
  };
}
```

#### ステップ5: バックエンドサーバーを再起動

```bash
# プロセスを停止
# listProcesses → controlPwshProcess(action: "stop")

# プロセスを起動
# controlPwshProcess(action: "start", command: "npm run dev", cwd: "backend")
```

#### ステップ6: APIレスポンスを再確認

```bash
# APIレスポンスにフィールドが含まれているか再確認
npx ts-node backend/test-<seller-number>-api-response.ts
```

**期待される結果**: APIレスポンスにフィールドが含まれている ✅

#### ステップ7: フロントエンドで確認

1. ブラウザをシークレットモードでリロード
2. 該当ページに移動
3. フィールドが正しく表示されることを確認

### まとめ

**データベースには保存されているのにフロントエンドに表示されない場合**:

1. **原因**: `decryptSeller`メソッドでフィールドが返されていない
2. **対策**: 新しいフィールド追加時は必ず`decryptSeller`メソッドも更新する
3. **検証**: APIレスポンステストスクリプトで確認する

**このパターンを覚えておくことで、同じ問題を素早く解決できます。**

---

## 🔧 トラブルシューティングチェックリスト

フィールドが同期されない場合、以下を順番に確認してください：

### レベル1: スプレッドシート同期の確認

- [ ] `column-mapping.json`の`spreadsheetToDatabase`セクションに定義されているか？
- [ ] `column-mapping.json`の`databaseToSpreadsheet`セクションに定義されているか？
- [ ] スプレッドシートのカラム名が**完全に一致**しているか？（改行文字も含む）
- [ ] データベースにカラムが存在するか？
- [ ] 型変換が必要な場合、`typeConversions`セクションに定義されているか？
- [ ] `ColumnMapper.ts`で特殊処理が必要な場合、実装されているか？
- [ ] 強制同期を実行したか？

### レベル2: APIレスポンスの確認（最重要）

- [ ] **データベースに正しくデータが保存されているか？**
- [ ] **APIレスポンスにフィールドが含まれているか？** ← **最重要**
- [ ] **`decryptSeller`メソッドでフィールドが返されているか？** ← **最重要**
- [ ] バックエンドサーバーを再起動したか？

### レベル3: フロントエンドの確認

- [ ] Seller型定義にフィールドが含まれているか？
- [ ] フロントエンドでフィールドを使用しているか？
- [ ] ブラウザをシークレットモードでリロードしたか？
- [ ] キャッシュをクリアしたか？

---

**最終更新日**: 2026年1月30日  
**更新内容**: データベースとAPIレスポンスの不一致問題のセクションを追加（AA13500の不通フィールド問題を基に）  
**作成理由**: 売主スプレッドシート同期の全フィールドに対する包括的な復元ガイドを提供するため

