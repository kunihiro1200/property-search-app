# 売主リストの近隣買主リスト機能ルール（絶対に守るべきルール）

## ⚠️ 最重要：売主リストは物件リストとは別のシステム

売主リストの近隣買主リスト機能では、**`property_listings`テーブルは一切使用しません**。

**絶対に守るべきルール**:
- ✅ **売主テーブル（`sellers`）のデータのみを使用する**
- ❌ **`property_listings`テーブルは使用しない**
- ❌ **`properties`テーブルは使用しない**

---

## 📋 データの取得元

### 売主リストの近隣買主リスト

**エンドポイント**: `/api/sellers/:id/nearby-buyers`

**データ取得元**: `sellers`テーブルのみ

| データ | 取得元 | カラム名 |
|--------|--------|---------|
| 物件住所 | `sellers` | `property_address` |
| 物件種別 | `sellers` | `property_type` |
| 査定額 | `sellers` | `valuation_amount_1`, `valuation_amount_2`, `valuation_amount_3` |
| Google Map URL | `sellers` | `google_map_url` |

**重要**: 
- `property_listings`テーブルは**一切参照しない**
- `properties`テーブルも**一切参照しない**
- 売主テーブルのデータのみで完結する

---

## 🔧 実装箇所

### 1. バックエンド（`backend/src/routes/sellers.ts`）

**エンドポイント**: `GET /api/sellers/:id/nearby-buyers`

**正しい実装**:
```typescript
// ✅ 正しい（sellersテーブルから直接取得）
const googleMapUrl = seller.googleMapUrl || null;
const propertyType = seller.propertyType || null;

// 売出価格を取得（査定額の中央値を使用）
let salesPrice: number | null = null;
const valuations = [
  seller.valuationAmount1,
  seller.valuationAmount2,
  seller.valuationAmount3
].filter(v => v !== null && v !== undefined) as number[];

if (valuations.length > 0) {
  // 中央値を計算
  valuations.sort((a, b) => a - b);
  const mid = Math.floor(valuations.length / 2);
  salesPrice = valuations.length % 2 === 0
    ? (valuations[mid - 1] + valuations[mid]) / 2
    : valuations[mid];
}
```

**間違った実装**:
```typescript
// ❌ 間違い（propertiesテーブルを参照している）
const { data: property } = await supabase
  .from('properties')
  .select('google_map_url, property_type, valuation_amount_1, valuation_amount_2, valuation_amount_3')
  .eq('seller_id', seller.id)
  .single();

const googleMapUrl = property?.google_map_url || null;
const propertyType = property?.property_type || null;
```

```typescript
// ❌ 間違い（property_listingsテーブルを参照している）
const { data: property } = await supabase
  .from('property_listings')
  .select('property_type, sales_price')
  .eq('property_number', seller.sellerNumber)
  .single();
```

---

## 🚨 種別フィルタリングのルール

### 物件種別の値

売主テーブルの`property_type`カラムには、以下の値が入ります：

| データベース値 | 日本語 |
|-------------|--------|
| `land` | 土地 |
| `detached_house` | 戸建 |
| `apartment` | マンション |
| `マンション` | マンション |
| `マ` | マンション |
| `戸建` | 戸建 |
| `戸建て` | 戸建 |
| `土地` | 土地 |

**重要**: 
- 英語値（`land`, `detached_house`, `apartment`）と日本語値（`マンション`, `戸建`, `土地`）の両方が存在する
- フィルタリング時は、両方を正しく処理する必要がある

### フィルタリングロジック

**実装箇所**: `backend/src/services/BuyerService.ts`の`matchesPropertyTypeCriteria`メソッド

**ロジック**:
1. 物件種別が英語値の場合、日本語に変換
2. 買主の希望種別と物件種別を正規化
3. 正規化後の値で比較

**例**:
- 物件種別: `apartment` → 日本語変換 → `マンション` → 正規化 → `マンション`
- 買主希望種別: `戸建、土地` → 分割 → `['戸建', '土地']` → 正規化 → `['戸建', '土地']`
- 比較: `マンション` vs `['戸建', '土地']` → **マッチしない** ✅

---

## 📝 テストケース

### テストケース1: マンション物件 vs 戸建・土地希望の買主

**物件**:
- 売主番号: AA13547
- 物件種別: `マンション`

**買主**:
- 買主番号: 6767
- 希望種別: `戸建、土地`

**期待される結果**: ❌ マッチしない（買主6767は表示されない）

**理由**: 買主の希望種別に「マンション」が含まれていないため

---

### テストケース2: マンション物件 vs マンション希望の買主

**物件**:
- 売主番号: AA13547
- 物件種別: `マンション`

**買主**:
- 買主番号: 1234
- 希望種別: `マンション`

**期待される結果**: ✅ マッチする（買主1234は表示される）

**理由**: 買主の希望種別に「マンション」が含まれているため

---

### テストケース3: 戸建物件 vs 戸建・土地希望の買主

**物件**:
- 売主番号: AA13548
- 物件種別: `戸建`

**買主**:
- 買主番号: 6767
- 希望種別: `戸建、土地`

**期待される結果**: ✅ マッチする（買主6767は表示される）

**理由**: 買主の希望種別に「戸建」が含まれているため

---

## 🔍 トラブルシューティング

### 問題1: 種別フィルタリングが機能しない

**症状**: 
- マンション物件の近隣買主リストに、戸建・土地希望の買主が表示される

**原因**:
1. 売主テーブルの`property_type`が空（null）
2. `property_listings`テーブルや`properties`テーブルから物件種別を取得しようとしている
3. 種別フィルタリングのロジックが間違っている

**解決方法**:
1. 売主テーブルの`property_type`を確認
   ```sql
   SELECT seller_number, property_type FROM sellers WHERE seller_number = 'AA13547';
   ```
2. エンドポイントが売主テーブルから直接取得しているか確認
   ```typescript
   const propertyType = seller.propertyType || null;
   ```
3. `matchesPropertyTypeCriteria`メソッドのデバッグログを確認

---

### 問題2: 物件種別が空（null）

**症状**:
- 売主テーブルの`property_type`が空
- 種別フィルタリングが行われない

**原因**:
- スプレッドシートから同期されていない
- 手動で入力されていない

**解決方法**:
1. スプレッドシートの「種別」列を確認
2. 自動同期を実行
3. 手動で更新
   ```sql
   UPDATE sellers SET property_type = 'マンション' WHERE seller_number = 'AA13547';
   ```

---

## まとめ

**絶対に守るべきルール**:

1. **売主リストの近隣買主リスト機能では、`sellers`テーブルのみを使用する**
2. **`property_listings`テーブルは一切使用しない**
3. **`properties`テーブルも一切使用しない**
4. **物件種別は売主テーブルの`property_type`から取得する**
5. **種別フィルタリングは、英語値と日本語値の両方を正しく処理する**

**このルールを徹底することで、売主リストと物件リストの混同を完全に防止できます。**

---

**最終更新日**: 2026年2月5日  
**作成理由**: 売主リストの近隣買主リスト機能で、物件リストのテーブルを参照してしまう問題を防ぐため

