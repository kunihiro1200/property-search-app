# 地図→リスト切り替え遅延 バグフィックス設計

## Overview

公開物件サイト（`/public/properties`）の地図ビューからリストビューへの切り替えに30秒かかる問題。

コミット `474618d` で `filterChangedDuringMapRef` による再取得スキップ制御を追加したが、`viewMode` 変更が `searchParams` を変更させる副作用により、スキップ制御が機能していない。さらに `fetchProperties` が `skipImages=false` で呼ばれるため、Google Sheets API クォータ超過時に各物件の画像取得が詰まり16秒以上の遅延が発生している。

## Glossary

- **Bug_Condition (C)**: バグが発現する条件 — ユーザーが地図ビューからリストビューに切り替えた際に30秒の遅延が発生する状態
- **filterChangedDuringMapRef**: 地図ビュー中にフィルターが変更されたかを追跡する `useRef`。`true` の場合のみリスト再取得を実行する
- **searchParamsDuringMapRef**: 地図ビュー中の `searchParams` を追跡する `useRef`。変化を検知してフィルター変更フラグを立てる
- **viewMode 変更の副作用**: `viewMode` が `'list'` に変わると、`selectedTypes, minPrice, ...viewMode` を依存配列に持つ `useEffect` が `searchParams` から `view=map` を削除する。この変化が `filterChangedDuringMapRef` を誤って `true` にする
- **getStorageUrlFromWorkTasks**: `PropertyListingService` 内のメソッド。`storage_location` が空の物件に対して Google Sheets API（業務リスト）を呼び出す。クォータ超過時に遅延の原因となる
- **skipImages**: バックエンドAPIパラメータ。`true` の場合、画像取得処理（`getStorageUrlFromWorkTasks` を含む）をスキップしてレスポンスを高速化する

## Bug Details

### Bug Condition

地図ビューからリストビューに切り替えた際、以下の2つの問題が重なって30秒の遅延が発生する：

**問題1: `filterChangedDuringMapRef` の誤検知**

```
viewMode: 'map' → 'list' に変更
  ↓
viewMode を依存配列に持つ useEffect が発火
  ↓
searchParams から 'view=map' を削除（setSearchParams）
  ↓
searchParams が変化
  ↓
fetchProperties の useEffect が発火（viewMode, searchParams を依存配列に持つ）
  ↓
viewMode === 'map' の条件で searchParamsDuringMapRef と比較
  ↓ ← ここが問題: viewMode はすでに 'list' だが、
       searchParams 変化の検知タイミングによっては
       filterChangedDuringMapRef = true になる可能性がある
```

実際には `viewMode` が `'list'` になった後に `searchParams` が変わるため、`viewMode === 'map'` の条件は通らないが、React の state 更新バッチングにより同一レンダリングサイクルで両方が変わる場合がある。

**問題2: `fetchProperties` が `skipImages=false` で呼ばれる**

```
fetchProperties() 呼び出し（skipImages パラメータなし）
  ↓
バックエンド: 20件の物件を取得
  ↓
各物件の storage_location が空 → getStorageUrlFromWorkTasks を呼び出し
  ↓
Google Sheets API（業務リスト）にリクエスト
  ↓
Quota exceeded エラー → 各物件で遅延
  ↓
20件 × 遅延 = 16秒以上
```

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { prevViewMode: 'list' | 'map', viewMode: 'list' | 'map' }
  OUTPUT: boolean

  RETURN input.prevViewMode === 'map' AND input.viewMode === 'list'
         AND (
           filterChangedDuringMapRef が誤って true になっている
           OR fetchProperties が skipImages=false で呼ばれる
         )
END FUNCTION
```

### Examples

- **例1（バグあり）**: 地図ビューで「リスト表示に戻る」クリック → `viewMode='list'` → `searchParams` から `view=map` 削除 → `filterChangedDuringMapRef=true`（誤検知）→ `fetchProperties` 呼び出し → `skipImages=false` → Google Sheets API クォータ超過 → 16秒待機
- **例2（期待動作）**: 地図ビューで「リスト表示に戻る」クリック → フィルター変更なし → `fetchProperties` をスキップ → 既存の `properties` データを即座に表示
- **例3（期待動作）**: 地図ビューでフィルター変更後に「リスト表示に戻る」クリック → `fetchProperties` を `skipImages=true` で呼び出し → 画像なしで高速レスポンス → 画像は遅延ロード

## Expected Behavior

### Preservation Requirements

**変更してはならない既存の動作:**
- リストビューでのページネーション付き物件取得（`fetchProperties` 関数）は従来通り動作し続ける
- 地図ビュー中にフィルターを変更してからリストビューに戻った場合は、変更されたフィルターで再取得する
- 詳細ページから戻った際のリストビュー復元（フィルター状態・ページ番号・スクロール位置）は従来通り動作する
- 地図マーカーのクリックによる情報ウィンドウ表示は従来通り動作する

**スコープ:**
- `frontend/src/pages/PublicPropertiesPage.tsx` の `filterChangedDuringMapRef` 判定ロジック
- `frontend/src/pages/PublicPropertiesPage.tsx` の `fetchProperties` 関数（`skipImages=true` 追加）
- `backend/api/index.ts` の `/api/public/folder-thumbnail/:folderId` エンドポイント（404 → デフォルト画像）

## Hypothesized Root Cause

### 根本原因1: `viewMode` 変更による `searchParams` 変化の誤検知

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**問題箇所**:
```typescript
// viewMode を依存配列に持つ useEffect（フィルターをURLに反映）
useEffect(() => {
  // ...
  if (viewMode === 'map') {
    newParams.set('view', 'map');
  } else {
    newParams.delete('view');  // ← viewMode='list' になると searchParams が変わる
  }
  setSearchParams(newParams, { replace: true });
}, [selectedTypes, minPrice, maxPrice, minAge, maxAge, showPublicOnly, viewMode]);

// fetchProperties の useEffect
useEffect(() => {
  // ...
  if (viewMode === 'map') {
    const currentParams = searchParams.toString();
    if (prevViewModeRef.current === 'map' && searchParamsDuringMapRef.current !== currentParams) {
      filterChangedDuringMapRef.current = true;  // ← viewMode='list' 後の searchParams 変化で誤検知
    }
    // ...
  }
}, [currentPage, searchParams, isStateRestored, viewMode]);
```

**修正方針**: `filterChangedDuringMapRef` の判定を `viewMode === 'map'` の条件内に限定し、`view` パラメータの変化を「フィルター変更」として扱わないようにする。具体的には、`searchParams` から `view` パラメータを除いた文字列で比較する。

### 根本原因2: `fetchProperties` が `skipImages=false` で呼ばれる

**ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`

**問題箇所**:
```typescript
const fetchProperties = async () => {
  // ...
  const params = new URLSearchParams({
    limit: '20',
    offset: offset.toString(),
    // skipImages が指定されていない → バックエンドで画像取得が走る
  });
  // ...
};
```

**修正方針**: `fetchProperties` に `skipImages=true` を追加し、リスト表示では画像取得をスキップする。画像は `PublicPropertyCard` の `img` タグの `src` に設定された `/api/public/folder-thumbnail/:folderId` URL で遅延ロードされる（既存の仕組みを活用）。

### 根本原因3: `folder-thumbnail` の 404 エラー

**ファイル**: `backend/api/index.ts`

**問題箇所**:
```typescript
app.get('/api/public/folder-thumbnail/:folderId', async (req, res) => {
  // ...
  if (!result.images || result.images.length === 0) {
    return res.status(404).json({ error: 'No images found' });  // ← 404 を返す
  }
  // ...
});
```

**修正方針**: 画像が見つからない場合は 404 ではなく、プレースホルダー画像（`via.placeholder.com` または固定の SVG）にリダイレクトする。これによりブラウザのコンソールエラーを抑制する。

## Correctness Properties

Property 1: Bug Condition - 地図→リスト切り替え時の即座表示

_For any_ 入力において地図ビューからリストビューへの切り替えが発生し、かつ地図ビュー中にフィルターが変更されていない場合、修正後のコードは `fetchProperties` を呼び出さず、既存の `properties` データを即座に表示する。

**Validates: Requirements 2.1, 2.2**

Property 2: Fix Condition - `skipImages=true` による高速化

_For any_ 入力において `fetchProperties` が呼ばれる場合、修正後のコードは `skipImages=true` パラメータを付与してリクエストを送信し、バックエンドは画像取得処理をスキップして高速にレスポンスを返す。

**Validates: Requirements 2.3**

Property 3: Preservation - フィルター変更後の再取得

_For any_ 入力において地図ビュー中にフィルターが変更された後にリストビューに戻った場合、修正後のコードは変更されたフィルター条件で `fetchProperties` を再実行する。

**Validates: Requirements 3.2**

## Fix Implementation

### Changes Required

**File 1**: `frontend/src/pages/PublicPropertiesPage.tsx`

**Change 1: `searchParams` 比較から `view` パラメータを除外**

```typescript
// 修正前
const currentParams = searchParams.toString();
if (prevViewModeRef.current === 'map' && searchParamsDuringMapRef.current !== currentParams) {
  filterChangedDuringMapRef.current = true;
}

// 修正後
const getFilterParams = (params: URLSearchParams) => {
  const copy = new URLSearchParams(params);
  copy.delete('view');  // view パラメータはフィルターではない
  return copy.toString();
};
const currentParams = getFilterParams(searchParams);
if (prevViewModeRef.current === 'map' && searchParamsDuringMapRef.current !== currentParams) {
  filterChangedDuringMapRef.current = true;
}
searchParamsDuringMapRef.current = currentParams;  // view を除いた値で保存
```

**Change 2: `fetchProperties` に `skipImages=true` を追加**

```typescript
const params = new URLSearchParams({
  limit: '20',
  offset: offset.toString(),
  skipImages: 'true',  // 追加: 画像取得をスキップして高速化
});
```

**File 2**: `backend/api/index.ts`

**Change 3: `folder-thumbnail` の 404 をプレースホルダーにリダイレクト**

```typescript
if (!result.images || result.images.length === 0) {
  // 404 ではなくプレースホルダーにリダイレクト
  return res.redirect('https://via.placeholder.com/400x300?text=No+Image');
}
```

## Testing Strategy

### Fix Checking

**Goal**: バグ条件が成立するすべての入力に対して、修正後のコードが期待される動作を示すことを検証する。

**Test Cases**:
1. 地図ビューからリストビューに切り替えた際、`fetchProperties` が呼ばれないことを確認（フィルター変更なしの場合）
2. `fetchProperties` が呼ばれる場合、`skipImages=true` パラメータが含まれることを確認
3. `folder-thumbnail` エンドポイントが画像なしの場合にプレースホルダーにリダイレクトすることを確認

### Preservation Checking

**Goal**: バグ条件が成立しないすべての入力に対して、修正後のコードが修正前と同一の動作を示すことを検証する。

**Test Cases**:
1. 地図ビュー中にフィルターを変更してからリストビューに戻った場合、`fetchProperties` が呼ばれることを確認
2. リストビューでのページネーション動作が変わらないことを確認
3. 詳細ページからの状態復元が変わらないことを確認
