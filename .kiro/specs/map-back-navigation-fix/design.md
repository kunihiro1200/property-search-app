# map-back-navigation-fix バグ修正デザイン

## Overview

公開物件サイトにおいて、地図ビュー（マップビュー）から物件詳細ページに遷移した後、
ヘッダーの「物件一覧」ボタンを押すと地図ビューに戻るべきところ、リストビューに戻ってしまうバグを修正する。

**バグの影響**: ユーザーが地図ビューで物件を探している最中に詳細を確認して戻ろうとすると、
地図ビューが失われてリストビューに切り替わり、操作の継続性が損なわれる。

**修正方針**: 最小限の変更で、`viewMode` を正しく保存・復元する。

---

## Glossary

- **Bug_Condition (C)**: バグが発生する条件 — 地図ビューから物件詳細ページに遷移し、「物件一覧」ボタンを押した場合
- **Property (P)**: 期待される正しい動作 — 地図ビューから遷移した場合は地図ビューに戻る
- **Preservation**: 修正によって変えてはならない既存の動作 — リストビューからの遷移・戻り、フィルター復元、スクロール位置復元
- **handleBackClick**: `frontend/src/components/PublicPropertyHeader.tsx` 内の関数。「物件一覧」ボタンクリック時に呼ばれる。現在は `navigationState` の `viewMode` を無視して常に `/public/properties` へ遷移する
- **navigationState**: `NavigationState` 型のオブジェクト。`viewMode`、`currentPage`、`scrollPosition`、`filters` を保持する
- **viewMode**: 一覧画面の表示モード。`'list'`（リストビュー）または `'map'`（地図ビュー）
- **sessionStorage**: ブラウザのセッションストレージ。`PropertyMapView` が物件クリック時に `navigationState` を保存する場所

---

## Bug Details

### Bug Condition

バグは、ユーザーが地図ビューから物件詳細ページに遷移し、「物件一覧」ボタンを押した場合に発生する。
`handleBackClick` が `navigationState` の `viewMode` を完全に無視して常に `/public/properties`（リストビュー）へ遷移し、
さらに `PublicPropertiesPage` の状態復元処理が `viewMode` を強制的に `'list'` に上書きする。

**Formal Specification:**
```
FUNCTION isBugCondition(navigationState)
  INPUT: navigationState of type NavigationState | null
  OUTPUT: boolean

  RETURN navigationState IS NOT NULL
         AND navigationState.viewMode = 'map'
         AND handleBackClick IGNORES navigationState.viewMode
         AND PublicPropertiesPage FORCES viewMode TO 'list'
END FUNCTION
```

### Examples

- **例1（バグあり）**: 地図ビューで物件マーカーをクリック → 詳細ページへ遷移 → 「物件一覧」ボタンを押す → リストビューに戻る（**期待: 地図ビューに戻る**）
- **例2（バグあり）**: 地図ビューで `viewMode: 'map'` が `sessionStorage` に保存される → 詳細ページから戻る → `setViewMode('list')` が強制実行される → 地図ビューが失われる
- **例3（バグなし）**: リストビューで物件カードをクリック → 詳細ページへ遷移 → 「物件一覧」ボタンを押す → リストビューに戻る（正常動作）
- **エッジケース**: `navigationState` が `null` の場合（直接URLアクセスなど）→ デフォルトのリストビュー（`/public/properties`）に遷移する（正常動作）

---

## Expected Behavior

### Preservation Requirements

**変えてはならない動作:**
- リストビューから物件カードをクリックして詳細ページに遷移した場合、「物件一覧」ボタンを押すとリストビューに戻る
- 詳細ページから一覧に戻った際に、スクロール位置・ページ番号・フィルター設定（物件タイプ・価格帯・築年数・検索クエリ）が復元される
- `canHide=true` パラメータが存在する場合、戻り先URLにも引き継がれる
- `navigationState` が存在しない場合、「物件一覧」ボタンはデフォルトのリストビュー（`/public/properties`）に遷移する

**スコープ:**
地図ビューから遷移した場合（`viewMode: 'map'`）のみ修正対象。
リストビューからの遷移・戻り動作は一切変更しない。

---

## Hypothesized Root Cause

コードの調査により、根本原因は2箇所に特定済み:

1. **`PublicPropertyHeader.tsx` の `handleBackClick` が `viewMode` を無視**
   - `navigationState` プロパティとして受け取っているが、`handleBackClick` 内で参照していない
   - 常に `/public/properties`（リストビュー）または `/public/properties?canHide=true` へ遷移する
   - `navigationState.viewMode` が `'map'` の場合は `?view=map` を付与すべきだが、付与していない

2. **`PublicPropertiesPage.tsx` の状態復元処理が `viewMode` を強制的に `'list'` に設定**
   - 行248付近: `setViewMode('list')` が無条件に実行される
   - コメントには「地図用データの取得useEffectが実行されない」という理由が書かれているが、
     `savedState.viewMode` を確認せずに強制上書きしている
   - `savedState.viewMode === 'map'` の場合は `setViewMode('map')` を呼ぶべき

---

## Correctness Properties

Property 1: Bug Condition - 地図ビューからの戻りナビゲーション

_For any_ `navigationState` において `viewMode: 'map'` が設定されている場合、
修正後の `handleBackClick` は `/public/properties?view=map`（`canHide=true` の場合は
`/public/properties?view=map&canHide=true`）へ遷移し、
修正後の `PublicPropertiesPage` の状態復元処理は `viewMode` を `'map'` として復元する。

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - リストビューからの戻りナビゲーション

_For any_ `navigationState` において `viewMode` が `'list'` または未設定の場合、
修正後のコードは修正前のコードと同一の動作を行い、リストビューへの遷移・フィルター復元・
スクロール位置復元が変わらず機能する。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

## Fix Implementation

### Changes Required

根本原因の分析に基づき、以下の2ファイルを修正する:

**File 1**: `frontend/src/components/PublicPropertyHeader.tsx`

**Function**: `handleBackClick`

**Specific Changes**:
1. **`viewMode` の読み取り**: `navigationState?.viewMode` を参照する
2. **条件分岐の追加**: `viewMode === 'map'` の場合は `?view=map` をURLに付与する
3. **`canHide` との組み合わせ**: `canHide=true` かつ `viewMode === 'map'` の場合は
   `/public/properties?view=map&canHide=true` へ遷移する

**修正イメージ:**
```typescript
const handleBackClick = () => {
  const searchParams = new URLSearchParams(location.search);
  const canHide = searchParams.get('canHide');
  const viewMode = navigationState?.viewMode;

  // viewMode と canHide の組み合わせでURLを構築
  const params = new URLSearchParams();
  if (canHide === 'true') params.set('canHide', 'true');
  if (viewMode === 'map') params.set('view', 'map');

  const queryString = params.toString();
  const backUrl = queryString ? `/public/properties?${queryString}` : '/public/properties';

  navigate(backUrl);
};
```

---

**File 2**: `frontend/src/pages/PublicPropertiesPage.tsx`

**Location**: 状態復元処理（`useEffect` 内、行248付近）

**Specific Changes**:
1. **`setViewMode('list')` の無条件実行を削除**: 現在の強制上書きを除去する
2. **`savedState.viewMode` を確認して復元**: `viewMode` が存在する場合はその値を使用する
3. **デフォルト値の維持**: `viewMode` が未設定の場合はリストビューのまま（既存動作を維持）

**修正イメージ:**
```typescript
// ⚠️ 修正前（削除する）:
// console.log('🔄 Restoring state from detail page, forcing viewMode to list');
// setViewMode('list');

// ✅ 修正後（追加する）:
if (savedState.viewMode) {
  console.log('🔄 Restoring viewMode:', savedState.viewMode);
  setViewMode(savedState.viewMode);
}
// viewMode が未設定の場合は初期値（URLパラメータまたは 'list'）のまま
```

---

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで構成する:
1. **探索フェーズ**: 修正前のコードでバグを再現し、根本原因を確認する
2. **検証フェーズ**: 修正後のコードでバグが解消され、既存動作が保たれることを確認する

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグを再現し、根本原因分析を確認・反証する。

**Test Plan**: `handleBackClick` と状態復元処理の単体テストを作成し、
修正前のコードで実行してバグを観察する。

**Test Cases**:
1. **地図ビューからの戻りテスト**: `navigationState = { viewMode: 'map', ... }` を渡して
   `handleBackClick` を呼び出し、遷移先URLが `/public/properties`（`?view=map` なし）になることを確認（修正前は失敗するはず）
2. **状態復元の強制上書きテスト**: `savedState = { viewMode: 'map', ... }` で状態復元処理を実行し、
   `viewMode` が `'list'` に強制設定されることを確認（修正前は失敗するはず）
3. **`canHide` 付き地図ビューテスト**: `canHide=true` かつ `viewMode: 'map'` の場合に
   遷移先が `/public/properties?canHide=true`（`view=map` なし）になることを確認（修正前は失敗するはず）

**Expected Counterexamples**:
- `handleBackClick` が `navigationState.viewMode` を参照していないため、`?view=map` が付与されない
- 状態復元処理が `setViewMode('list')` を無条件実行するため、`viewMode: 'map'` が上書きされる

### Fix Checking

**Goal**: 修正後のコードで、バグ条件が成立する全入力に対して期待動作が得られることを確認する。

**Pseudocode:**
```
FOR ALL navigationState WHERE isBugCondition(navigationState) DO
  result := handleBackClick_fixed(navigationState)
  ASSERT result.url CONTAINS 'view=map'
  
  restoredViewMode := restoreState_fixed(navigationState)
  ASSERT restoredViewMode = 'map'
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全入力に対して、修正前後で動作が変わらないことを確認する。

**Pseudocode:**
```
FOR ALL navigationState WHERE NOT isBugCondition(navigationState) DO
  ASSERT handleBackClick_original(navigationState) = handleBackClick_fixed(navigationState)
  ASSERT restoreState_original(navigationState) = restoreState_fixed(navigationState)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する。理由:
- リストビューからの遷移パターンが多様（フィルター組み合わせ、ページ番号など）
- 手動テストでは網羅しきれないエッジケースを自動生成できる
- 修正が既存動作を壊していないことを強く保証できる

**Test Cases**:
1. **リストビューからの戻り保持**: `viewMode: 'list'` の場合、修正前後で遷移先URLが同一であることを確認
2. **`navigationState` なしの動作保持**: `navigationState = null` の場合、`/public/properties` へ遷移することを確認
3. **フィルター復元の保持**: `viewMode: 'list'` で状態復元した場合、フィルター設定が正しく復元されることを確認
4. **`canHide` 引き継ぎの保持**: `canHide=true` かつ `viewMode: 'list'` の場合、`/public/properties?canHide=true` へ遷移することを確認

### Unit Tests

- `handleBackClick` に `viewMode: 'map'` を渡した場合、`?view=map` が付与されることをテスト
- `handleBackClick` に `viewMode: 'list'` を渡した場合、`?view=map` が付与されないことをテスト
- `handleBackClick` に `navigationState = null` を渡した場合、デフォルトURLへ遷移することをテスト
- 状態復元処理で `viewMode: 'map'` が正しく復元されることをテスト
- 状態復元処理で `viewMode: 'list'` が正しく復元されることをテスト

### Property-Based Tests

- ランダムな `NavigationState` を生成し、`viewMode` が `'map'` の場合は常に `?view=map` が付与されることを検証
- ランダムな `NavigationState` を生成し、`viewMode` が `'list'` または未設定の場合は `?view=map` が付与されないことを検証
- ランダムなフィルター設定を生成し、`viewMode: 'list'` での状態復元が修正前後で同一であることを検証

### Integration Tests

- 地図ビューで物件マーカーをクリック → 詳細ページ → 「物件一覧」ボタン → 地図ビューに戻ることを確認
- リストビューで物件カードをクリック → 詳細ページ → 「物件一覧」ボタン → リストビューに戻ることを確認
- 地図ビューから戻った際に、フィルター設定が保持されていることを確認
- `canHide=true` 付きで地図ビューから戻った際に、`canHide=true` が引き継がれることを確認
