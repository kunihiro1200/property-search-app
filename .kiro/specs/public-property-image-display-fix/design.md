# 公開物件一覧ページ画像表示バグ修正 デザイン

## Overview

公開物件一覧ページ（`/public/properties`）で物件カードの画像がグレーのまま表示されないバグを修正する。

コミット `67d0a04`（`fix: remove via.placeholder.com dependency`）で2つの問題が同時に発生した：

1. **フロントエンド側**: `PublicPropertyCard` の `thumbnailUrl` が `null` になった場合に `folder-thumbnail` エンドポイントを使った遅延ロードを行うロジックが実装されなかった。`skipImages=true` 設計では `images: []` が返るため、`thumbnailUrl = null` となり常に「画像なし」ボックスが表示される。

2. **バックエンド側**: `folder-thumbnail` エンドポイントの画像なし・エラー時のフォールバック処理（SVGプレースホルダー返却）が削除され、404/500 JSON レスポンスに変更された。これによりブラウザコンソールに大量のエラーが出る。

修正方針：
- `PublicPropertyCard` に `storage_location` からフォルダIDを抽出して `folder-thumbnail` エンドポイントを `src` に設定する `<img>` タグを追加する
- `folder-thumbnail` エンドポイントの画像なし・エラー時にインラインSVGプレースホルダーを返すフォールバック処理を復元する

## Glossary

- **Bug_Condition (C)**: `skipImages=true` でAPIを呼び出した結果、`images: []` かつ `storage_location` が存在する物件カードが表示される状態
- **Property (P)**: バグ条件が成立する場合に期待される正しい動作 — `storage_location` からフォルダIDを抽出し `folder-thumbnail` エンドポイントを `src` に設定した `<img>` タグが表示される
- **Preservation**: 既存の動作（`storage_location` が null の場合の「画像なし」表示、詳細ページの画像取得、地図ビューなど）が変わらないこと
- **PublicPropertyCard**: `frontend/src/components/PublicPropertyCard.tsx` — 物件一覧の各カードを表示するコンポーネント
- **folder-thumbnail エンドポイント**: `backend/api/index.ts` の `/api/public/folder-thumbnail/:folderId` — Google DriveフォルダIDを受け取り、フォルダ内の最初の画像を返すエンドポイント
- **skipImages**: `GET /api/public/properties` のクエリパラメータ。`true` の場合、バックエンドは画像取得処理をスキップして `images: []` を返す（高速化のため）
- **storage_location**: Google DriveフォルダのURL（例: `https://drive.google.com/drive/folders/FOLDER_ID`）。DBの `property_listings.storage_location` カラムに格納される

## Bug Details

### Bug Condition

バグは `skipImages=true` でAPIを呼び出した結果、`images: []` かつ `storage_location` が存在する物件カードが表示される場合に発生する。`PublicPropertyCard` は `property.images` が空の場合に `thumbnailUrl = null` と判定し、`folder-thumbnail` エンドポイントを使った遅延ロードを行わずに「画像なし」ボックスを表示する。

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type PublicPropertyCardProps
  OUTPUT: boolean

  RETURN X.property.images.length = 0
    AND X.property.storage_location IS NOT NULL
    AND X.property.storage_location != ''
END FUNCTION
```

### Examples

- **例1（バグあり）**: `storage_location = "https://drive.google.com/drive/folders/ABC123"` かつ `images = []` の物件カード → 「画像なし」グレーボックスが表示される（期待: `<img src="/api/public/folder-thumbnail/ABC123">` が表示される）
- **例2（バグあり）**: `folder-thumbnail/XYZ` にリクエストしてフォルダに画像がない場合 → 404 JSON が返りブラウザコンソールにエラーが出る（期待: SVGプレースホルダーが返りエラーなし）
- **例3（バグあり）**: `folder-thumbnail/XYZ` でGoogle Drive APIエラーが発生した場合 → 500 JSON が返りブラウザコンソールにエラーが出る（期待: SVGプレースホルダーが返りエラーなし）
- **例4（バグなし）**: `storage_location = null` の物件カード → 「画像なし」ボックスが表示される（これは正常動作）

## Expected Behavior

### Preservation Requirements

**変わってはいけない動作:**
- `storage_location` が null または空文字列の物件カードは「画像なし」ボックスを表示し続ける（クラッシュしない）
- `skipImages=false`（デフォルト）でAPIを呼び出した場合、通常の画像取得処理（Google Drive API経由）が実行され `images` 配列に画像データが返る
- 物件詳細ページの画像取得（`/api/public/properties/:id/images` エンドポイント）は変わらず動作する
- 地図ビューの物件表示（`/api/public/map-properties` エンドポイント）は変わらず動作する
- `images` 配列に画像データがある場合（`thumbnailUrl` が存在する場合）は既存の `<img>` タグで表示し続ける

**スコープ:**
`storage_location` を持たない物件、詳細ページ、地図ビューはこの修正の影響を受けない。

## Hypothesized Root Cause

コミット `67d0a04` の変更内容（`git show 67d0a04` で確認済み）から、以下の2つの根本原因が特定された：

### 根本原因1: PublicPropertyCard に folder-thumbnail 遅延ロードロジックが未実装

**ファイル**: `frontend/src/components/PublicPropertyCard.tsx`

**問題箇所**（コミット `67d0a04` の変更）:
```typescript
// 変更前（via.placeholder.com を使用）
const thumbnailUrl = property.images && property.images.length > 0
  ? property.images[0].thumbnailUrl
  : 'https://via.placeholder.com/400x300?text=No+Image';
// → 常に <img> タグが表示されていた

// 変更後（現在の状態）
const thumbnailUrl = property.images && property.images.length > 0
  ? property.images[0].thumbnailUrl
  : null;
// → null の場合は「画像なし」ボックスを表示するが、
//   storage_location がある場合の folder-thumbnail 遅延ロードが実装されていない
```

`skipImages=true` 設計では `images: []` が返るため、`thumbnailUrl` は常に `null` になる。`storage_location` からフォルダIDを抽出して `folder-thumbnail` エンドポイントを `src` に設定する遅延ロードロジックが必要だが、実装されていない。

### 根本原因2: folder-thumbnail エンドポイントのフォールバック処理が削除された

**ファイル**: `backend/api/index.ts`

**問題箇所**（コミット `67d0a04` の変更）:
```typescript
// 変更前（コミット 4fe569d で追加されたフォールバック処理）
if (!result.images || result.images.length === 0) {
  // 404 ではなくプレースホルダーにリダイレクト（ブラウザのコンソールエラーを抑制）
  return res.redirect('https://via.placeholder.com/400x300?text=No+Image');
}
// エラー時も同様にリダイレクト

// 変更後（現在の状態）
if (!result.images || result.images.length === 0) {
  return res.status(404).json({ error: 'No images found' });
}
// エラー時は 500 JSON を返す
```

`via.placeholder.com` への依存を削除する際に、フォールバック処理ごと削除されてしまった。外部サービスへの依存を排除しつつ、インラインSVGでフォールバックを実装する必要がある。

## Correctness Properties

Property 1: Bug Condition - storage_location からの遅延ロード画像表示

_For any_ `PublicPropertyCardProps` において `isBugCondition` が true（`images.length = 0` かつ `storage_location` が存在する）の場合、修正後の `PublicPropertyCard` は `storage_location` からフォルダIDを抽出し、`/api/public/folder-thumbnail/{folderId}` を `src` に設定した `<img>` タグを表示し、「画像なし」ボックスを表示しない。

**Validates: Requirements 2.2**

Property 2: Preservation - storage_location なし物件の「画像なし」表示

_For any_ `PublicPropertyCardProps` において `isBugCondition` が false（`storage_location` が null または空文字列）の場合、修正後の `PublicPropertyCard` は修正前と同じ「画像なし」ボックスを表示し、クラッシュしない。

**Validates: Requirements 3.3**

Property 3: Bug Condition - folder-thumbnail エンドポイントのフォールバック

_For any_ `folderId` において `folder-thumbnail` エンドポイントがフォルダ内に画像を見つけられない場合、または Google Drive API エラーが発生した場合、修正後のエンドポイントは SVG インライン画像（プレースホルダー）を返し、ブラウザコンソールに 404/500 エラーを出さない。

**Validates: Requirements 2.3, 2.4**

## Fix Implementation

### Changes Required

根本原因分析が正しいと仮定した場合の修正内容：

---

**File 1**: `frontend/src/components/PublicPropertyCard.tsx`

**Function**: `PublicPropertyCard` コンポーネント（画像表示ロジック）

**Specific Changes**:

1. **storage_location からフォルダIDを抽出するロジックを追加**:
   - `property.storage_location` から `/folders/FOLDER_ID` パターンでフォルダIDを抽出する
   - 例: `https://drive.google.com/drive/folders/ABC123` → `ABC123`

2. **thumbnailUrl の決定ロジックを更新**:
   - `images` 配列に画像がある場合: 既存の `images[0].thumbnailUrl` を使用（変更なし）
   - `images` が空かつ `storage_location` からフォルダIDが抽出できる場合: `/api/public/folder-thumbnail/{folderId}` を使用
   - それ以外: `null`（「画像なし」ボックスを表示）

3. **型定義の更新**:
   - `PublicProperty` 型に `storage_location?: string` フィールドを追加する（`frontend/src/types/publicProperty.ts`）

---

**File 2**: `backend/api/index.ts`

**Function**: `/api/public/folder-thumbnail/:folderId` エンドポイント

**Specific Changes**:

1. **画像なし時のフォールバックをSVGプレースホルダーに変更**:
   - `result.images.length === 0` の場合、404 JSON の代わりにインラインSVGを返す
   - `Content-Type: image/svg+xml` でレスポンスを返す
   - `Cache-Control: public, max-age=86400` を設定してキャッシュを有効化

2. **エラー時のフォールバックをSVGプレースホルダーに変更**:
   - `catch` ブロックで 500 JSON の代わりにインラインSVGを返す
   - エラーログは引き続き出力する（サーバーサイドのデバッグのため）

**SVGプレースホルダーの内容**（例）:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#f5f5f5"/>
  <text x="200" y="150" text-anchor="middle" fill="#999" font-size="16">画像なし</text>
</svg>
```

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで構成される：まず未修正コードでバグを再現するカウンターエグザンプルを確認し、次に修正後のコードで正しい動作と既存動作の保全を検証する。

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグが再現することを確認し、根本原因分析を検証する。

**Test Plan**: `storage_location` を持つ物件データを使って `PublicPropertyCard` をレンダリングし、「画像なし」ボックスが表示されることを確認する。また `folder-thumbnail` エンドポイントに画像なしフォルダIDでリクエストして 404 が返ることを確認する。

**Test Cases**:
1. **遅延ロード未実装テスト**: `images: []` かつ `storage_location: "https://drive.google.com/drive/folders/ABC123"` の物件で `PublicPropertyCard` をレンダリング → 「画像なし」ボックスが表示される（未修正コードで失敗することを確認）
2. **folder-thumbnail 404 テスト**: 画像が存在しないフォルダIDで `GET /api/public/folder-thumbnail/:folderId` にリクエスト → 404 JSON が返る（未修正コードで失敗することを確認）
3. **folder-thumbnail エラーテスト**: 無効なフォルダIDで `GET /api/public/folder-thumbnail/:folderId` にリクエスト → 500 JSON が返る（未修正コードで失敗することを確認）

**Expected Counterexamples**:
- `PublicPropertyCard` が `<img src="/api/public/folder-thumbnail/ABC123">` を表示しない
- `folder-thumbnail` エンドポイントが画像なし・エラー時に JSON を返す（SVGではない）

### Fix Checking

**Goal**: バグ条件が成立する全ての入力に対して、修正後の関数が期待される動作を示すことを検証する。

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  rendered ← render(PublicPropertyCard_fixed(X))
  ASSERT rendered contains <img> tag with src = "/api/public/folder-thumbnail/{folderId}"
  ASSERT rendered does NOT show "画像なし" box
END FOR

FOR ALL folderId WHERE folderHasNoImages(folderId) DO
  response ← GET /api/public/folder-thumbnail/{folderId}
  ASSERT response.status = 200
  ASSERT response.headers['Content-Type'] = 'image/svg+xml'
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全ての入力に対して、修正後の関数が修正前と同じ動作を示すことを検証する。

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT render(PublicPropertyCard_original(X)) = render(PublicPropertyCard_fixed(X))
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する理由：
- 多様な `storage_location` の値（null、空文字列、不正なURL形式など）を自動生成できる
- 手動テストでは見落としがちなエッジケースを網羅できる
- 修正が既存動作を壊していないことを強く保証できる

**Test Cases**:
1. **storage_location なし物件の保全**: `storage_location: null` の物件で「画像なし」ボックスが表示されることを確認（修正前後で同じ動作）
2. **images あり物件の保全**: `images: [{ thumbnailUrl: "/api/public/images/XYZ/thumbnail" }]` の物件で既存の `<img>` タグが表示されることを確認（修正前後で同じ動作）
3. **詳細ページ画像取得の保全**: `/api/public/properties/:id/images` エンドポイントが変わらず動作することを確認
4. **地図ビューの保全**: `/api/public/map-properties` エンドポイントが変わらず動作することを確認

### Unit Tests

- `storage_location` からフォルダIDを抽出するロジックのテスト（正常系・異常系）
- `PublicPropertyCard` のレンダリングテスト（`images` あり・なし・`storage_location` あり・なし の組み合わせ）
- `folder-thumbnail` エンドポイントの画像なし時のレスポンス形式テスト（SVG返却）
- `folder-thumbnail` エンドポイントのエラー時のレスポンス形式テスト（SVG返却）

### Property-Based Tests

- ランダムな `storage_location` URL（有効・無効・null）を生成して `PublicPropertyCard` がクラッシュしないことを検証
- ランダムな `images` 配列（空・1件・複数件）と `storage_location` の組み合わせで正しい `<img>` タグが表示されることを検証
- 多様な `folderId` 値で `folder-thumbnail` エンドポイントが常に画像またはSVGを返すことを検証（JSON エラーを返さない）

### Integration Tests

- 一覧ページ（`/public/properties`）で `skipImages=true` でAPIを呼び出し、物件カードに `<img src="/api/public/folder-thumbnail/...">` が表示されることを確認
- `folder-thumbnail` エンドポイントが実際のGoogle Driveフォルダから画像を取得して返すことを確認
- `storage_location` が null の物件カードが「画像なし」ボックスを表示することを確認
- 詳細ページの画像表示が変わらず動作することを確認
