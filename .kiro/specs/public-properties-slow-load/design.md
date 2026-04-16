# public-properties-slow-load バグ修正デザイン

## Overview

公開物件サイト（`/public/properties`）の表示に約20秒かかるパフォーマンス問題を修正する。

調査の結果、以下の2つの独立したバグが重なっていることが判明した：

1. **フロントエンドバグ**: 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻ると `viewMode` が `'list'` に強制設定されず、`fetchAllProperties()` が実行されて20秒以上かかる
2. **バックエンドバグ**: `/api/public/properties` エンドポイントで `price` が `null` の物件ごとに個別のSupabaseクエリを実行するN+1問題がある

修正方針は最小限の変更で両問題を解消することとし、既存の動作（フィルター・ページネーション・状態復元）を一切壊さない。

## Glossary

- **Bug_Condition (C)**: バグが発現する入力条件
  - フロントエンド: 地図ビューで詳細ページに遷移し、戻るボタンで一覧に戻る操作
  - バックエンド: `price` フィールドが `null` の物件が1件以上存在する物件一覧取得リクエスト
- **Property (P)**: バグ条件が成立する入力に対して期待される正しい動作
- **Preservation**: 修正によって変更してはならない既存の動作
- **fetchAllProperties**: `PublicPropertiesPage.tsx` 内の関数。地図表示用に全物件を取得する（座標あり物件のみ、画像スキップ）。実行に20秒以上かかる
- **fetchProperties**: `PublicPropertiesPage.tsx` 内の関数。リスト表示用にページネーション付きで物件を取得する。通常数秒以内に完了
- **viewMode**: `PublicPropertiesPage.tsx` の状態変数。`'list'` または `'map'` の値を持つ
- **N+1問題**: 1件のリクエストに対してN件の追加クエリが発生するアンチパターン。今回は `price=null` の物件ごとに個別のSupabaseクエリが実行される
- **NavigationState**: 詳細ページから一覧に戻る際に保存される状態（スクロール位置・ページ番号・フィルター・viewMode）

## Bug Details

### Bug Condition

#### バグ1: フロントエンド（viewMode 強制設定の欠落）

詳細ページから戻ってきた際の状態復元処理で、`viewMode` が保存されていない場合に `'list'` へのフォールバックが機能していない。その結果、`viewMode` が `'map'` のまま残り、`useEffect` が `fetchAllProperties()` をトリガーする。

**Formal Specification:**
```
FUNCTION isBugCondition_frontend(navigationState)
  INPUT: navigationState of type NavigationState | null
  OUTPUT: boolean

  RETURN navigationState IS NOT NULL
         AND navigationState.viewMode IS NULL OR UNDEFINED
         AND previousViewMode WAS 'map'
         AND fetchAllProperties() IS TRIGGERED
END FUNCTION
```

#### バグ2: バックエンド（N+1クエリ）

`/api/public/properties` エンドポイントで、`PropertyListingService.getPublicProperties()` が返す物件の `price` フィールドが `null` の場合、各物件ごとに個別のSupabaseクエリを実行している。

**Formal Specification:**
```
FUNCTION isBugCondition_backend(properties)
  INPUT: properties of type PublicProperty[]
  OUTPUT: boolean

  nullPriceCount := COUNT(p IN properties WHERE p.price IS NULL)
  RETURN nullPriceCount > 0
         AND supabaseQueryCount = 1 + nullPriceCount  // N+1
END FUNCTION
```

### Examples

**フロントエンドバグの例:**
- ユーザーが地図ビュー（`viewMode='map'`）で物件AA12345の詳細ページに遷移
- ブラウザの戻るボタンを押す
- `NavigationState` に `viewMode` が保存されていない場合、`viewMode` が `'map'` のまま残る
- `useEffect` が `viewMode === 'map' && allProperties.length === 0` を検知して `fetchAllProperties()` を実行
- 20秒以上の遅延が発生

**バックエンドバグの例:**
- 物件一覧に20件の物件があり、そのうち15件の `price` が `null`
- `PropertyListingService.getPublicProperties()` が1回のクエリで20件を返す
- その後、`price=null` の15件それぞれに対して個別のSupabaseクエリが実行される
- 合計16クエリ（1 + 15）が実行され、レスポンスが大幅に遅延する

**エッジケース:**
- 全物件の `price` が設定済みの場合: バックエンドバグは発現しない（N+1クエリなし）
- リストビューから詳細ページに遷移して戻る場合: フロントエンドバグは発現しない

## Expected Behavior

### Preservation Requirements

**変更してはならない動作:**
- 物件タイプ・価格・築年数などのフィルター機能は引き続き正しく動作すること
- ページネーション機能は引き続き正しく動作すること
- 地図ビューへの切り替えは引き続き正しく動作すること
- 詳細ページから一覧に戻る際のスクロール位置・ページ番号・フィルター状態の復元は引き続き動作すること
- `price` フィールドが設定済みの物件は、修正前と同じ値が返されること
- `sales_price` と `listing_price` の両方が `null` の物件は、`price=0` または `price=undefined` として扱われること（既存の動作を維持）

**スコープ:**
- 地図ビューから詳細ページに遷移しない操作（リストビューからの遷移、直接アクセスなど）は完全に影響を受けない
- `price` が既に設定されている物件のデータは変更されない

## Hypothesized Root Cause

### バグ1: フロントエンド

コミット `3a209e9` で実装されていた「`viewMode` が保存されていない場合に `'list'` にフォールバックする処理」が、その後の変更で削除または変更された可能性がある。

現在のコード（`PublicPropertiesPage.tsx`）の状態復元処理を確認すると：

```typescript
// viewModeを復元（保存されている場合）
if (savedState.viewMode) {
  console.log('🔄 Restoring viewMode:', savedState.viewMode);
  setViewMode(savedState.viewMode);
} else {
  // viewModeが保存されていない場合はデフォルトで'list'
  console.log('🔄 No viewMode saved, defaulting to list');
  setViewMode('list');
}
```

このコードは存在しているが、`NavigationState` に `viewMode` が保存されていない場合のフォールバックが機能していない可能性がある。詳細ページへの遷移時に `viewMode` を `NavigationState` に保存する処理が欠落している可能性が高い。

**最も可能性の高い根本原因:**
1. **詳細ページへの遷移時に `viewMode` を保存していない**: `PublicPropertyDetailPage.tsx` または詳細ページへのリンクで `NavigationState` に `viewMode` を含めていない
2. **`viewMode` の `useEffect` の依存配列の問題**: `viewMode` が変更された際に `fetchAllProperties()` が不必要にトリガーされる

### バグ2: バックエンド

`backend/api/index.ts` の `/api/public/properties` エンドポイントに以下のコードが存在する：

```typescript
const propertiesWithPrice = await Promise.all(
  (result.properties || []).map(async (property) => {
    // すでに price が設定されている場合はスキップ
    if (property.price !== null && property.price !== undefined) {
      return property;
    }
    
    // Supabaseから sales_price と listing_price を取得
    const { data: dbProperty, error } = await supabase
      .from('property_listings')
      .select('sales_price, listing_price')
      .eq('id', property.id)
      .single();
    // ...
  })
);
```

`PropertyListingService.getPublicProperties()` が `price` フィールドを返さない（または `null` で返す）ため、全物件に対して個別クエリが実行されている。

**根本原因:** `PropertyListingService` が `sales_price` または `listing_price` から `price` を計算して返していないため、エンドポイント側でN+1クエリによる補完処理が追加された。

## Correctness Properties

Property 1: Bug Condition - フロントエンド viewMode 強制設定

_For any_ ナビゲーション状態において、地図ビューで詳細ページに遷移後に戻るボタンで一覧に戻る操作（isBugCondition_frontend が true）が発生した場合、修正後の `PublicPropertiesPage` は `viewMode` を強制的に `'list'` に設定し、`fetchAllProperties()` を実行しないこと。

**Validates: Requirements 2.2**

Property 2: Bug Condition - バックエンド N+1クエリ排除

_For any_ 物件一覧取得リクエストにおいて、`price` が `null` の物件が存在する場合（isBugCondition_backend が true）、修正後の `/api/public/properties` エンドポイントは `sales_price` または `listing_price` を直接使用して `price` を計算し、物件ごとの個別Supabaseクエリを実行しないこと（クエリ数 = 1）。

**Validates: Requirements 2.3**

Property 3: Preservation - 既存フィルター・ページネーション動作

_For any_ フィルター条件（物件タイプ・価格・築年数）またはページネーション操作において、バグ条件が成立しない入力（isBugCondition が false）に対して、修正後のコードは修正前のコードと同じ結果を返すこと。

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation - 状態復元動作

_For any_ 詳細ページから一覧に戻る操作において、スクロール位置・ページ番号・フィルター状態の復元は修正前と同じ動作を維持すること。

**Validates: Requirements 3.4**

## Fix Implementation

### Changes Required

#### 修正1: バックエンド N+1クエリの排除

**File**: `backend/api/index.ts`

**Function**: `/api/public/properties` エンドポイントハンドラー

**Specific Changes:**

1. **N+1クエリブロックを削除**: `Promise.all` による個別クエリループを削除する
2. **インラインで price を計算**: `PropertyListingService` が返す各物件に対して、`sales_price || listing_price || 0` でインライン計算する

**修正前（問題のあるコード）:**
```typescript
const propertiesWithPrice = await Promise.all(
  (result.properties || []).map(async (property) => {
    if (property.price !== null && property.price !== undefined) {
      return property;
    }
    // 個別Supabaseクエリ（N+1問題）
    const { data: dbProperty, error } = await supabase
      .from('property_listings')
      .select('sales_price, listing_price')
      .eq('id', property.id)
      .single();
    // ...
  })
);
```

**修正後（正しいコード）:**
```typescript
const propertiesWithPrice = (result.properties || []).map((property) => {
  // price が既に設定されている場合はそのまま返す
  if (property.price !== null && property.price !== undefined) {
    return property;
  }
  // sales_price または listing_price から直接計算（個別クエリなし）
  const calculatedPrice = property.sales_price || property.listing_price || 0;
  return {
    ...property,
    price: calculatedPrice,
  };
});
```

**前提条件の確認:** `PropertyListingService.getPublicProperties()` が返す物件オブジェクトに `sales_price` と `listing_price` フィールドが含まれているかを確認する必要がある。含まれていない場合は `PropertyListingService` 側の修正も必要。

#### 修正2: フロントエンド viewMode 強制設定の復元

**File**: `frontend/src/pages/PublicPropertiesPage.tsx`

**調査が必要な箇所:**
1. 詳細ページへの遷移時に `viewMode` を `NavigationState` に保存しているか確認
2. `PublicPropertyDetailPage.tsx` または物件カードのリンクで `state` に `viewMode` を含めているか確認

**Specific Changes:**

コミット `3a209e9` の実装を参考に、詳細ページへの遷移時に `viewMode` を `NavigationState` に含める処理を追加する。

**修正方針（調査後に確定）:**
- 物件カードのリンクまたは詳細ページへの遷移処理で `state: { ...currentState, viewMode: currentViewMode }` を渡す
- または、`sessionStorage` に `viewMode` を保存して復元する

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで実施する：
1. **探索フェーズ**: 修正前のコードでバグを再現し、根本原因を確認する
2. **検証フェーズ**: 修正後のコードでバグが解消され、既存動作が保持されていることを確認する

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグを再現し、根本原因分析を確認または反証する。

**Test Plan**: 
- バックエンド: `price=null` の物件を含む一覧取得リクエストを送信し、Supabaseクエリ数を計測する
- フロントエンド: 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻り、`fetchAllProperties()` が呼ばれることを確認する

**Test Cases:**

1. **N+1クエリ再現テスト**: `price=null` の物件が存在する状態で `/api/public/properties` を呼び出し、Supabaseクエリが複数回実行されることを確認（修正前のコードで失敗することを期待）
2. **viewMode 強制設定テスト**: 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻り、`viewMode` が `'map'` のまま残ることを確認（修正前のコードで失敗することを期待）
3. **レスポンス時間テスト**: 修正前の `/api/public/properties` のレスポンス時間が20秒以上かかることを確認
4. **price フィールド確認テスト**: `PropertyListingService.getPublicProperties()` が返す物件に `sales_price` と `listing_price` が含まれているかを確認

**Expected Counterexamples:**
- N+1クエリ: `price=null` の物件数に比例してクエリ数が増加する
- viewMode: 地図ビューから戻った際に `fetchAllProperties()` が実行される

### Fix Checking

**Goal**: バグ条件が成立する全ての入力に対して、修正後のコードが期待通りの動作をすることを確認する。

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition_backend(request) DO
  result := fixedEndpoint(request)
  ASSERT supabaseQueryCount(result) = 1
  ASSERT result.properties[*].price IS NOT NULL
END FOR

FOR ALL navigation WHERE isBugCondition_frontend(navigation) DO
  result := fixedPage(navigation)
  ASSERT result.viewMode = 'list'
  ASSERT fetchAllProperties NOT CALLED
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全ての入力に対して、修正後のコードが修正前と同じ結果を返すことを確認する。

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition_backend(request) DO
  ASSERT originalEndpoint(request) = fixedEndpoint(request)
END FOR

FOR ALL navigation WHERE NOT isBugCondition_frontend(navigation) DO
  ASSERT originalPage(navigation) = fixedPage(navigation)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する理由：
- 様々なフィルター条件・ページネーション・物件データの組み合わせを自動生成できる
- 手動テストでは見落としがちなエッジケースを検出できる
- 修正前後の動作が一致することを強力に保証できる

**Test Cases:**

1. **フィルター保持テスト**: 物件タイプ・価格・築年数フィルターを適用した状態で修正前後のレスポンスが一致することを確認
2. **ページネーション保持テスト**: 各ページのレスポンスが修正前後で一致することを確認
3. **price 設定済み物件テスト**: `price` が既に設定されている物件は修正前後で同じ値が返されることを確認
4. **リストビュー遷移テスト**: リストビューから詳細ページに遷移して戻る場合、`fetchAllProperties()` が呼ばれないことを確認

### Unit Tests

- `price=null` の物件に対して `sales_price || listing_price || 0` が正しく計算されることをテスト
- `price` が設定済みの物件はそのまま返されることをテスト
- `viewMode` が保存されていない `NavigationState` で一覧に戻った際に `'list'` が設定されることをテスト
- `viewMode` が `'map'` で保存された `NavigationState` で一覧に戻った際に `'map'` が設定されることをテスト

### Property-Based Tests

- ランダムな物件データ（`price=null` の物件を含む）に対して、修正後のエンドポイントが常に `price` を返すことを検証
- ランダムなフィルター条件に対して、修正前後のレスポンスが一致することを検証
- ランダムな `NavigationState`（`viewMode` あり・なし）に対して、状態復元が正しく動作することを検証

### Integration Tests

- 地図ビューで詳細ページに遷移後、戻るボタンで一覧に戻るフルフローをテスト
- フィルターを適用した状態で詳細ページに遷移後、戻るボタンで一覧に戻り、フィルターが復元されることをテスト
- `/api/public/properties` エンドポイントのレスポンス時間が5秒以内であることをテスト
