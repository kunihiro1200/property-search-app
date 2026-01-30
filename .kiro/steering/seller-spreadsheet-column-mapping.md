# 売主スプレッドシートのカラムマッピング（完全版）

## ⚠️ 重要：このドキュメントが唯一の正解

スプレッドシートとデータベースのカラムマッピングは、このドキュメントに記載されている内容が**唯一の正解**です。

**絶対に推測しないでください。必ずこのドキュメントを参照してください。**

---

## 🚨 最重要：売主番号はB列（A列ではない）

**絶対に間違えないでください**：

- ❌ **A列は空列です**（データなし）
- ✅ **B列が売主番号です**（`売主番号`カラム）

**スプレッドシートで売主番号を検索する際は、必ずB列を検索してください。**

**過去の間違い**：
- A列で売主番号を検索してしまい、見つからなかった
- この間違いを2回繰り返した

**正しい検索方法**：
```typescript
// ✅ 正しい（B列を検索）
const rows = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: '売主リスト!B:B', // B列を検索
});

// ❌ 間違い（A列を検索）
const rows = await sheets.spreadsheets.values.get({
  spreadsheetId: SPREADSHEET_ID,
  range: '売主リスト!A:A', // A列は空列
});
```

---

## 📋 完全なカラムマッピング表

### スプレッドシート → データベース（spreadsheetToDatabase）

| 列 | スプレッドシートカラム名 | データベースカラム名 | 型 | 説明 |
|----|---------------------|-------------------|-----|------|
| A | （空列） | - | - | 空列 |
| B | `売主番号` | `seller_number` | TEXT | 売主の一意識別子 |
| C | `名前(漢字のみ）` | `name` | TEXT | 売主名 |
| D | `依頼者住所(物件所在と異なる場合）` | `address` | TEXT | 売主住所 |
| E | `電話番号\nハイフン不要` | `phone_number` | TEXT | 電話番号 |
| F | `メールアドレス` | `email` | TEXT | メールアドレス |
| - | `サイト` | `inquiry_site` | TEXT | 問い合わせサイト |
| - | `種別` | `property_type` | TEXT | 物件種別 |
| **R** | **`物件所在地`** | **`property_address`** | **TEXT** | **物件の住所**（ブラウザでは「物件住所」と表示） |
| - | `土（㎡）` | `land_area` | NUMBER | 土地面積 |
| - | `建（㎡）` | `building_area` | NUMBER | 建物面積 |
| - | `築年` | `build_year` | NUMBER | 築年数 |
| - | `構造` | `structure` | TEXT | 建物構造 |
| - | `間取り` | `floor_plan` | TEXT | 間取り |
| - | `状況（売主）` | `current_status` | TEXT | 売主の状況 |
| - | `反響年` | `inquiry_year` | TEXT | 反響年 |
| - | `反響日付` | `inquiry_date` | DATE | 反響日付 |
| - | `反響詳細日時` | `inquiry_detailed_datetime` | DATETIME | 反響詳細日時 |
| - | `査定額1（自動計算）v` | `valuation_amount_1` | NUMBER | 査定額1 |
| - | `査定額2（自動計算）v` | `valuation_amount_2` | NUMBER | 査定額2 |
| - | `査定額3（自動計算）v` | `valuation_amount_3` | NUMBER | 査定額3 |
| - | `査定額1` | `manual_valuation_amount_1` | NUMBER | 手動査定額1 |
| - | `査定額2` | `manual_valuation_amount_2` | NUMBER | 手動査定額2 |
| - | `査定額3` | `manual_valuation_amount_3` | NUMBER | 手動査定額3 |
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
| - | **`不通`** | **`unreachable_status`** | **TEXT** | **不通ステータス**（文字列） |
| - | `確度` | `confidence_level` | TEXT | 確度 |
| - | `次電日` | `next_call_date` | DATE | 次回電話日 |
| - | `契約年月 他決は分かった時点` | `contract_year_month` | DATE | 契約年月 |
| - | `競合名` | `competitor_name` | TEXT | 競合名 |
| - | `競合名、理由\n（他決、専任）` | `competitor_name_and_reason` | TEXT | 競合名と理由 |
| - | `専任・他決要因` | `exclusive_other_decision_factor` | TEXT | 専任・他決要因 |
| - | `作成日時` | `created_at` | DATETIME | 作成日時 |
| - | `更新日時` | `updated_at` | DATETIME | 更新日時 |
| - | `訪問メモ` | `visit_notes` | TEXT | 訪問メモ |

---

## 📊 データベース → スプレッドシート（databaseToSpreadsheet）

| データベースカラム名 | スプレッドシートカラム名 | 説明 |
|-------------------|---------------------|------|
| `seller_number` | `売主番号` | 売主の一意識別子 |
| `name` | `名前(漢字のみ）` | 売主名 |
| `address` | `依頼者住所(物件所在と異なる場合）` | 売主住所 |
| `phone_number` | `電話番号\nハイフン不要` | 電話番号 |
| `email` | `メールアドレス` | メールアドレス |
| `inquiry_site` | `サイト` | 問い合わせサイト |
| `property_type` | `種別` | 物件種別 |
| **`property_address`** | **`物件所在地`**（R列） | **物件の住所** |
| `inquiry_year` | `反響年` | 反響年 |
| `inquiry_date` | `反響日付` | 反響日付 |
| `inquiry_detailed_datetime` | `反響詳細日時` | 反響詳細日時 |
| `valuation_amount_1` | `査定額1` | 査定額1 |
| `valuation_amount_2` | `査定額2` | 査定額2 |
| `valuation_amount_3` | `査定額3` | 査定額3 |
| `visit_acquisition_date` | `訪問取得日\n年/月/日` | 訪問取得日 |
| `visit_date` | `訪問日 \nY/M/D` | 訪問日 |
| `visit_time` | `訪問時間` | 訪問時間 |
| `visit_assignee` | `営担` | 営業担当 |
| `visit_valuation_acquirer` | `訪問査定取得者` | 訪問査定取得者 |
| `valuation_assignee` | `査定担当` | 査定担当 |
| `phone_contact_person` | `電話担当（任意）` | 電話担当 |
| `preferred_contact_time` | `連絡取りやすい日、時間帯` | 連絡取りやすい時間 |
| `contact_method` | `連絡方法` | 連絡方法 |
| `status` | `状況（当社）` | 当社の状況 |
| **`comments`** | **`コメント`** | **コメント** |
| `pinrich_status` | `Pinrich` | Pinrichステータス |
| `is_unreachable` | `不通` | 不通フラグ（boolean、後方互換性用） |
| **`unreachable_status`** | **`不通`** | **不通ステータス**（文字列、優先） |
| `confidence_level` | `確度` | 確度 |
| `next_call_date` | `次電日` | 次回電話日 |
| `contract_year_month` | `契約年月 他決は分かった時点` | 契約年月 |
| `competitor_name` | `競合名` | 競合名 |
| `competitor_name_and_reason` | `競合名、理由\n（他決、専任）` | 競合名と理由 |
| `exclusive_other_decision_factor` | `専任・他決要因` | 専任・他決要因 |
| `created_at` | `作成日時` | 作成日時 |
| `updated_at` | `更新日時` | 更新日時 |
| `visit_notes` | `訪問メモ` | 訪問メモ |

---

## 🚨 重要な注意事項

### 1. 不通フィールドの特殊な扱い

スプレッドシートの「不通」列は、**2つのデータベースカラム**にマッピングされます：

- `unreachable_status`（文字列） ← **優先**
- `is_unreachable`（boolean） ← 後方互換性用

**データベース → スプレッドシート**の同期時：
- `unreachable_status`が存在する場合は、それを優先
- `unreachable_status`が存在しない場合は、`is_unreachable`を使用

### 2. 物件所在地（R列）

- **スプレッドシート**: R列「物件所在地」
- **データベース**: `property_address`カラム
- **ブラウザ表示**: 「物件住所」

### 3. コメント

- **スプレッドシート**: 「コメント」列
- **データベース**: `comments`カラム
- **ブラウザ表示**: 「コメント」

### 4. 査定額の特殊な扱い（最重要）

スプレッドシートには**2種類の査定額**が存在します：

- **「査定額1」「査定額2」「査定額3」**（列80-82） ← **手動入力の査定額**（**最優先**）
- **「査定額1（自動計算）v」「査定額2（自動計算）v」「査定額3（自動計算）v」**（列55-57） ← **自動計算された査定額**（フォールバック）

#### 🚨 最重要：査定額の優先順位ルール（種別に関係なく適用）

**絶対に守るべきルール**：

1. **手動入力の査定額（列80-82）が存在する場合、それを最優先で使用する**
2. **手動入力の査定額が空の場合のみ、自動計算の査定額（列55-57）を使用する**
3. **🚨 種別（土地/戸建て/マンション）に関係なく、この優先順位を適用する** ← **最重要**

**優先順位**（全ての種別で共通）：
```
手動入力査定額（列80-82） > 自動計算査定額（列55-57）
```

**重要**: 
- ✅ **土地（種別=土）**: 手動入力査定額を優先
- ✅ **戸建て（種別=戸）**: 手動入力査定額を優先
- ✅ **マンション（種別=マ）**: 手動入力査定額を優先
- ❌ **種別によって優先順位を変えてはいけない**

#### データベースカラム

| データベースカラム名 | 対応するスプレッドシートカラム | 列位置 | 説明 |
|-------------------|---------------------------|--------|------|
| `valuation_amount_1` | **優先**: `査定額1`（手動入力）<br>**フォールバック**: `査定額1（自動計算）v` | 列80（手動）<br>列55（自動） | 査定額1（万円単位 → 円単位に自動変換） |
| `valuation_amount_2` | **優先**: `査定額2`（手動入力）<br>**フォールバック**: `査定額2（自動計算）v` | 列81（手動）<br>列56（自動） | 査定額2（万円単位 → 円単位に自動変換） |
| `valuation_amount_3` | **優先**: `査定額3`（手動入力）<br>**フォールバック**: `査定額3（自動計算）v` | 列82（手動）<br>列57（自動） | 査定額3（万円単位 → 円単位に自動変換） |

**同期ロジック**:
```typescript
// 手動入力査定額を優先
const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];
```

#### 単位変換

スプレッドシートの査定額は**万円単位**で表示されていますが、データベースには**円単位**で保存されます。

**例**（手動入力査定額）:
- スプレッドシート: `1200`（万円） → データベース: `12000000`（円）
- スプレッドシート: `1300`（万円） → データベース: `13000000`（円）
- スプレッドシート: `1500`（万円） → データベース: `15000000`（円）

**例**（自動計算査定額、手動入力が空の場合のみ使用）:
- スプレッドシート: `5580`（万円） → データベース: `55800000`（円）
- スプレッドシート: `5930`（万円） → データベース: `59300000`（円）
- スプレッドシート: `6280`（万円） → データベース: `62800000`（円）

**変換ロジック**: 同期サービスが自動的に10,000を掛けて円単位に変換します。

#### 🚨 過去の問題：AA13507の査定額同期失敗

**問題**: AA13507の査定額がスプレッドシートからデータベースに同期されなかった

**根本原因**: `backend/src/config/column-mapping.json`に**間違ったマッピング**が定義されていた

**間違っていたマッピング**:

1. **`databaseToSpreadsheet`セクション**（データベース → スプレッドシート）:
   ```json
   {
     "valuation_amount_1": "査定額1",  // ❌ 間違い
     "valuation_amount_2": "査定額2",  // ❌ 間違い
     "valuation_amount_3": "査定額3"   // ❌ 間違い
   }
   ```
   - **問題**: 「査定額1」は**手動入力用**のカラムで、現在未使用
   - **正解**: 「査定額1（自動計算）v」を使用すべき

2. **`spreadsheetToDatabase`セクション**（スプレッドシート → データベース）:
   ```json
   {
     "査定額1": "manual_valuation_amount_1",  // ❌ 存在しないカラム
     "査定額2": "manual_valuation_amount_2",  // ❌ 存在しないカラム
     "査定額3": "manual_valuation_amount_3"   // ❌ 存在しないカラム
   }
   ```
   - **問題**: `manual_valuation_amount_1/2/3`カラムは**データベースに存在しない**
   - **正解**: `valuation_amount_1/2/3`カラムのみが存在

**修正内容**:

1. **`databaseToSpreadsheet`を修正**:
   ```json
   {
     "valuation_amount_1": "査定額1（自動計算）v",  // ✅ 正しい
     "valuation_amount_2": "査定額2（自動計算）v",  // ✅ 正しい
     "valuation_amount_3": "査定額3（自動計算）v"   // ✅ 正しい
   }
   ```

2. **`spreadsheetToDatabase`から存在しないカラムを削除**:
   ```json
   {
     "査定額1（自動計算）v": "valuation_amount_1",  // ✅ 正しい
     "査定額2（自動計算）v": "valuation_amount_2",  // ✅ 正しい
     "査定額3（自動計算）v": "valuation_amount_3"   // ✅ 正しい
     // "査定額1": "manual_valuation_amount_1" を削除
   }
   ```

3. **`typeConversions`から存在しないカラムを削除**:
   ```json
   {
     "valuation_amount_1": "number",  // ✅ 正しい
     "valuation_amount_2": "number",  // ✅ 正しい
     "valuation_amount_3": "number"   // ✅ 正しい
     // "manual_valuation_amount_1": "number" を削除
   }
   ```

**修正後の動作**:
- ✅ AA13507の査定額（5580万円、5930万円、6280万円）が正しく同期される
- ✅ データベースに円単位（55,800,000円、59,300,000円、62,800,000円）で保存される
- ✅ SellerServiceが正しく査定額を返す
- ✅ ブラウザで正しく表示される

---

#### 🚨 過去の問題：AA13508の査定額優先順位エラー

**問題**: AA13508（マンション）の査定額が、手動入力ではなく自動計算の値が表示される

**スプレッドシートのデータ**:
- **手動入力査定額**（列80-82）: 1200万円、1300万円、1500万円 ← **これが優先されるべき**
- 自動計算査定額（列55-57）: 90万円、290万円、590万円

**データベースの状態**（修正前）:
- 900,000円、2,900,000円、5,900,000円（自動計算の値）← **間違い**

**根本原因**: 同期ロジックが手動入力査定額を優先していなかった

**ユーザーの要求**: 
- 「手入力の査定額が優先なので今回は自動査定が表示されている」
- 「種別＝マでなくても手入力査定が優先ということを定義化してほしい」

**修正内容**:

1. **ステアリングドキュメントに優先順位ルールを明記**:
   - 手動入力査定額（列80-82）が最優先
   - 手動入力が空の場合のみ、自動計算査定額（列55-57）を使用
   - **🚨 種別（土地/戸建て/マンション）に関係なく、この優先順位を適用** ← **最重要**

2. **実装コードのコメントを更新**:
   ```typescript
   // 査定額を取得（手入力優先、なければ自動計算）
   // 🚨 重要: 種別（土地/戸建て/マンション）に関係なく、手動入力査定額を最優先で使用
   const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
   const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
   const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];
   ```

3. **優先順位ロジックの確認**:
   - `EnhancedAutoSyncService.ts`の2箇所（`syncSingleSeller`と`updateSingleSeller`）で同じロジックを使用
   - 手動入力査定額が存在する場合は、それを使用
   - 手動入力査定額が空の場合のみ、自動計算査定額を使用

**修正後の動作**:
- ✅ AA13508の手動入力査定額（1200万円、1300万円、1500万円）が優先される
- ✅ データベースに円単位（12,000,000円、13,000,000円、15,000,000円）で保存される
- ✅ ブラウザで正しく表示される
- ✅ **種別がマンション（マ）でも、手動入力査定額が優先される**

**教訓**: 
- ❌ **種別によって優先順位を変えてはいけない**
- ✅ **全ての種別（土地/戸建て/マンション）で、手動入力査定額を最優先で使用する**
- ✅ **ステアリングドキュメントと実装コードの両方に、この優先順位ルールを明記する**

#### 🛡️ 今後の予防策

**チェックリスト**（`column-mapping.json`を編集する前に必ず確認）:

1. **スプレッドシートのカラム名を確認**:
   - [ ] スプレッドシートを開いて、実際のカラム名を確認
   - [ ] 「査定額1（自動計算）v」と「査定額1」を混同していないか確認
   - [ ] このドキュメント（`seller-spreadsheet-column-mapping.md`）と一致しているか確認

2. **データベースのカラム名を確認**:
   - [ ] データベーススキーマを確認（`backend/supabase/migrations/`）
   - [ ] `manual_valuation_amount_1/2/3`のような存在しないカラムを使用していないか確認
   - [ ] このドキュメント（`seller-spreadsheet-column-mapping.md`）と一致しているか確認

3. **マッピングの整合性を確認**:
   - [ ] `spreadsheetToDatabase`と`databaseToSpreadsheet`が対応しているか確認
   - [ ] `typeConversions`に定義されているカラムが全て存在するか確認

4. **テストを実行**:
   - [ ] 特定の売主（例: AA13507）で同期をテスト
   - [ ] データベースに正しく保存されているか確認
   - [ ] SellerServiceが正しく値を返すか確認
   - [ ] ブラウザで正しく表示されるか確認

5. **バックエンドサーバーを再起動**:
   - [ ] `column-mapping.json`を変更した後は、必ずバックエンドサーバーを再起動
   - [ ] キャッシュをクリアして、新しいマッピングを読み込む

**絶対に守るべきルール**:
- ❌ **推測でカラム名を書かない**
- ❌ **存在しないカラムをマッピングに追加しない**
- ✅ **必ずこのドキュメントを参照する**
- ✅ **スプレッドシートとデータベースの両方を確認する**
- ✅ **変更後は必ずテストする**

---

## 📝 使用例

### 例1: スプレッドシートのカラム名からデータベースカラム名を取得

```typescript
// ✅ 正しい
const spreadsheetColumn = '物件所在地';
const dbColumn = 'property_address'; // このドキュメントを参照

// ❌ 間違い（推測）
const dbColumn = 'property_location'; // 存在しない
```

### 例2: データベースカラム名からスプレッドシートカラム名を取得

```typescript
// ✅ 正しい
const dbColumn = 'property_address';
const spreadsheetColumn = '物件所在地'; // このドキュメントを参照

// ❌ 間違い（推測）
const spreadsheetColumn = '物件住所'; // 存在しない
```

---

## 🔍 トラブルシューティング

### 問題1: スプレッドシートのデータがデータベースに同期されない

**確認事項**:
1. このドキュメントでマッピングを確認
2. `column-mapping.json`に定義されているか確認
3. データベースにカラムが存在するか確認（マイグレーションが実行されているか）

**特に査定額の場合**:
- [ ] `column-mapping.json`で「査定額1（自動計算）v」を使用しているか？
- [ ] 「査定額1」（手動入力用）を使用していないか？
- [ ] `manual_valuation_amount_1/2/3`のような存在しないカラムを使用していないか？

### 問題2: データベースのデータがスプレッドシートに同期されない

**確認事項**:
1. このドキュメントでマッピングを確認
2. `column-mapping.json`の`databaseToSpreadsheet`セクションに定義されているか確認
3. スプレッドシートにカラムが存在するか確認

**特に査定額の場合**:
- [ ] `databaseToSpreadsheet`で「査定額1（自動計算）v」にマッピングしているか？
- [ ] 「査定額1」（手動入力用）にマッピングしていないか？

### 問題3: 査定額が同期されない（AA13507の事例）

**症状**: 
- スプレッドシートに査定額が入力されている
- データベースの`valuation_amount_1/2/3`が`null`のまま
- ブラウザで査定額が表示されない

**原因**: `column-mapping.json`に間違ったマッピングが定義されている

**解決手順**:

1. **`column-mapping.json`を確認**:
   ```bash
   # ファイルを開く
   code backend/src/config/column-mapping.json
   ```

2. **`spreadsheetToDatabase`セクションを確認**:
   ```json
   {
     "査定額1（自動計算）v": "valuation_amount_1",  // ✅ これが正しい
     "査定額2（自動計算）v": "valuation_amount_2",
     "査定額3（自動計算）v": "valuation_amount_3"
   }
   ```
   
   **間違った例**:
   ```json
   {
     "査定額1": "manual_valuation_amount_1",  // ❌ 存在しないカラム
     "査定額1": "valuation_amount_1"          // ❌ 手動入力用カラム
   }
   ```

3. **`databaseToSpreadsheet`セクションを確認**:
   ```json
   {
     "valuation_amount_1": "査定額1（自動計算）v",  // ✅ これが正しい
     "valuation_amount_2": "査定額2（自動計算）v",
     "valuation_amount_3": "査定額3（自動計算）v"
   }
   ```
   
   **間違った例**:
   ```json
   {
     "valuation_amount_1": "査定額1"  // ❌ 手動入力用カラム
   }
   ```

4. **`typeConversions`セクションを確認**:
   ```json
   {
     "valuation_amount_1": "number",  // ✅ これが正しい
     "valuation_amount_2": "number",
     "valuation_amount_3": "number"
   }
   ```
   
   **間違った例**:
   ```json
   {
     "manual_valuation_amount_1": "number"  // ❌ 存在しないカラム
   }
   ```

5. **修正後、バックエンドサーバーを再起動**:
   ```bash
   # サーバーを停止（Ctrl+C）
   # サーバーを再起動
   npm run dev
   ```

6. **手動で同期を実行**:
   ```bash
   # 特定の売主を強制同期
   npx ts-node backend/force-sync-aa13507-valuation-amounts.ts
   ```

7. **確認**:
   ```bash
   # データベースを確認
   npx ts-node backend/check-aa13507-valuation-amounts.ts
   
   # SellerServiceを確認
   npx ts-node backend/test-aa13507-seller-service-valuation.ts
   ```

8. **ブラウザで確認**:
   - 売主詳細ページまたは通話モードページを開く
   - 査定額が正しく表示されることを確認

---

## 📚 関連ドキュメント

- `backend/src/config/column-mapping.json` - 実際のマッピング定義
- `.kiro/steering/seller-table-column-definition.md` - 売主テーブルのカラム定義

---

## まとめ

**絶対に守るべきルール**:

1. **スプレッドシートのカラム名を推測しない** ← このドキュメントを参照
2. **データベースのカラム名を推測しない** ← このドキュメントを参照
3. **R列「物件所在地」 = `property_address`カラム**
4. **「不通」列 = `unreachable_status`カラム（優先）**
5. **「コメント」列 = `comments`カラム**
6. **「査定額1（自動計算）v」 = `valuation_amount_1`カラム**（最重要）
7. **「査定額1」（手動入力用）は使用しない**
8. **`manual_valuation_amount_1/2/3`カラムは存在しない**

**査定額の特別ルール**（最重要）:
- ✅ **手動入力査定額（列80-82）を最優先で使用する**
- ✅ **手動入力が空の場合のみ、自動計算査定額（列55-57）を使用する**
- ✅ **種別に関係なく、この優先順位を適用する**
- ✅ **`valuation_amount_1/2/3`を使用する**（データベース）
- ❌ **`manual_valuation_amount_1/2/3`を使用しない**（存在しない）

**優先順位ロジック**:
```typescript
// ✅ 正しい
const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];
```

**`column-mapping.json`を編集する前に**:
1. このドキュメントを確認
2. スプレッドシートの実際のカラム名を確認
3. データベーススキーマを確認
4. 存在しないカラムを使用していないか確認
5. 変更後は必ずバックエンドサーバーを再起動
6. 変更後は必ずテストを実行

**このドキュメントが唯一の正解です。必ず参照してください。**

---

**最終更新日**: 2026年1月30日  
**作成理由**: スプレッドシートとデータベースのカラムマッピングを明確化し、推測による間違いを防ぐため  
**更新履歴**: 
- 2026年1月30日: 査定額同期問題（AA13507）の根本原因、解決策、予防策を追加
