---
inclusion: manual
---

# 物件リストスプレッドシートのカラムマッピング（絶対に間違えないルール）

## ⚠️ 重要：正しいカラム名を使用する

物件リストスプレッドシート（`PROPERTY_LISTING_SPREADSHEET_ID`）のカラム名は、**スプレッドシートに表示されている通りの名前**を使用してください。

**絶対に推測しないでください。**

---

## ✅ 正しいカラム名一覧

### 基本情報

| データベースフィールド | スプレッドシートカラム名 | 列 | 説明 |
|---------------------|---------------------|-----|------|
| `property_number` | `物件番号` | B列 | 物件の一意識別子 |
| `property_type` | `種別` | C列 | 土地/戸建て/マンション |
| `atbb_status` | **`atbb成約済み/非公開`** | D列 | 公開ステータス（最重要） |
| `address` | `所在地` | F列 | 物件の住所 |
| `display_address` | `住居表示（ATBB登録住所）` | G列 | 住居表示 |

### 面積・価格

| データベースフィールド | スプレッドシートカラム名 | 列 | 説明 |
|---------------------|---------------------|-----|------|
| `land_area` | `土地面積` | H列 | 土地面積（㎡） |
| `building_area` | `建物面積` | I列 | 建物面積（㎡） |
| `sales_price` | `売買価格` | J列 | 売買価格（円） |
| `listing_price` | `売出価格` | e列 | 売出価格（円） |

### 売主・買主情報

| データベースフィールド | スプレッドシートカラム名 | 列 | 説明 |
|---------------------|---------------------|-----|------|
| `seller_name` | `名前(売主）` | O列 | 売主名 |
| `buyer_name` | `名前（買主）` | R列 | 買主名 |

### コメント・説明

| データベースフィールド | スプレッドシートカラム名 | 列 | 説明 |
|---------------------|---------------------|-----|------|
| **`property_about`** | **`●内覧前伝達事項`** | **BQ列** | **こちらの物件について（物件の説明文）** |

### その他

| データベースフィールド | スプレッドシートカラム名 | 列 | 説明 |
|---------------------|---------------------|-----|------|
| `status` | `状況` | X列 | 物件の状況 |
| `current_status` | `●現況` | }列 | 現況 |
| `delivery` | `引渡し` | ~列 | 引渡し条件 |
| `google_map_url` | `GoogleMap` | ¤列 | GoogleマップURL |

---

## 🚨 最重要：「こちらの物件について」のカラム

### ✅ 正しい取得元

**「こちらの物件について」（property_about）** は **物件リストスプレッドシートのBQ列（●内覧前伝達事項）** から取得します。

| フィールド | データベースカラム | スプレッドシート列 | ヘッダー名 | 説明 |
|-----------|------------------|------------------|-----------|------|
| **こちらの物件について** | `property_about` | **BQ列** | **●内覧前伝達事項** | 物件の説明文 |

### ❌ 間違った取得元

以下は**間違い**です：

- ❌ 個別物件スプレッドシートのathomeシートから取得 ← **間違い**
- ✅ 物件リストスプレッドシートのBQ列（●内覧前伝達事項）から取得 ← **正しい**

### ✅ 正しいコード

```typescript
// ✅ 正しい（物件リストスプレッドシートのBQ列から取得）
// BQ列のインデックスは68（0-indexed）
const propertyAbout = row[68] || row['●内覧前伝達事項'] || '';
```

---

## 🚨 最重要：atbb_statusのカラム名

### ✅ 唯一の正しいカラム名

**`atbb成約済み/非公開`** ← これが唯一の正しいカラム名

### ❌ 間違ったカラム名（存在しない）

以下のカラム名は**存在しません**：

- ❌ `atbb_status` ← 存在しない
- ❌ `ATBB_status` ← 存在しない
- ❌ `ステータス` ← 存在しない
- ❌ `atbb_statue` ← 存在しない（タイポ）

**これらのカラム名を使用してはいけません。**

### ✅ 正しいコード

```typescript
// ✅ 正しい（最優先で「atbb成約済み/非公開」を使用）
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
  row['atbb_status'] ||          // ← フォールバック（実際には存在しない）
  row['ATBB_status'] ||          // ← フォールバック（実際には存在しない）
  row['ステータス'] ||            // ← フォールバック（実際には存在しない）
  ''
);
```

---

## 🚨 重要：価格フィールドのマッピング

### 問題：`price` vs `sales_price`/`listing_price`

**データベーススキーマ**:
- `property_listings`テーブルには`sales_price`と`listing_price`が存在
- `price`カラムは存在しない（または使用されていない）

**フロントエンド**:
- `price`フィールドを期待している
- `price`が`undefined`または`0`の場合、「価格応談」と表示される

### ✅ 正しいマッピング

**バックエンドAPI**:
```typescript
// ❌ 間違い（priceカラムは存在しない）
.select('id, property_number, price, ...')

// ✅ 正しい（sales_priceまたはlisting_priceを使用）
.select('id, property_number, sales_price, listing_price, ...')
```

**フロントエンド**:
```typescript
// ✅ sales_priceを優先、なければlisting_priceを使用
const price = property.sales_price || property.listing_price || 0;
```

### 📊 実例：CC105の問題

**問題**: CC105が「価格応談」と表示される

**原因**: 
- データベースには`sales_price: 21800000`が保存されている
- APIは`price`フィールドを取得しようとしている
- `price`カラムが存在しないため、`undefined`になる
- フロントエンドで「価格応談」と表示される

**解決策**:
1. APIのSELECTクエリを修正して`sales_price`と`listing_price`を取得
2. フロントエンドで`sales_price`または`listing_price`を使用

---

## 🔍 カラム名の確認方法

### 方法1: ヘッダー確認スクリプトを実行

```bash
# 物件リストスプレッドシートのヘッダーを確認
npx ts-node backend/check-property-list-headers.ts
```

**出力例**:
```
📋 Headers:
  A列: （空）
  B列: 物件番号
  C列: 種別
  D列: atbb成約済み/非公開  ← これが正しいカラム名
  E列: 専任/一般
  F列: 所在地
  G列: 住居表示（ATBB登録住所）
  H列: 土地面積
  I列: 建物面積
  J列: 売買価格
  ...
```

### 方法2: Google Sheetsで直接確認

1. 物件リストスプレッドシートを開く
2. 1行目（ヘッダー行）を確認
3. **表示されている通りの名前**を使用

---

## ❌ よくある間違い

### 間違い1: カラム名を推測する

```typescript
// ❌ 間違い（推測）
const address = row['物件所在'];  // 存在しない
const address = row['住所'];      // 存在しない

// ✅ 正しい（スプレッドシートに表示されている通り）
const address = row['所在地'];
```

### 間違い2: 英語のカラム名を使用する

```typescript
// ❌ 間違い（英語）
const atbbStatus = row['atbb_status'];  // 存在しない

// ✅ 正しい（日本語）
const atbbStatus = row['atbb成約済み/非公開'];
```

### 間違い3: 似たような名前を使用する

```typescript
// ❌ 間違い（似ているが違う）
const sellerName = row['売主名'];      // 存在しない
const sellerName = row['名前（売主）']; // 存在しない

// ✅ 正しい（スプレッドシートに表示されている通り）
const sellerName = row['名前(売主）'];  // 注意: 全角括弧
```

---

## 📋 チェックリスト

カラムマッピングのコードを書く前に、以下を確認してください：

- [ ] スプレッドシートのヘッダー行を確認した
- [ ] **表示されている通りの名前**を使用している
- [ ] カラム名を推測していない
- [ ] 英語のカラム名を使用していない
- [ ] `atbb成約済み/非公開`を最優先にしている（atbb_statusの場合）
- [ ] 価格フィールドは`sales_price`または`listing_price`を使用している

---

## 🎯 実装例

### 正しいカラムマッピング

```typescript
// ✅ 正しい実装
export class PropertyListingSyncService {
  async runFullSync(): Promise<PropertyListingSyncResult> {
    const rows = await this.propertyListSheetsClient.readAll();
    
    for (const row of rows) {
      // ✅ 正しいカラム名を使用
      const propertyData = {
        property_number: row['物件番号'],
        property_type: row['種別'],
        atbb_status: String(
          row['atbb成約済み/非公開'] ||  // ← 最優先
          row['atbb_status'] ||
          ''
        ),
        address: row['所在地'],  // ← 「物件所在」ではない
        display_address: row['住居表示（ATBB登録住所）'],
        land_area: row['土地面積'],
        building_area: row['建物面積'],
        sales_price: row['売買価格'],
        listing_price: row['売出価格'],
        seller_name: row['名前(売主）'],  // ← 全角括弧
        buyer_name: row['名前（買主）'],  // ← 全角括弧
        status: row['状況'],
        current_status: row['●現況'],
        delivery: row['引渡し'],
        google_map_url: row['GoogleMap'],
        property_about: row['こちらの物件について'],  // ← BQ列から取得（最重要）
      };
      
      // データベースに保存
      // ...
    }
  }
}
```

---

## 💡 トラブルシューティング

### 問題1: データが同期されない

**確認事項**:
1. カラム名が正しいか？（スプレッドシートに表示されている通りか？）
2. ヘッダー確認スクリプトを実行したか？
3. 推測でカラム名を使用していないか？

**解決策**:
```bash
# ヘッダー確認
npx ts-node backend/check-property-list-headers.ts

# 正しいカラム名を使用
```

### 問題2: 価格が「価格応談」になる

**確認事項**:
1. `price`カラムを使用していないか？
2. `sales_price`または`listing_price`を使用しているか？
3. データベースに価格が保存されているか？

**解決策**:
```typescript
// ✅ 正しい
const price = property.sales_price || property.listing_price || 0;
```

### 問題3: atbb_statusが空文字列になる

**確認事項**:
1. `atbb成約済み/非公開`を最優先にしているか？
2. `atbb_status`などの存在しないカラム名を使用していないか？

**解決策**:
```typescript
// ✅ 正しい
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 最優先
  row['atbb_status'] ||
  ''
);
```

---

## まとめ

**絶対に守るべきルール**:

1. **スプレッドシートに表示されている通りの名前を使用する**
2. **カラム名を推測しない**
3. **`atbb成約済み/非公開`を最優先にする**（atbb_statusの場合）
4. **価格は`sales_price`または`listing_price`を使用する**（`price`ではない）
5. **ヘッダー確認スクリプトを実行して確認する**

**このルールを徹底することで、カラムマッピングの間違いを完全に防止できます。**

---

**最終更新日**: 2026年1月30日  
**作成理由**: CC105の価格問題とatbb_statusカラム名の間違いを防ぐため  
**更新履歴**:
- 2026年1月30日: 「こちらの物件について」（BQ列）の定義を追加

