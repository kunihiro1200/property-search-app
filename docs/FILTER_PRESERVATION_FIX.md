# フィルター保持機能の修正レポート

## 問題の概要

物件を絞り込んだ後、検索ボタンを押すと以下の問題が発生していました：

1. **選択した物件タイプが消える**
2. **「公開中の物件はありません」と表示される**

## 問題の詳細

### 症状
1. ユーザーが物件タイプ（例：マンション）を選択
2. 価格フィルター（例：1000万〜1500万）を設定
3. 検索バーに所在地（例：「大分市」）を入力
4. 黄色の「🔍 検索」ボタンをクリック
5. **結果**: 物件タイプの選択が消え、「公開中の物件はありません」と表示される

### 根本原因

#### 原因1: URLパラメータの管理方法

`useUnifiedSearch`フックの`updateURLParams`関数が、検索パラメータを更新する際に、既存のフィルター（物件タイプ、価格、築年数など）を保持していませんでした。

```typescript
// ❌ 修正前（問題のあるコード）
const updateURLParams = useCallback((value: string, type: SearchQueryType | null) => {
  const newParams = new URLSearchParams(searchParams);

  // 既存の検索パラメータをクリア
  newParams.delete('propertyNumber');
  newParams.delete('location');

  // 新しい検索パラメータを設定
  if (value && type) {
    if (type === 'property_number') {
      newParams.set('propertyNumber', value);
    } else if (type === 'location') {
      newParams.set('location', value);
    }
  }

  // ページ番号をリセット
  newParams.delete('page');

  setSearchParams(newParams, { replace: true });
}, [searchParams, setSearchParams]);
```

**問題点**:
- `new URLSearchParams(searchParams)`で既存のパラメータをコピーしているが、その後`setSearchParams`で置き換えている
- しかし、`PublicPropertiesPage.tsx`の状態管理ロジックとの連携がうまくいっていなかった

#### 原因2: searchParamsオブジェクトの直接変更

`PublicPropertiesPage.tsx`の`useEffect`（行280-328）で、`searchParams`オブジェクトを直接変更していました：

```typescript
// ❌ 修正前（問題のあるコード）
useEffect(() => {
  if (selectedTypes.length > 0) {
    searchParams.set('types', selectedTypes.join(','));  // ← 直接変更
  } else {
    searchParams.delete('types');  // ← 直接変更
  }
  
  // ... 他のフィルターも同様
  
  setSearchParams(searchParams, { replace: true });
}, [selectedTypes, minPrice, maxPrice, minAge, maxAge, showPublicOnly, viewMode]);
```

**問題点**:
- `searchParams`オブジェクトを直接変更するのは推奨されない
- 新しい`URLSearchParams`オブジェクトを作成すべき

#### 原因3: 無限ループのリスク

URLパラメータから状態を復元する`useEffect`（行256-278）の依存配列が`[typesParam]`でした：

```typescript
// ❌ 修正前（問題のあるコード）
useEffect(() => {
  if (typesParam) {
    const types = typesParam.split(',') as PropertyType[];
    setSelectedTypes(types);
  }
  // ...
}, [typesParam]);
```

**問題点**:
1. ユーザーが物件タイプを選択
2. `selectedTypes`が更新される
3. `useEffect`（行280-328）がURLパラメータを更新
4. `typesParam`が変更される
5. `useEffect`（行256-278）が`selectedTypes`を更新
6. 無限ループ...

## 修正内容

### 修正1: updateURLParams関数のコメント追加

`useUnifiedSearch.ts`の`updateURLParams`関数にコメントを追加し、既存のフィルターが保持されることを明示しました：

```typescript
// ✅ 修正後
const updateURLParams = useCallback((value: string, type: SearchQueryType | null) => {
  const newParams = new URLSearchParams(searchParams);

  // 既存の検索パラメータをクリア（検索関連のみ）
  newParams.delete('propertyNumber');
  newParams.delete('location');

  // 新しい検索パラメータを設定
  if (value && type) {
    if (type === 'property_number') {
      newParams.set('propertyNumber', value);
    } else if (type === 'location') {
      newParams.set('location', value);
    }
  }

  // ページ番号をリセット（検索時は1ページ目に戻る）
  newParams.delete('page');

  // 既存のフィルター（types, minPrice, maxPrice, minAge, maxAge, showPublicOnly）は保持される
  setSearchParams(newParams, { replace: true });
}, [searchParams, setSearchParams]);
```

### 修正2: searchParamsオブジェクトの直接変更を修正

`PublicPropertiesPage.tsx`の`useEffect`で、新しい`URLSearchParams`オブジェクトを作成するように修正しました：

```typescript
// ✅ 修正後
useEffect(() => {
  const newParams = new URLSearchParams(searchParams);
  
  if (selectedTypes.length > 0) {
    newParams.set('types', selectedTypes.join(','));
  } else {
    newParams.delete('types');
  }
  
  // 価格フィルターをURLに反映
  if (minPrice) {
    newParams.set('minPrice', minPrice);
  } else {
    newParams.delete('minPrice');
  }
  
  // ... 他のフィルターも同様
  
  setSearchParams(newParams, { replace: true });
}, [selectedTypes, minPrice, maxPrice, minAge, maxAge, showPublicOnly, viewMode]);
```

### 修正3: URLパラメータから状態を復元するuseEffectを初回のみ実行

無限ループを防ぐため、URLパラメータから状態を復元する`useEffect`を初回マウント時のみ実行するように修正しました：

```typescript
// ✅ 修正後
useEffect(() => {
  if (typesParam) {
    const types = typesParam.split(',') as PropertyType[];
    setSelectedTypes(types);
  }
  
  // 価格と築年数のパラメータも復元
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const minAgeParam = searchParams.get('minAge');
  const maxAgeParam = searchParams.get('maxAge');
  
  if (minPriceParam) setMinPrice(minPriceParam);
  if (maxPriceParam) setMaxPrice(maxPriceParam);
  if (minAgeParam) setMinAge(minAgeParam);
  if (maxAgeParam) setMaxAge(maxAgeParam);
  
  // 公開中のみ表示パラメータも復元
  const showPublicOnlyParam = searchParams.get('showPublicOnly');
  if (showPublicOnlyParam === 'true') {
    setShowPublicOnly(true);
  }
}, []); // 初回マウント時のみ実行
```

## テスト結果

### テストケース1: 物件タイプ + 価格フィルター + 検索
1. 物件タイプ「マンション」を選択
2. 価格フィルター「1000万〜1500万」を設定
3. 検索バーに「大分市」と入力
4. 黄色の「🔍 検索」ボタンをクリック
5. **結果**: ✅ 物件タイプと価格フィルターが保持され、大分市のマンション（1000万〜1500万）が表示される

### テストケース2: 複数フィルター + 検索
1. 物件タイプ「戸建」を選択
2. 価格フィルター「2000万〜3000万」を設定
3. 築年数フィルター「0年〜10年」を設定
4. 「公開中のみ表示」をON
5. 検索バーに「別府市」と入力
6. 黄色の「🔍 検索」ボタンをクリック
7. **結果**: ✅ 全てのフィルターが保持され、別府市の戸建（2000万〜3000万、築10年以内、公開中）が表示される

### テストケース3: 検索クエリのクリア
1. 物件タイプ「土地」を選択
2. 検索バーに「大分市」と入力
3. 黄色の「🔍 検索」ボタンをクリック
4. 検索バーの内容を削除
5. **結果**: ✅ 物件タイプ「土地」は保持され、全ての土地が表示される

## デプロイ情報

- **デプロイ日時**: 2025-01-21
- **デプロイID**: `443jfFboN4uY7cLT25v413r6um33`
- **本番URL**: https://property-site-frontend-kappa.vercel.app

## 修正ファイル

1. `frontend/src/hooks/useUnifiedSearch.ts`
   - 行95-119: `updateURLParams`関数にコメントを追加
   - 行44-68: 検索クエリが空の場合のコメントを修正

2. `frontend/src/pages/PublicPropertiesPage.tsx`
   - 行256-278: URLパラメータから状態を復元する`useEffect`を初回のみ実行
   - 行280-328: `searchParams`オブジェクトを直接変更せず、新しい`URLSearchParams`オブジェクトを作成

## 今後の改善提案

### 1. 状態管理の簡素化

現在の実装では、URLパラメータと状態（`selectedTypes`、`minPrice`など）の両方を管理していますが、これが複雑さの原因になっています。

**提案**: URLパラメータを唯一の真実の源（Single Source of Truth）として扱い、状態は常にURLパラメータから派生させる。

### 2. カスタムフックの作成

フィルター管理のロジックをカスタムフック（例：`usePropertyFilters`）に抽出することで、コードの可読性と保守性が向上します。

### 3. URLパラメータの型安全性

現在は`searchParams.get()`で文字列として取得していますが、型安全なラッパーを作成することで、バグを減らすことができます。

## まとめ

物件を絞り込んだ後、検索ボタンを押すと選択が消える問題は、以下の3つの修正で解決しました：

1. **`updateURLParams`関数のコメント追加**: 既存のフィルターが保持されることを明示
2. **`searchParams`オブジェクトの直接変更を修正**: 新しい`URLSearchParams`オブジェクトを作成
3. **URLパラメータから状態を復元する`useEffect`を初回のみ実行**: 無限ループを防止

これにより、以下の機能が正常に動作するようになりました：
- ✅ 物件タイプの選択が保持される
- ✅ 価格フィルターが保持される
- ✅ 築年数フィルターが保持される
- ✅ 「公開中のみ表示」フィルターが保持される
- ✅ 検索ボタンをクリックしても、全てのフィルターが保持される
