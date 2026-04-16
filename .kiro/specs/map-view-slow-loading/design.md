# 地図ビュー遅延読み込み バグフィックス設計

## Overview

公開物件サイト（`/public/properties`）の地図ビューにおいて、`fetchAllProperties` 関数が `while` ループで `limit=1000` のAPIリクエストを繰り返し実行し、最大10,000件の物件データを全件取得しようとするため、地図表示までに数秒〜数十秒の待機が発生している。

バックエンドには既に `withCoordinates=true`（座標付き物件のみ返す）と `skipImages=true`（画像取得スキップ）の最適化パラメータが実装済みであるにもかかわらず、フロントエンドが `while` ループによるページネーション取得を継続しているため、これらの最適化が十分に活かされていない。

修正方針：`fetchAllProperties` の `while` ループを廃止し、`withCoordinates=true` + `skipImages=true` + `limit=大きな値`（または `limit` を座標付き物件の実件数に合わせた値）による**単一リクエスト**に置き換える。また、フィルター変更時の重複リクエストを防ぐためデバウンス制御を追加する。

## Glossary

- **Bug_Condition (C)**: バグが発現する条件 — ユーザーが地図ビューに切り替えた、またはフィルターを変更した際に `fetchAllProperties` が `while` ループで複数回APIリクエストを実行する状態
- **Property (P)**: 期待される正しい動作 — 地図ビュー切り替え時に単一APIリクエストで座標付き物件のみを取得し、地図表示までの待機時間を大幅に短縮する
- **Preservation**: 修正によって変更してはならない既存の動作 — リストビューのページネーション取得、詳細ページからの戻り時の状態復元、地図マーカーのクリック動作
- **fetchAllProperties**: `frontend/src/pages/PublicPropertiesPage.tsx` 内の関数。地図ビュー用に全物件データを取得する責務を持つ
- **withCoordinates**: バックエンドAPIパラメータ。`true` の場合、`latitude` と `longitude` が両方 `null` でない物件のみを返す
- **skipImages**: バックエンドAPIパラメータ。`true` の場合、画像取得処理をスキップしてレスポンスを高速化する
- **searchParams**: React Router の URLSearchParams。フィルター条件（物件タイプ・価格帯・築年数など）を保持し、変更時に `fetchAllProperties` の再実行をトリガーする

## Bug Details

### Bug Condition

地図ビューに切り替えた際、または地図ビュー表示中にフィルターを変更した際に、`fetchAllProperties` 関数が `while` ループで `limit=1000` のAPIリクエストを繰り返し実行する。`withCoordinates=true` + `skipImages=true` を指定しているにもかかわらず、ループが継続するため、座標付き物件が1,000件未満であっても最初のレスポンスで `fetchedProperties.length < limit` が成立するまで複数回リクエストが走る可能性がある。さらに `searchParams` の変更のたびに全件再取得が走る。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { viewMode: string, searchParams: URLSearchParams, allProperties: PublicProperty[] }
  OUTPUT: boolean

  RETURN input.viewMode === 'map'
         AND (
           fetchAllPropertiesUsesWhileLoop()
           OR (input.searchParams が変更された AND 重複リクエスト制御がない)
         )
END FUNCTION
```

### Examples

- **例1（バグあり）**: ユーザーが「地図で検索」ボタンをクリック → `fetchAllProperties` が `offset=0, limit=1000` でリクエスト → 座標付き物件が300件の場合でも `while` ループが1回実行される（300 < 1000 なので終了）が、座標付き物件が1,200件の場合は2回リクエストが走る
- **例2（バグあり）**: 地図ビュー表示中にユーザーが「マンション」フィルターをクリック → `searchParams` 変更を検知して `fetchAllProperties` が再実行 → 再び `while` ループが走る
- **例3（バグあり）**: 地図ビュー表示中にユーザーが価格フィルターを変更 → `searchParams` 変更を検知して即座に `fetchAllProperties` が再実行（デバウンスなし）
- **例4（期待動作）**: `withCoordinates=true` + `skipImages=true` + 十分大きな `limit` で単一リクエスト → 座標付き物件のみを1回で取得して地図表示

## Expected Behavior

### Preservation Requirements

**変更してはならない既存の動作:**
- リストビューでのページネーション付き物件取得（`fetchProperties` 関数）は従来通り動作し続ける
- 詳細ページから戻った際のリストビュー復元（フィルター状態・ページ番号・スクロール位置）は従来通り動作する
- 地図マーカーのクリックによる情報ウィンドウ表示（物件種別・価格・住所・詳細リンク）は従来通り動作する
- フィルター条件のURLパラメータ反映とページネーションリセットは従来通り動作する
- バックエンドAPIが `withCoordinates=false`（デフォルト）でリクエストを受け取った場合、座標の有無に関わらず全物件を返す動作は変更しない

**スコープ:**
地図ビューのデータ取得ロジック（`fetchAllProperties` 関数）のみを修正対象とする。リストビューのデータ取得（`fetchProperties`）、詳細ページ、バックエンドAPIの既存動作には一切変更を加えない。

## Hypothesized Root Cause

コードの分析に基づき、以下の根本原因を仮説として立てる：

1. **`while` ループによる全件取得**: `fetchAllProperties` が `while (hasMore)` ループで `limit=1000` のリクエストを繰り返し実行している。`withCoordinates=true` を指定しているため座標付き物件のみが返されるが、ループ終了条件が `fetchedProperties.length < limit` であるため、座標付き物件数が1,000件未満の場合でも最低1回のリクエストが必要。座標付き物件が1,000件を超える場合は複数回のリクエストが走る。
   - 修正方針: `while` ループを廃止し、`limit` を十分大きな値（例: 5000）に設定した単一リクエストに置き換える

2. **`searchParams` 依存による毎回の全件再取得**: `useEffect` の依存配列に `searchParams` が含まれているため、フィルター変更のたびに `fetchAllProperties` が再実行される。デバウンス制御がないため、連続したフィルター変更で複数のリクエストが同時に走る可能性がある。
   - 修正方針: デバウンス（300〜500ms）またはリクエストキャンセル（AbortController）を追加する

3. **`viewMode` 変更時の二重トリガー**: `searchParams` の `useEffect` と `viewMode` の `useEffect` の両方が地図ビュー切り替え時に `fetchAllProperties` を呼び出す可能性がある。
   - 修正方針: トリガー条件を整理し、重複実行を防ぐ

4. **安全装置の上限が高すぎる**: `offset >= 10000` で停止する安全装置があるが、これは10,000件取得後に停止するため、実質的な上限として機能していない。
   - 修正方針: `while` ループ廃止により不要になる

## Correctness Properties

Property 1: Bug Condition - 地図ビュー切り替え時の単一リクエスト取得

_For any_ 入力において地図ビューへの切り替えが発生した場合（isBugCondition が true を返す）、修正後の `fetchAllProperties` 関数は `while` ループを使用せず、`withCoordinates=true` + `skipImages=true` パラメータを含む**単一のAPIリクエスト**で座標付き物件データを取得し、地図マーカーとして表示できる状態にする。

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - リストビューおよびその他の動作の保持

_For any_ 入力においてバグ条件が成立しない場合（地図ビューでない、またはリストビューでの操作）、修正後のコードは修正前のコードと同一の動作を保持し、リストビューのページネーション取得・詳細ページからの状態復元・地図マーカーのクリック動作を変更しない。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

根本原因の分析が正しいと仮定した場合の修正内容：

**File**: `frontend/src/pages/PublicPropertiesPage.tsx`

**Function**: `fetchAllProperties`

**Specific Changes**:

1. **`while` ループの廃止**: `while (hasMore)` ループを削除し、単一の `fetch` 呼び出しに置き換える
   - `limit` を `5000`（または座標付き物件の実件数を超える十分大きな値）に設定
   - `offset` は常に `0`
   - `withCoordinates=true` + `skipImages=true` は維持

2. **デバウンス制御の追加**: `searchParams` 変更時の `fetchAllProperties` 再実行にデバウンス（300〜500ms）を追加する
   - `useRef` でタイマーIDを保持し、前回のタイマーをキャンセルしてから新しいタイマーをセット
   - または `AbortController` を使用して進行中のリクエストをキャンセルする

3. **`useEffect` のトリガー整理**: `searchParams` の `useEffect` と `viewMode` の `useEffect` の重複実行を防ぐ
   - `viewMode === 'map'` に切り替わった時のみ `fetchAllProperties` を実行する条件を明確化

4. **安全装置の削除**: `while` ループ廃止に伴い、`offset >= 10000` の安全装置は不要になるため削除する

5. **エラーハンドリングの維持**: 既存のエラーハンドリング（`try/catch`、`setIsLoadingAllProperties`）は維持する

**修正後の `fetchAllProperties` の概要:**
```typescript
const fetchAllProperties = async () => {
  try {
    setIsLoadingAllProperties(true);
    
    // フィルターパラメータを構築（既存ロジックを維持）
    const params = new URLSearchParams({
      limit: '5000',  // while ループを廃止し、単一リクエストで取得
      offset: '0',
      withCoordinates: 'true',
      skipImages: 'true',
    });
    // ... フィルターパラメータの追加（既存ロジックを維持）
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/public/properties?${params.toString()}`);
    
    if (!response.ok) throw new Error('物件の取得に失敗しました');
    
    const data = await response.json();
    setAllProperties(data.properties || []);
  } catch (err: any) {
    console.error('全件取得エラー:', err);
  } finally {
    setIsLoadingAllProperties(false);
  }
};
```

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで構成する：まず修正前のコードでバグを再現するテストを実行してバグの存在を確認し、次に修正後のコードでバグが解消されていること（Fix Checking）と既存動作が保持されていること（Preservation Checking）を検証する。

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグを再現し、根本原因分析を確認または反証する。反証された場合は根本原因を再仮説する。

**Test Plan**: `fetchAllProperties` 関数をモックして、`while` ループが複数回APIリクエストを実行することを確認する。また、`searchParams` 変更時にデバウンスなしで即座に再実行されることを確認する。

**Test Cases**:
1. **`while` ループ複数回実行テスト**: 座標付き物件が1,001件存在する場合、`fetchAllProperties` が2回APIリクエストを実行することを確認（修正前のコードで失敗するはず）
2. **フィルター変更時の即時再実行テスト**: `searchParams` を変更した際にデバウンスなしで `fetchAllProperties` が即座に再実行されることを確認
3. **地図ビュー切り替え時の遅延テスト**: 地図ビューに切り替えた際の実際の待機時間を計測（数秒〜数十秒の遅延を確認）
4. **二重トリガーテスト**: `searchParams` の `useEffect` と `viewMode` の `useEffect` が同時に `fetchAllProperties` を呼び出すケースを確認

**Expected Counterexamples**:
- `while` ループが複数回実行され、APIリクエストが2回以上発生する
- `searchParams` 変更のたびに即座に `fetchAllProperties` が再実行される
- 可能な原因: `while` ループの終了条件が `fetchedProperties.length < limit` であるため、座標付き物件数が `limit` を超える場合に複数回リクエストが走る

### Fix Checking

**Goal**: バグ条件が成立するすべての入力に対して、修正後の関数が期待される動作を示すことを検証する。

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fetchAllProperties_fixed(input)
  ASSERT APIリクエストが1回のみ実行された
  ASSERT withCoordinates=true が含まれている
  ASSERT skipImages=true が含まれている
  ASSERT result.properties の全要素が latitude != null AND longitude != null
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しないすべての入力に対して、修正後の関数が修正前と同一の動作を示すことを検証する。

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT fetchProperties_original(input) = fetchProperties_fixed(input)
  ASSERT リストビューのページネーション動作が変わらない
  ASSERT 詳細ページからの状態復元が変わらない
END FOR
```

**Testing Approach**: プロパティベーステストは保持チェックに推奨される。理由：
- 多様なフィルター条件の組み合わせを自動生成できる
- 手動テストでは見落としがちなエッジケースを検出できる
- リストビューの動作が変わっていないことを強く保証できる

**Test Plan**: 修正前のコードでリストビューの動作を観察し、その動作をプロパティベーステストとして記述する。

**Test Cases**:
1. **リストビュー保持テスト**: `fetchProperties` がページネーション付きで動作し続けることを確認
2. **詳細ページ戻り保持テスト**: `sessionStorage` からの状態復元が正常に動作することを確認
3. **地図マーカークリック保持テスト**: `allProperties` のデータ構造が `PropertyMapView` コンポーネントの期待する形式と一致することを確認
4. **フィルターURL反映保持テスト**: フィルター変更時に `searchParams` が正しく更新されることを確認

### Unit Tests

- `fetchAllProperties` が単一リクエストのみ実行することをテスト
- `withCoordinates=true` + `skipImages=true` パラメータが含まれることをテスト
- デバウンス制御が正しく動作することをテスト（連続した `searchParams` 変更で最後の変更のみが実行される）
- エラー時に `isLoadingAllProperties` が `false` にリセットされることをテスト

### Property-Based Tests

- ランダムなフィルター条件（物件タイプ・価格帯・築年数の組み合わせ）を生成し、`fetchAllProperties` が常に単一リクエストのみ実行することを検証
- ランダムな `searchParams` の変更シーケンスを生成し、デバウンス後に最後の変更のみが反映されることを検証
- リストビューの `fetchProperties` がフィルター変更後も正しいページネーション動作を維持することを検証

### Integration Tests

- 地図ビューに切り替えた際の実際のAPIリクエスト数が1回であることを確認
- フィルター変更後の地図ビューで正しい物件マーカーが表示されることを確認
- リストビューと地図ビューを切り替えた際に両方の動作が正常であることを確認
- 詳細ページから戻った際にリストビューが正しく復元されることを確認
