# スクロール位置復元とフィルターボタンハイライト修正ガイド

## 概要

このガイドは、以下の機能を復元するためのものです：

1. **詳細画面から戻った時のスクロール位置復元**
2. **詳細画面から戻った時のページ番号復元**
3. **フィルター条件適用時の「すべての条件をクリア」ボタンのハイライト**
4. **地図表示中の「地図で検索」ボタンのハイライト**

## 問題の症状

### 問題1: ページ番号と表示内容の不一致
- 2ページ目の物件をクリック → 詳細画面 → 「物件一覧」で戻る
- ページ番号は「2 / 74」と表示されるが、実際の物件は1ページ目のものが表示される

### 問題2: フィルター条件が分かりにくい
- フィルター条件を選択して詳細画面に移動し、戻ってきた時
- フィルター条件が適用されているが、ボタンの見た目が変わらないため分かりにくい

### 問題3: 地図表示中であることが分かりにくい
- 地図表示に切り替えても、ボタンの見た目が変わらない

## 修正内容

### 修正1: 状態復元中のsetCurrentPage(1)を防止

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**変更点**:

1. **状態復元中フラグを追加**:
```typescript
// 状態復元中かどうかのフラグ（setCurrentPage(1)を防ぐため）
const isRestoringState = useRef(false);
```

2. **状態復元開始時にフラグを立てる**:
```typescript
if (savedState && !hasRestoredState.current) {
  hasRestoredState.current = true;
  
  // 状態復元中フラグを立てる（setCurrentPage(1)を防ぐため）
  isRestoringState.current = true;
  
  // ... 状態復元処理 ...
  
  // 状態復元完了（少し遅延させてフィルター状態の更新を待つ）
  setTimeout(() => {
    isRestoringState.current = false;
    setIsStateRestored(true);
    console.log('✅ [PublicPropertiesPage] State restoration completed');
  }, 100);
}
```

3. **setCurrentPage(1)の呼び出しを条件付きに**:

`handleTypeToggle`関数:
```typescript
const handleTypeToggle = (type: PropertyType) => {
  setSelectedTypes((prev) => {
    if (prev.includes(type)) {
      return prev.filter((t) => t !== type);
    } else {
      return [...prev, type];
    }
  });
  // 状態復元中でない場合のみページを1に戻す
  if (!isRestoringState.current) {
    setCurrentPage(1);
  }
};
```

`handleClearAllFilters`関数:
```typescript
const handleClearAllFilters = () => {
  try {
    // ... フィルタークリア処理 ...
    
    // 状態復元中でない場合のみページを1に戻す
    if (!isRestoringState.current) {
      setCurrentPage(1);
    }
    
    // ... URLパラメータクリア ...
  } catch (error) {
    console.error('Error clearing filters:', error);
    setError('フィルターのクリアに失敗しました。もう一度お試しください。');
  }
};
```

`showPublicOnly`ボタンのonClick:
```typescript
<Button
  variant={showPublicOnly ? "contained" : "outlined"}
  onClick={() => {
    setShowPublicOnly(!showPublicOnly);
    // 状態復元中でない場合のみページを1に戻す
    if (!isRestoringState.current) {
      setCurrentPage(1);
    }
  }}
  // ...
>
```

### 修正2: フィルター条件適用時のボタンハイライト

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**変更点**:

1. **フィルター判定関数を追加**:
```typescript
// フィルター条件が適用されているかどうかを判定
const hasActiveFilters = () => {
  return (
    selectedTypes.length > 0 ||
    minPrice !== '' ||
    maxPrice !== '' ||
    minAge !== '' ||
    maxAge !== '' ||
    showPublicOnly ||
    searchQuery.trim() !== ''
  );
};
```

2. **ボタンのスタイルを動的に変更**:
```typescript
<Button
  variant={hasActiveFilters() ? "contained" : "outlined"}
  onClick={handleClearAllFilters}
  disabled={filterLoading}
  sx={{
    mt: 1,
    borderColor: '#FFC107',
    color: hasActiveFilters() ? '#000' : '#FFC107',
    backgroundColor: hasActiveFilters() ? '#FFC107' : 'transparent',
    fontWeight: 600,
    '&:hover': {
      borderColor: '#FFB300',
      bgcolor: hasActiveFilters() ? '#FFB300' : 'rgba(255, 193, 7, 0.08)',
    },
  }}
  aria-label="すべてのフィルター条件をクリア"
>
  {hasActiveFilters() ? '✓ 条件をクリア' : 'すべての条件をクリア'}
</Button>
```

### 修正3: 地図表示中のボタンハイライト

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**変更点**:

「地図で検索」ボタンのスタイルを動的に変更:
```typescript
<Button
  variant={viewMode === 'map' ? "contained" : "outlined"}
  startIcon={<LocationOnIcon />}
  sx={{
    height: '56px',
    minWidth: { xs: 'auto', sm: '140px' },
    width: { xs: '100%', sm: 'auto' },
    borderColor: '#4CAF50',
    color: viewMode === 'map' ? '#ffffff' : '#4CAF50',
    backgroundColor: viewMode === 'map' ? '#4CAF50' : 'transparent',
    fontWeight: 'bold',
    '&:hover': {
      borderColor: '#45A049',
      backgroundColor: viewMode === 'map' ? '#45A049' : '#F1F8F4',
    },
  }}
  onClick={() => {
    setViewMode('map');
    setShouldScrollToMap(true);
  }}
>
  {viewMode === 'map' ? '✓ 地図で検索中' : '地図で検索'}
</Button>
```

## 関連コミット

- `42bb722` - Fix: Prevent setCurrentPage(1) during state restoration from detail page
- `a026f99` - Feat: Highlight 'Clear All Filters' button when filters are active
- `d417020` - Feat: Highlight 'Map Search' button when map view is active

## 復元方法

### 方法1: コミットから復元（推奨）

```bash
# 最新の修正を含むコミットに戻す
git checkout d417020 -- frontend/src/pages/PublicPropertiesPage.tsx
```

### 方法2: 個別の修正を適用

上記の「修正内容」セクションを参照して、必要な部分を手動で適用してください。

## テスト方法

### テスト1: ページ番号復元
1. 2ページ目に移動
2. 任意の物件をクリック
3. 詳細画面で「物件一覧」ボタンをクリック
4. **期待結果**: 2ページ目の物件が表示され、ページ番号も「2 / 74」と正しく表示される

### テスト2: フィルターボタンハイライト
1. 初期状態で「すべての条件をクリア」ボタンがアウトライン表示であることを確認
2. マンションボタンをクリック
3. **期待結果**: 「すべての条件をクリア」ボタンが黄色に光り「✓ 条件をクリア」に変わる
4. 物件詳細に移動して戻る
5. **期待結果**: ボタンが引き続き黄色に光っている
6. 「✓ 条件をクリア」をクリック
7. **期待結果**: ボタンが元のアウトライン表示に戻る

### テスト3: 地図ボタンハイライト
1. 初期状態で「地図で検索」ボタンがアウトライン表示であることを確認
2. 「地図で検索」をクリック
3. **期待結果**: ボタンが緑色に光り「✓ 地図で検索中」に変わる
4. 「リスト表示に戻る」をクリック
5. **期待結果**: ボタンが元のアウトライン表示に戻る

## 次回の復元依頼の仕方

```
詳細画面から戻った時のスクロール位置とページ番号が正しく復元されない。
フィルターボタンと地図ボタンのハイライトも復元して。
コミット d417020 に戻して。
```

---

**最終更新日**: 2026年1月28日
**関連ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`
