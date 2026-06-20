# AA13674 物件非表示バグ修正 デザインドキュメント

## Overview

公開物件サイト（`https://property-site-frontend-kappa.vercel.app/public/properties`）において、`showPublicOnly=true` と他のフィルター条件（location、propertyType等）を同時指定すると、Supabase の PostgREST API が 400 エラーを返し、AA13674 を含む全物件が表示されなくなるバグを修正する。

根本原因は `backend/api/src/services/PropertyListingService.ts` の `getPublicProperties` メソッドにおいて、`priceRange` フィルターで `.or()` を連鎖させていることにある。Supabase の PostgREST は複数の `.or()` 呼び出しを連鎖させると、後続の `.or()` が前の条件を上書きするのではなく、クエリ文字列の競合を引き起こし 400 Bad Request を返す。

修正方針は `.or()` の連鎖を排除し、各フィルター条件を適切な Supabase メソッド（`.eq()`、`.ilike()`、`.filter()` 等）で直接適用することで、全条件を正しく AND 結合する。

## Glossary

- **Bug_Condition (C)**: バグが発生する条件 — `showPublicOnly=true` かつ他のフィルター条件（location、propertyType、priceRange のいずれか）が同時に指定されている状態
- **Property (P)**: 期待される正しい動作 — 全フィルター条件を AND 結合した有効なクエリが実行され、200 レスポンスと合致する物件一覧が返される
- **Preservation**: 修正によって変更してはならない既存の動作 — 単一フィルター条件での検索、フィルターなしの全件取得、地図ビューでの表示等
- **getPublicProperties**: `backend/api/src/services/PropertyListingService.ts` 内のメソッド。公開物件一覧を取得する。複数のフィルターオプションを受け取り Supabase クエリを構築する
- **PostgREST**: Supabase が内部で使用する REST API レイヤー。`.or()` の連鎖に対して予期しない動作をする既知の制約がある
- **atbb_status**: 物件の公開ステータスを示すカラム。「公開中」を含む値が `showPublicOnly` フィルターの対象

## Bug Details

### Bug Condition

`showPublicOnly=true` と `priceRange` フィルターが同時に指定された場合、クエリビルダーに `.or()` が複数回連鎖する。Supabase の PostgREST はこの連鎖を正しく処理できず、400 Bad Request を返す。

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type FilterParams
  OUTPUT: boolean

  // showPublicOnly=true かつ他のフィルター条件が存在する場合にバグが発生する
  // 特に priceRange との組み合わせで .or() が連鎖し 400 エラーになる
  RETURN X.showPublicOnly = true
    AND (X.location IS NOT NULL
         OR X.propertyType IS NOT NULL
         OR X.priceRange IS NOT NULL)
END FUNCTION
```

### Examples

- **例1（バグ発生）**: `showPublicOnly=true` + `location="大分市品域南"` + `propertyType="土地"` → 400 エラー、AA13674 が表示されない
- **例2（バグ発生）**: `showPublicOnly=true` + `priceRange={min: 1000}` → `.or()` が2回連鎖し 400 エラー
- **例3（バグ発生）**: `showPublicOnly=true` + `location="大分市"` → `.ilike()` と `.or()` の組み合わせで 400 エラー
- **例4（正常）**: `showPublicOnly=false` + `location="大分市"` → `.or()` は1回のみ、正常に動作
- **例5（正常）**: `showPublicOnly=true` のみ → `.or()` は1回のみ（priceRange なし）、正常に動作

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- フィルター条件を何も指定しない場合、全物件を正常に一覧表示する
- `propertyType` のみを指定した場合、指定した物件タイプの物件のみを正常に表示する
- `location` のみを指定した場合、指定したエリアに合致する物件のみを正常に表示する
- `showPublicOnly=true` のみを指定した場合、`atbb_status` に「公開中」を含む物件のみを正常に表示する
- `priceRange` のみを指定した場合、指定した価格帯に合致する物件のみを正常に表示する
- 地図ビュー（`withCoordinates=true`）で絞り込み条件を指定した場合、座標情報がある物件を地図上に正常に表示する
- `skipImages=true` の場合、画像取得をスキップして高速に物件一覧を返す

**Scope:**
バグ条件（`isBugCondition`）が成立しない全ての入力は、修正後も修正前と完全に同じ動作をする。具体的には：
- `showPublicOnly=false` の場合の全フィルター組み合わせ
- `showPublicOnly=true` かつ他のフィルター条件が全て未指定の場合
- `priceRange` を含まない単一フィルター条件

**Note:** バグ条件が成立する場合の期待される正しい動作は、後述の Correctness Properties セクション（Property 1）で定義する。

## Hypothesized Root Cause

コードを確認した結果、以下の問題が特定された：

1. **`.or()` の連鎖（主要原因）**: `priceRange.min` と `priceRange.max` のフィルターで `.or()` を使用している。`showPublicOnly=true` の場合、`showPublicOnly` フィルターの処理（`.not()` + `.ilike()`）の後に `priceRange` の `.or()` が連鎖する。Supabase PostgREST は複数の `.or()` 呼び出しを連鎖させると、クエリパラメータが競合して 400 エラーを返す。

   ```typescript
   // 問題のあるコード（現状）
   if (priceRange?.min !== undefined) {
     query = query.or(`sales_price.gte.${priceRange.min},listing_price.gte.${priceRange.min}`);
   }
   if (priceRange?.max !== undefined) {
     query = query.or(`sales_price.lte.${priceRange.max},listing_price.lte.${priceRange.max}`);
   }
   ```

2. **`showPublicOnly` フィルターとの競合**: `showPublicOnly=true` の場合、`.not()` と `.ilike()` を使用しているが、これ自体は問題ない。問題は `priceRange` の `.or()` が後から連鎖することで発生する。

3. **`location` フィルターとの組み合わせ**: `location` フィルターは `.ilike()` を使用しており、単体では問題ない。しかし `priceRange` の `.or()` と組み合わさると 400 エラーが発生する可能性がある。

## Correctness Properties

Property 1: Bug Condition - 複数フィルター条件の AND 結合

_For any_ フィルターパラメータ X において `isBugCondition(X)` が true を返す場合（`showPublicOnly=true` かつ他のフィルター条件が存在する場合）、修正後の `getPublicProperties` 関数は SHALL HTTP 200 を返し、全フィルター条件を AND 結合した結果として条件に合致する物件一覧（AA13674 を含む）を返す。400 エラーは発生しない。

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - 非バグ条件入力の動作保持

_For any_ フィルターパラメータ X において `isBugCondition(X)` が false を返す場合（`showPublicOnly=false` または他のフィルター条件が全て未指定の場合）、修正後の `getPublicProperties` 関数は SHALL 修正前の関数と完全に同じ結果を返し、既存の全フィルター動作（単一条件検索、全件取得、地図ビュー等）を保持する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

根本原因分析が正しいと仮定した場合の修正内容：

**File**: `backend/api/src/services/PropertyListingService.ts`

**Function**: `getPublicProperties`

**Specific Changes**:

1. **`priceRange.min` フィルターの修正**: `.or()` を使用せず、`sales_price` と `listing_price` の両方に対して適切な条件を適用する。PostgREST の `or` フィルターを単一の `.or()` 呼び出しにまとめるか、`.filter()` を使用する。

   ```typescript
   // 修正前（問題あり）
   if (priceRange?.min !== undefined) {
     query = query.or(`sales_price.gte.${priceRange.min},listing_price.gte.${priceRange.min}`);
   }

   // 修正後（案）
   if (priceRange?.min !== undefined) {
     query = query.or(`sales_price.gte.${priceRange.min},listing_price.gte.${priceRange.min}`);
     // ↑ この .or() は単体では問題ない。問題は連鎖。
     // priceRange.min と priceRange.max を1つの .or() にまとめる
   }
   ```

2. **`priceRange.min` と `priceRange.max` を単一の `.or()` にまとめる**: 2つの `.or()` 呼び出しを1つにまとめることで連鎖を排除する。

   ```typescript
   // 修正後（推奨）
   if (priceRange?.min !== undefined || priceRange?.max !== undefined) {
     const conditions: string[] = [];
     if (priceRange?.min !== undefined) {
       conditions.push(`sales_price.gte.${priceRange.min}`);
       conditions.push(`listing_price.gte.${priceRange.min}`);
     }
     if (priceRange?.max !== undefined) {
       conditions.push(`sales_price.lte.${priceRange.max}`);
       conditions.push(`listing_price.lte.${priceRange.max}`);
     }
     // .or() を1回だけ呼び出す
     if (conditions.length > 0) {
       query = query.or(conditions.join(','));
     }
   }
   ```

   **注意**: `min` と `max` を同時に指定した場合、上記の実装では OR 条件が混在する。正確には `(sales_price >= min OR listing_price >= min) AND (sales_price <= max OR listing_price <= max)` が必要。この場合は `.filter()` や `and()` を使用した別アプローチが必要になる可能性がある。探索的テストで実際の動作を確認してから最終的な実装を決定する。

3. **`showPublicOnly` フィルターの確認**: 現在の実装（`.not('atbb_status', 'is', null).ilike('atbb_status', '%公開中%')`）は `.or()` を使用していないため、単体では問題ない。ただし `priceRange` の `.or()` との組み合わせで問題が発生するため、`priceRange` の修正で解決するはず。

4. **修正対象外**: `backend/src/` 配下のファイルは売主管理システム用のため絶対に触らない。`vercel.json`（ルート）も絶対に触らない。

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで実施する：まず未修正コードでバグを再現して根本原因を確認し、次に修正後のコードで全フィルター条件が正しく動作することを検証する。

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグを再現し、根本原因分析を確認または反証する。反証された場合は根本原因を再仮説する。

**Test Plan**: Supabase クエリを直接シミュレートするテストを作成し、`showPublicOnly=true` と他のフィルター条件を組み合わせた場合に 400 エラーが発生することを確認する。未修正コードで実行して失敗を観察する。

**Test Cases**:
1. **showPublicOnly + location の組み合わせテスト**: `showPublicOnly=true` + `location="大分市"` でクエリを実行（未修正コードで 400 エラーが発生するはず）
2. **showPublicOnly + propertyType の組み合わせテスト**: `showPublicOnly=true` + `propertyType="土地"` でクエリを実行（未修正コードで 400 エラーが発生するはず）
3. **showPublicOnly + priceRange の組み合わせテスト**: `showPublicOnly=true` + `priceRange={min: 1000}` でクエリを実行（未修正コードで 400 エラーが発生するはず）
4. **3条件同時指定テスト**: `showPublicOnly=true` + `location="大分市品域南"` + `propertyType="土地"` でクエリを実行（AA13674 の実際のバグ再現）

**Expected Counterexamples**:
- `showPublicOnly=true` と `priceRange` を同時指定した場合に 400 エラーが発生する
- 考えられる原因: `.or()` の連鎖によるクエリパラメータの競合

### Fix Checking

**Goal**: バグ条件が成立する全ての入力に対して、修正後の関数が期待される動作（200 レスポンス + 合致する物件一覧）を返すことを検証する。

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  result ← getPublicProperties_fixed(X)
  ASSERT result.status = 200
  ASSERT result.properties IS NOT NULL
  ASSERT no_400_error(result)
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全ての入力に対して、修正後の関数が修正前と同じ結果を返すことを検証する。

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT getPublicProperties_original(X) = getPublicProperties_fixed(X)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する理由：
- 多様なフィルター条件の組み合わせを自動生成できる
- 手動テストでは見落としがちなエッジケースを検出できる
- 非バグ条件の全入力空間に対して動作保持を強く保証できる

**Test Plan**: 未修正コードで非バグ条件の動作を観察し、その動作を保持するプロパティベーステストを作成する。

**Test Cases**:
1. **フィルターなし全件取得の保持**: フィルター条件なしで全物件が正常に取得できることを確認
2. **単一 propertyType フィルターの保持**: `propertyType` のみ指定した場合の動作が変わらないことを確認
3. **単一 location フィルターの保持**: `location` のみ指定した場合の動作が変わらないことを確認
4. **単一 showPublicOnly フィルターの保持**: `showPublicOnly=true` のみ指定した場合の動作が変わらないことを確認
5. **地図ビューフィルターの保持**: `withCoordinates=true` の動作が変わらないことを確認

### Unit Tests

- `showPublicOnly=true` + `location` の組み合わせで 200 が返ることをテスト
- `showPublicOnly=true` + `propertyType` の組み合わせで 200 が返ることをテスト
- `showPublicOnly=true` + `priceRange` の組み合わせで 200 が返ることをテスト
- `showPublicOnly=true` + 全フィルター同時指定で 200 が返ることをテスト（AA13674 のシナリオ）
- フィルターなしで全件取得できることをテスト
- 各単一フィルター条件で正しい結果が返ることをテスト

### Property-Based Tests

- ランダムなフィルター条件の組み合わせを生成し、`showPublicOnly=true` の場合でも常に 400 エラーが発生しないことを検証
- `isBugCondition(X)=false` となる入力を多数生成し、修正前後で同じ結果が返ることを検証
- `priceRange` の様々な値（min のみ、max のみ、両方）で正しく動作することを検証

### Integration Tests

- 実際の Supabase に対して `showPublicOnly=true` + 複数フィルターでクエリを実行し、AA13674 が結果に含まれることを確認
- 修正後に全フィルター条件の組み合わせで公開物件サイトの動作を確認
- 地図ビューと一覧ビューの両方で修正後の動作を確認
