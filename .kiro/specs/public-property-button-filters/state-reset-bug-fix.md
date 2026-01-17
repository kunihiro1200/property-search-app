# 物件タイプフィルターボタン状態リセット問題 - バグ修正仕様

## 問題概要

物件タイプフィルターボタン（戸建て、マンション、土地、収益物件）をクリックすると、ボタンの選択状態が維持されず、リセットされてしまう問題。

## 現象

1. ユーザーがフィルターボタン（例：「戸建て」）をクリック
2. `onTypeToggle` が呼び出され、`selectedTypes` が更新される
3. `selectedTypes` の変更により `useEffect` がトリガーされ、`fetchProperties()` が実行される
4. `setLoading(true)` が設定される
5. `disabled={loading}` プロップにより、ボタンが無効化される
6. **問題**: 何らかの理由で状態がリセットされる
7. 「条件をクリア」ボタンが表示されない（`hasActiveFilters` が `false` になる）

## 根本原因の仮説

### 仮説1: コンポーネントの再マウント
- `loading && properties.length === 0` の条件でローディング画面を表示する際、コンポーネントツリーが再構築され、状態がリセットされる可能性

### 仮説2: useEffect の依存関係問題
- `fetchProperties` が `useEffect` の依存配列に含まれていないが、内部で `selectedTypes` を参照している
- これにより、古い `selectedTypes` の値が使用される可能性

### 仮説3: 非同期処理中の状態競合
- `fetchProperties` の非同期処理中に、別の状態更新が発生し、競合が起きている可能性

## 現在の実装（BUILD_ID: 20260104_FIX_004）

```typescript
// PublicPropertiesPage.tsx
const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>([]);

const handleTypeToggle = useCallback((type: PropertyType) => {
  setSelectedTypes(prevTypes => {
    const isCurrentlySelected = prevTypes.includes(type);
    const newTypes = isCurrentlySelected
      ? prevTypes.filter(t => t !== type)
      : [...prevTypes, type];
    return newTypes;
  });
  setCurrentPage(1);
}, []);

useEffect(() => {
  fetchProperties();
}, [currentPage, searchParams, selectedTypes]);

// ローディング表示の条件
if (loading && properties.length === 0) {
  return <LoadingScreen />;
}
```

## 修正案

### 修正案1: ローディング状態の分離

初回ロードとフィルター変更時のローディングを分離する：

```typescript
const [initialLoading, setInitialLoading] = useState(true);
const [filterLoading, setFilterLoading] = useState(false);

const fetchProperties = async () => {
  try {
    if (properties.length === 0) {
      setInitialLoading(true);
    } else {
      setFilterLoading(true);
    }
    // ... fetch logic
  } finally {
    setInitialLoading(false);
    setFilterLoading(false);
  }
};

// ボタンは filterLoading 中も有効のまま
<PropertyTypeFilterButtons
  selectedTypes={selectedTypes}
  onTypeToggle={handleTypeToggle}
  disabled={initialLoading}
/>
```

### 修正案2: useCallback の依存関係修正

`fetchProperties` を `useCallback` でラップし、依存関係を明示する：

```typescript
const fetchProperties = useCallback(async () => {
  // ... fetch logic using selectedTypes
}, [currentPage, searchParams, selectedTypes]);

useEffect(() => {
  fetchProperties();
}, [fetchProperties]);
```

### 修正案3: 状態管理の最適化

フィルター状態を URL パラメータと同期させ、単一の真実の源とする：

```typescript
// URL パラメータから状態を導出
const selectedTypes = useMemo(() => {
  const typesParam = searchParams.get('types');
  return typesParam ? typesParam.split(',') as PropertyType[] : [];
}, [searchParams]);

const handleTypeToggle = useCallback((type: PropertyType) => {
  const newTypes = selectedTypes.includes(type)
    ? selectedTypes.filter(t => t !== type)
    : [...selectedTypes, type];
  
  const newParams = new URLSearchParams(searchParams);
  if (newTypes.length > 0) {
    newParams.set('types', newTypes.join(','));
  } else {
    newParams.delete('types');
  }
  navigate(`/public/properties?${newParams.toString()}`, { replace: true });
}, [selectedTypes, searchParams, navigate]);
```

## 受入基準

1. フィルターボタンをクリックした後、ボタンの選択状態が維持される
2. API リクエスト中（ローディング中）も、選択状態が視覚的に維持される
3. 「条件をクリア」ボタンが、フィルターがアクティブな時に表示される
4. ページリフレッシュ後も、フィルター状態が URL から復元される
5. 複数のフィルターボタンを連続してクリックしても、状態が正しく更新される

## テスト手順

### 手動テスト

1. `http://localhost:5174/public/properties` にアクセス
2. ブラウザの開発者ツールでコンソールを開く
3. `BUILD_ID: 20260104_FIX_XXX` が表示されることを確認（最新版の確認）
4. 「戸建て」ボタンをクリック
5. コンソールで以下を確認：
   - `[FILTER] handleTypeToggle called with: detached_house`
   - `[FILTER] selectedTypes changed: ['detached_house']`
   - `[FILTER] hasActiveFilters: true`
6. ボタンが青色（選択状態）になることを確認
7. 「条件をクリア」ボタンが表示されることを確認

### キャッシュクリア手順

最新コードが読み込まれない場合：

1. `Ctrl + Shift + R` でハードリフレッシュ
2. または、開発者ツール → Network タブ → 「Disable cache」にチェック → リロード
3. または、開発者ツール → Application → Storage → 「Clear site data」

## 関連ファイル

- `frontend/src/pages/PublicPropertiesPage.tsx` - メインページコンポーネント
- `frontend/src/components/PropertyTypeFilterButtons.tsx` - フィルターボタンコンポーネント
- `frontend/src/components/PropertyTypeFilterButtons.css` - スタイル

## 優先度

高 - ユーザーエクスペリエンスに直接影響する機能的バグ
