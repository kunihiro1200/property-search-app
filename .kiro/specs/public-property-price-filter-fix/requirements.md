# 公開物件サイト 価格範囲フィルター修正

## 概要

公開物件サイトで、マンションを選択して価格範囲を指定すると、一瞬その価格範囲のマンションが表示されるが、すぐに元の表示（新着順のリスト表示）に戻る問題を修正します。

---

## 問題の症状

### 再現手順

1. 公開物件サイト（`https://property-site-frontend-kappa.vercel.app/public/properties`）を開く
2. 「マンション」ボタンをクリック
3. 価格範囲を指定（例: 最低価格 1000万円、最高価格 3000万円）
4. 一瞬その価格範囲のマンションが表示される
5. **すぐに元の表示（新着順のリスト表示）に戻る**

### 期待される動作

- 価格範囲を指定した後、フィルターが適用された状態が維持される
- 指定した価格範囲のマンションのみが表示され続ける

---

## 問題の原因

### 1. 価格フィルターの変更がURLパラメータに反映される

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`（行330-370）

```typescript
useEffect(() => {
  const newParams = new URLSearchParams(searchParams);
  
  // 価格フィルターをURLに反映
  if (minPrice) {
    newParams.set('minPrice', minPrice);
  } else {
    newParams.delete('minPrice');
  }
  
  if (maxPrice) {
    newParams.set('maxPrice', maxPrice);
  } else {
    newParams.delete('maxPrice');
  }
  
  setSearchParams(newParams, { replace: true });
}, [selectedTypes, minPrice, maxPrice, minAge, maxAge, showPublicOnly, viewMode]);
```

### 2. URLパラメータが変更されると`fetchProperties()`が実行される

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`（行350-360）

```typescript
useEffect(() => {
  if (!isStateRestored) {
    return;
  }
  
  fetchProperties();
}, [currentPage, searchParams, isStateRestored]);
```

### 3. 問題の本質

- 価格フィルターを変更すると、URLパラメータが更新される
- URLパラメータが更新されると、`fetchProperties()`が実行される
- しかし、**ページ番号がリセットされない**ため、現在のページ（例: 2ページ目）のデータを取得しようとする
- 結果として、フィルター適用後のデータが少ない場合、現在のページに表示する物件がなくなる
- または、フィルター適用前のデータが表示される

### 4. 既存の実装との比較

**物件タイプフィルター**（行610-620）:
```typescript
const handleTypeToggle = (type: PropertyType) => {
  setSelectedTypes((prev) => {
    if (prev.includes(type)) {
      return prev.filter((t) => t !== type);
    } else {
      return [...prev, type];
    }
  });
  // ✅ ページを1に戻す
  setCurrentPage(1);
};
```

**価格フィルター**:
- ページをリセットする処理がない ❌

---

## 解決策

### 修正内容

価格フィルターと築年数フィルターの変更時に、ページを1にリセットする処理を追加します。

### 修正箇所

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

#### 修正1: 価格フィルターの変更ハンドラーを作成

```typescript
// 価格フィルターの変更ハンドラー
const handlePriceChange = (type: 'min' | 'max', value: string) => {
  if (type === 'min') {
    setMinPrice(value);
  } else {
    setMaxPrice(value);
  }
  // ページを1に戻す
  setCurrentPage(1);
};
```

#### 修正2: 築年数フィルターの変更ハンドラーを作成

```typescript
// 築年数フィルターの変更ハンドラー
const handleAgeChange = (type: 'min' | 'max', value: string) => {
  if (type === 'min') {
    setMinAge(value);
  } else {
    setMaxAge(value);
  }
  // ページを1に戻す
  setCurrentPage(1);
};
```

#### 修正3: UIコンポーネントでハンドラーを使用

**価格フィルター**（行825-840）:
```typescript
<TextField
  type="number"
  placeholder="最低価格"
  size="small"
  fullWidth
  value={minPrice}
  onChange={(e) => handlePriceChange('min', e.target.value)}
  inputProps={{ min: 0, step: 100 }}
/>
<Typography color="text.secondary">〜</Typography>
<TextField
  type="number"
  placeholder="最高価格"
  size="small"
  fullWidth
  value={maxPrice}
  onChange={(e) => handlePriceChange('max', e.target.value)}
  inputProps={{ min: 0, step: 100 }}
/>
```

**築年数フィルター**（行850-865）:
```typescript
<TextField
  type="number"
  placeholder="最小築年数"
  size="small"
  fullWidth
  value={minAge}
  onChange={(e) => handleAgeChange('min', e.target.value)}
  inputProps={{ min: 0, step: 1 }}
/>
<Typography color="text.secondary">〜</Typography>
<TextField
  type="number"
  placeholder="最大築年数"
  size="small"
  fullWidth
  value={maxAge}
  onChange={(e) => handleAgeChange('max', e.target.value)}
  inputProps={{ min: 0, step: 1 }}
/>
```

---

## 受け入れ基準

### 1. 価格フィルターが正常に動作する

- [ ] マンションを選択
- [ ] 価格範囲を指定（例: 1000万円〜3000万円）
- [ ] フィルターが適用された状態が維持される
- [ ] 指定した価格範囲のマンションのみが表示される
- [ ] ページが1にリセットされる

### 2. 築年数フィルターが正常に動作する

- [ ] マンションを選択
- [ ] 築年数範囲を指定（例: 0年〜10年）
- [ ] フィルターが適用された状態が維持される
- [ ] 指定した築年数範囲のマンションのみが表示される
- [ ] ページが1にリセットされる

### 3. 複数フィルターの組み合わせが正常に動作する

- [ ] マンションを選択
- [ ] 価格範囲を指定
- [ ] 築年数範囲を指定
- [ ] 全てのフィルターが適用された状態が維持される
- [ ] 条件に合致する物件のみが表示される

### 4. 既存機能に影響がない

- [ ] 物件タイプフィルターが正常に動作する
- [ ] 「すべての条件をクリア」ボタンが正常に動作する
- [ ] 「公開中のみ表示」ボタンが正常に動作する
- [ ] ページネーションが正常に動作する
- [ ] 地図表示が正常に動作する

---

## テスト手順

### テスト1: 価格フィルター単体

1. 公開物件サイトを開く
2. 「マンション」ボタンをクリック
3. 最低価格に「1000」を入力
4. 最高価格に「3000」を入力
5. **期待される結果**: 1000万円〜3000万円のマンションのみが表示される
6. **期待される結果**: ページが1にリセットされる
7. **期待される結果**: URLに`?types=マンション&minPrice=1000&maxPrice=3000`が含まれる

### テスト2: 築年数フィルター単体

1. 公開物件サイトを開く
2. 「マンション」ボタンをクリック
3. 最小築年数に「0」を入力
4. 最大築年数に「10」を入力
5. **期待される結果**: 築0年〜10年のマンションのみが表示される
6. **期待される結果**: ページが1にリセットされる
7. **期待される結果**: URLに`?types=マンション&minAge=0&maxAge=10`が含まれる

### テスト3: 複数フィルターの組み合わせ

1. 公開物件サイトを開く
2. 「マンション」ボタンをクリック
3. 最低価格に「1000」を入力
4. 最高価格に「3000」を入力
5. 最小築年数に「0」を入力
6. 最大築年数に「10」を入力
7. **期待される結果**: 1000万円〜3000万円、築0年〜10年のマンションのみが表示される
8. **期待される結果**: ページが1にリセットされる
9. **期待される結果**: URLに全てのフィルター条件が含まれる

### テスト4: フィルタークリア

1. テスト3の状態から「すべての条件をクリア」ボタンをクリック
2. **期待される結果**: 全ての物件が表示される
3. **期待される結果**: URLパラメータがクリアされる

---

## 実装の注意点

### 1. 既存機能への影響を最小限にする

- `handleTypeToggle()`と同様の実装パターンを使用
- 既存のuseEffectの依存配列は変更しない
- 新しいハンドラー関数を追加するのみ

### 2. ページリセットのタイミング

- フィルター変更時に即座にページを1にリセット
- これにより、フィルター適用後のデータが正しく表示される

### 3. URLパラメータの同期

- 既存のuseEffect（行330-370）がURLパラメータを自動的に更新
- 新しいハンドラーではURLパラメータの更新は不要

---

## 関連ドキュメント

- [公開物件サイト パフォーマンス重要ルール](.kiro/steering/public-property-performance-critical-rules.md)
- [地図表示最適化](.kiro/steering/public-property-map-view-optimization.md)
- [セッション記録：地図表示最適化のデプロイ](.kiro/steering/archive/session-2026-01-25-map-view-optimization-deployment.md)

---

## まとめ

### 問題

- 価格範囲フィルターを指定すると、一瞬フィルターが適用されるが、すぐに元の表示に戻る

### 原因

- 価格フィルター変更時にページ番号がリセットされない
- 現在のページ（例: 2ページ目）のデータを取得しようとするが、フィルター適用後のデータが少ないため表示できない

### 解決策

- 価格フィルターと築年数フィルターの変更時に、ページを1にリセットする処理を追加
- `handlePriceChange()`と`handleAgeChange()`ハンドラーを作成
- UIコンポーネントでこれらのハンドラーを使用

### 効果

- 価格範囲フィルターが正常に動作する
- 築年数フィルターが正常に動作する
- フィルター適用後の状態が維持される

---

**最終更新日**: 2026年1月26日  
**ステータス**: 要件定義完了（実装待ち）
