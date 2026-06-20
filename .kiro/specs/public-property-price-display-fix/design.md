# 公開物件詳細ページ価格表示バグ修正 デザインドキュメント

## Overview

公開物件サイトの詳細ページ（`/public/properties/:id`）で価格が「価格応談」と表示されるバグを修正する。

一覧ページAPIは `sales_price || listing_price` を `price` フィールドとして計算してレスポンスに含めているが、詳細ページAPIは `select('*')` で取得したデータをそのまま返しており `price` フィールドの計算を行っていない。フロントエンドの `formatPrice` は `price` が `undefined` または `0` の場合に「価格応談」を返すため、詳細ページで価格が表示されない。

修正は `backend/api/index.ts` の詳細ページエンドポイント（`GET /api/public/properties/:propertyIdentifier`）のみに限定し、レスポンスを返す前に `price = sales_price || listing_price` を計算して付与する。

## Glossary

- **Bug_Condition (C)**: バグ条件 — 詳細ページAPIが `price` フィールドを計算せずにレスポンスを返す状態。`sales_price` または `listing_price` が存在するにもかかわらず `price` が `undefined` になる
- **Property (P)**: 期待される動作 — 詳細ページAPIが `sales_price || listing_price` を `price` フィールドとして計算し、フロントエンドで正しい価格が表示される
- **Preservation**: 変更してはいけない既存の動作 — 一覧ページの価格表示、価格なし物件の「価格応談」表示、価格以外の全フィールドの表示
- **detailEndpoint**: `backend/api/index.ts` 内の `GET /api/public/properties/:propertyIdentifier` エンドポイント。物件詳細データを返す
- **listEndpoint**: `backend/api/index.ts` 内の `GET /api/public/properties` エンドポイント。物件一覧データを返す
- **formatPrice**: `frontend/src/pages/PublicPropertyDetailPage.tsx` 内の関数。`price` が `undefined` または `0` の場合に「価格応談」を返す

## Bug Details

### Fault Condition

詳細ページAPIは `supabase.from('property_listings').select('*')` で全フィールドを取得するが、`property_listings` テーブルには `price` という計算済みフィールドが存在しない。一覧ページAPIは取得後に `price = sales_price || listing_price` を計算してレスポンスに付与しているが、詳細ページAPIはこの計算を行わずにそのままレスポンスを返している。

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type HTTPRequest to GET /api/public/properties/:propertyIdentifier
  OUTPUT: boolean

  property := fetchFromDatabase(request.propertyIdentifier)

  RETURN (property.sales_price IS NOT NULL OR property.listing_price IS NOT NULL)
         AND response.property.price IS UNDEFINED
END FUNCTION
```

### Examples

- CC19（`sales_price` あり）: 詳細ページで「価格応談」と表示される → 正しくは「〇〇万円」と表示されるべき
- `listing_price` のみ存在する物件: 詳細ページで「価格応談」と表示される → 正しくは `listing_price` の値が表示されるべき
- `sales_price` も `listing_price` も null の物件: 詳細ページで「価格応談」と表示される → これは正しい動作（変更不要）
- 一覧ページの同じ物件: 価格が正しく表示される → 詳細ページとの不整合

## Expected Behavior

### Preservation Requirements

**変更してはいけない動作:**
- 一覧ページ（`GET /api/public/properties`）の価格表示は引き続き正しく動作する
- `sales_price` も `listing_price` も存在しない物件の詳細ページは引き続き「価格応談」と表示する
- 詳細ページの価格以外の全フィールド（住所、物件タイプ、面積、画像など）は引き続き正しく表示する
- `backend/src/` および `vercel.json` は一切変更しない

**スコープ:**
バグ条件に該当しない全ての入力（一覧ページへのリクエスト、価格なし物件の詳細ページへのリクエスト）はこの修正の影響を受けない。

## Hypothesized Root Cause

1. **詳細ページAPIでの price 計算漏れ**: 一覧ページAPIには `price` 計算ロジックが後から追加されたが（コメントに `🔧 FIX:` と記載あり）、詳細ページAPIには同様の修正が適用されなかった
   - 一覧ページ: `sales_price || listing_price || 0` を計算して `price` に付与
   - 詳細ページ: `select('*')` の結果をそのまま返しており `price` フィールドが存在しない

2. **`property_listings` テーブルに `price` カラムが存在しない**: `price` は計算フィールドであり、DBには `sales_price` と `listing_price` として保存されている。`select('*')` では `price` は取得できない

## Correctness Properties

Property 1: Fault Condition - 詳細ページAPIがpriceフィールドを計算して返す

_For any_ リクエストにおいて `sales_price` または `listing_price` が存在する物件の詳細ページAPIを呼び出した場合（isBugCondition が true）、修正後の detailEndpoint は `price = sales_price || listing_price` を計算した値を含むレスポンスを返し、フロントエンドで正しい価格が表示される。

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - 一覧ページおよび価格なし物件の動作が変わらない

_For any_ リクエストにおいてバグ条件に該当しない入力（一覧ページへのリクエスト、`sales_price` も `listing_price` も存在しない物件の詳細ページへのリクエスト）に対して、修正後のコードは修正前と同じ結果を返し、既存の動作を保持する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `backend/api/index.ts`

**Function**: `GET /api/public/properties/:propertyIdentifier` エンドポイント（行 291 付近）

**Specific Changes**:

1. **レスポンス返却前に price を計算して付与**: `res.json()` を呼び出す直前に `sales_price || listing_price` を計算し、`property` オブジェクトに `price` フィールドを追加する

   ```typescript
   // 修正前
   res.json({ 
     success: true, 
     property: {
       ...property,
       images
     }
   });

   // 修正後
   const price = property.sales_price || property.listing_price || undefined;
   res.json({ 
     success: true, 
     property: {
       ...property,
       images,
       ...(price !== undefined ? { price } : {})
     }
   });
   ```

2. **sales_price も listing_price も存在しない場合は price を設定しない**: `undefined` のままにすることで、フロントエンドの `formatPrice` が「価格応談」を返す既存の動作を維持する

**変更しないもの:**
- 一覧ページエンドポイント（`GET /api/public/properties`）
- `backend/src/` 配下の全ファイル
- `vercel.json`

## Testing Strategy

### Validation Approach

2フェーズのアプローチ: まず未修正コードでバグを再現するテストを書き、次に修正後のコードで正しく動作することを確認する。

### Exploratory Fault Condition Checking

**Goal**: 未修正コードでバグを再現し、根本原因を確認する。

**Test Plan**: `GET /api/public/properties/:propertyIdentifier` エンドポイントを呼び出し、`sales_price` または `listing_price` が存在する物件のレスポンスに `price` フィールドが含まれないことを確認する。

**Test Cases**:
1. **CC19の詳細取得**: `sales_price` が存在する物件の詳細APIを呼び出し、レスポンスの `price` が `undefined` であることを確認（未修正コードで失敗する）
2. **listing_price のみ存在する物件**: `listing_price` のみ存在する物件の詳細APIを呼び出し、`price` が `undefined` であることを確認（未修正コードで失敗する）
3. **一覧APIとの比較**: 同じ物件を一覧APIと詳細APIで取得し、`price` フィールドの有無が異なることを確認

**Expected Counterexamples**:
- 詳細APIのレスポンスに `price` フィールドが存在しない
- 原因: `select('*')` の結果に `price` カラムが存在せず、計算も行われていない

### Fix Checking

**Goal**: 修正後、バグ条件に該当する全入力で正しい動作を確認する。

**Pseudocode:**
```
FOR ALL property WHERE isBugCondition(property) DO
  response := GET /api/public/properties/:property.id
  ASSERT response.property.price = property.sales_price OR property.listing_price
END FOR
```

### Preservation Checking

**Goal**: バグ条件に該当しない入力で、修正前後の動作が同じであることを確認する。

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT detailEndpoint_original(request) = detailEndpoint_fixed(request)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨。多様な物件データに対して自動的にテストケースを生成し、修正前後の動作が一致することを確認できる。

**Test Cases**:
1. **価格なし物件の保持**: `sales_price` も `listing_price` も null の物件で、修正後も `price` が設定されないことを確認
2. **一覧ページの保持**: 一覧APIのレスポンスが修正前後で変わらないことを確認
3. **価格以外フィールドの保持**: 詳細APIのレスポンスで `address`、`property_type`、`land_area` などが修正前後で同じであることを確認

### Unit Tests

- `sales_price` あり、`listing_price` あり → `price = sales_price`（sales_price 優先）
- `sales_price` なし、`listing_price` あり → `price = listing_price`
- `sales_price` あり、`listing_price` なし → `price = sales_price`
- `sales_price` なし、`listing_price` なし → `price` は設定されない

### Property-Based Tests

- ランダムな `sales_price`/`listing_price` の組み合わせに対して `price` の計算が正しいことを検証
- 一覧APIと詳細APIで同じ物件の `price` が一致することを検証
- 修正後も全フィールドが正しく返されることを検証

### Integration Tests

- 詳細ページ（`/public/properties/:id`）にアクセスし、価格が正しく表示されることを確認
- 一覧ページから詳細ページに遷移し、価格表示が一致することを確認
- 価格なし物件の詳細ページで「価格応談」が表示されることを確認
