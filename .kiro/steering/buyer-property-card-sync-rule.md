# 買主詳細ページの物件詳細カード同期ルール

## ⚠️ 重要：物件詳細カードの表示条件

買主詳細ページ（`BuyerDetailPage.tsx`）の左側に表示される「物件詳細カード」は、以下の条件で表示されます。

---

## 📋 表示の仕組み

### 1. データの取得元

**API**: `/api/buyers/${buyer_number}/properties`

**実装**: 
- `backend/src/routes/buyers.ts`の`GET /:id/properties`エンドポイント
- `backend/src/services/BuyerService.ts`の`getLinkedProperties`メソッド

**取得データ**: `property_listings`テーブルから買主に紐づいた物件を取得

### 2. 紐づけの条件

物件が買主に紐づくには、以下の条件を満たす必要があります：

#### 買主テーブル（`buyers`）
- `buyers.property_number`フィールドに物件番号が入っている
- 初回問い合わせ物件として記録されている
- カンマ区切りで複数の物件番号が入っている場合もある

**重要**: 現在は`buyers.property_number`のみから物件を取得します。`inquiry_history`テーブルは存在しません。

---

## 🚨 よくある問題

### 問題1: 物件詳細カードが表示されない

**症状**: 
- 買主詳細ページの左側に「紐づいた物件はありません」と表示される
- 問い合わせ履歴テーブルには物件が表示されている

**原因**:
1. `buyers`テーブルの`property_number`が空
2. APIエンドポイントがエラーを返している

**確認方法**:
```bash
# 買主に紐づいた物件を確認（APIエンドポイントを直接確認）
curl http://localhost:3001/api/buyers/<buyer_number>/properties

# データベースを直接確認
npx ts-node backend/check-buyer-properties.ts <buyer_number>
```

**解決方法**:
- `buyers.property_number`に物件番号を設定

---

### 問題2: 物件詳細カードの情報が古い

**症状**:
- 物件詳細カードに表示される情報が最新ではない
- 物件リストページでは最新情報が表示される

**原因**:
1. `property_listings`テーブルが同期されていない
2. キャッシュが古い

**解決方法**:
```bash
# 物件リストを手動同期
npx ts-node backend/sync-property-listings.ts

# 特定の物件を強制同期
npx ts-node backend/force-sync-property.ts <property_number>
```

---

### 問題3: 物件詳細カードに一部のフィールドが表示されない

**症状**:
- 物件番号や住所は表示されるが、価格や担当名などが表示されない

**原因**:
1. `property_listings`テーブルに該当フィールドのデータがない
2. `PropertyInfoCard`コンポーネントが該当フィールドを表示していない

**確認方法**:
```bash
# 物件データを確認
npx ts-node backend/check-property-data.ts <property_number>
```

---

## 📊 PropertyInfoCardの表示フィールド

`PropertyInfoCard`コンポーネント（`frontend/src/components/PropertyInfoCard.tsx`）は、以下のフィールドを表示します：

### 基本情報
- `property_number` - 物件番号
- `status` - ステータス（atbb成約済み/非公開）
- `distribution_date` - 配信日
- `address` - 所在地
- `display_address` - 住居表示

### 物件詳細
- `property_type` - 種別
- `sales_assignee` - 担当名
- `price` - 価格
- `listing_price` - 売出価格
- `monthly_loan_payment` - 月々ローン支払い
- `structure` - 構造
- `floor_plan` - 間取り
- `land_area` - 土地面積
- `building_area` - 建物面積

### その他
- `offer_status` - 買付有無
- `price_reduction_history` - 値下げ履歴
- `sale_reason` - 理由
- `suumo_url` - Suumo URL
- `google_map_url` - Google Map URL
- `confirmation_status` - 確済

### 買主固有情報
- `buyer.pre_viewing_notes` - 内覧前伝達事項（買主テーブルから取得）
- `buyer.viewing_notes` - 内覧メモ（買主テーブルから取得）

---

## 🔧 トラブルシューティング

### ステップ1: 買主に紐づいた物件を確認

```bash
# APIエンドポイントを直接確認
curl http://localhost:3001/api/buyers/<buyer_number>/properties
```

**期待される結果**:
```json
[
  {
    "id": "uuid",
    "property_number": "AA13501",
    "address": "大分市中央町1-1-1",
    "property_type": "戸建て",
    "sales_price": 12000000,
    ...
  }
]
```

**空配列が返る場合**: 買主に紐づいた物件がない → ステップ2へ

---

### ステップ2: データベースを直接確認

#### 2-2. buyers.property_numberを確認

```sql
-- Supabase SQL Editorで実行
SELECT buyer_id, buyer_number, property_number 
FROM buyers 
WHERE buyer_number = '<buyer_number>';
```

**期待される結果**: `property_number`に物件番号が入っている

**空の場合**: 物件が紐づいていない → ステップ3へ

---

### ステップ3: 物件を紐づける

#### buyers.property_numberに追加

```sql
-- Supabase SQL Editorで実行
UPDATE buyers
SET property_number = '<property_number>'
WHERE buyer_number = '<buyer_number>';
```

**複数の物件を紐づける場合**:
```sql
-- カンマ区切りで複数の物件番号を設定
UPDATE buyers
SET property_number = 'AA13501,AA13502,AA13503'
WHERE buyer_number = '<buyer_number>';
```

---

### ステップ4: フロントエンドで確認

1. ブラウザで買主詳細ページを開く
2. 開発者ツールのNetworkタブを開く
3. `/api/buyers/<buyer_number>/properties`のレスポンスを確認
4. 物件詳細カードが表示されることを確認

---

## 📝 関連ファイル

| ファイル | 役割 |
|---------|------|
| `frontend/src/pages/BuyerDetailPage.tsx` | 買主詳細ページ（物件詳細カードを表示） |
| `frontend/src/components/PropertyInfoCard.tsx` | 物件詳細カードコンポーネント |
| `backend/src/routes/buyers.ts` | 買主APIエンドポイント（`GET /:id/properties`） |
| `backend/src/services/BuyerService.ts` | 買主サービス（`getLinkedProperties`メソッド） |

---

## 🔍 実装の詳細

### BuyerService.getLinkedProperties メソッド

このメソッドは`buyers.property_number`から物件番号を取得します：

```typescript
async getLinkedProperties(buyerId: string): Promise<any[]> {
  const propertyNumbersSet = new Set<string>();

  // buyers.property_number から物件番号を取得
  const buyer = await this.getById(buyerId);
  if (!buyer) {
    return [];
  }

  if (buyer.property_number) {
    const propertyNumbers = buyer.property_number
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n);
    propertyNumbers.forEach(pn => propertyNumbersSet.add(pn));
  }

  // 物件番号が1つもない場合は空配列を返す
  if (propertyNumbersSet.size === 0) {
    return [];
  }

  // 物件番号で物件リストを検索
  const propertyNumbers = Array.from(propertyNumbersSet);
  const { data, error } = await this.supabase
    .from('property_listings')
    .select('*')
    .in('property_number', propertyNumbers);

  if (error) {
    throw new Error(`Failed to fetch linked properties: ${error.message}`);
  }

  return data || [];
}
```

**重要なポイント**:
- `Set`を使用して物件番号の重複を自動的に排除
- カンマ区切りの複数物件番号に対応
- 物件番号が空の場合は空配列を返す

---

## まとめ

**物件詳細カードが表示されない場合のチェックリスト**:

- [ ] `/api/buyers/<buyer_number>/properties`が空配列を返していないか？
- [ ] `buyers`テーブルの`property_number`に物件番号が入っているか？
- [ ] `property_listings`テーブルに物件データが存在するか？
- [ ] `PropertyInfoCard`コンポーネントがエラーを出していないか？

**このルールを徹底することで、物件詳細カードの表示問題を効率的に解決できます。**

---

**最終更新日**: 2026年2月4日  
**作成理由**: 買主詳細ページで物件詳細カードが表示されない問題を効率的に解決するため  
**更新履歴**:
- 2026年2月4日: `inquiry_history`テーブルが存在しないため、`buyers.property_number`のみを使用するように修正
