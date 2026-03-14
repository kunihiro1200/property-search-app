# 公開物件サイト一覧ページ 画像表示バグ 設計ドキュメント

## Overview

公開物件サイト（`/public/properties`）の一覧ページで、物件カードの画像がグレーのプレースホルダーになるバグを修正する。

根本原因は `backend/api/src/services/PropertyImageService.ts` の `convertToPropertyImages()` メソッドが `thumbnailUrl` を生成する際に `process.env.BACKEND_URL || 'http://localhost:3000'` を使用していることにある。Vercel 本番環境でこの環境変数が未設定の場合、到達不能な `http://localhost:3000/api/public/images/{fileId}/thumbnail` というURLが生成され、フロントエンドの画像読み込みが失敗する。

修正方針は、`BACKEND_URL` 環境変数への依存を排除し、フロントエンドが相対URLを使用するか、バックエンドがリクエストのオリジンから動的にベースURLを生成するように変更する。

## Glossary

- **Bug_Condition (C)**: `convertToPropertyImages()` が `BACKEND_URL` 未設定の環境で呼ばれ、`thumbnailUrl` に `http://localhost:3000` が含まれる状態
- **Property (P)**: 生成された `thumbnailUrl` がフロントエンドから到達可能なURLであること
- **Preservation**: 既存の画像プロキシエンドポイント（`/api/public/images/:fileId/thumbnail`）の動作、ローカル環境での動作、詳細ページの画像表示
- **convertToPropertyImages()**: `backend/api/src/services/PropertyImageService.ts` 内のメソッド。`DriveFile[]` を `PropertyImage[]` に変換し、`thumbnailUrl` と `fullImageUrl` を生成する
- **thumbnailUrl**: フロントエンドの `PublicPropertyCard` が `<img src>` に設定するURL。バックエンドの画像プロキシエンドポイントを指す
- **BACKEND_URL**: Vercel 本番環境で未設定の場合がある環境変数。未設定時は `http://localhost:3000` にフォールバックする

## Bug Details

### Fault Condition

バグは `convertToPropertyImages()` が呼ばれ、かつ `BACKEND_URL` 環境変数が未設定または誤った値の場合に発生する。生成された `thumbnailUrl` が `http://localhost:3000` を含む場合、フロントエンドからは到達不能となる。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { driveFiles: DriveFile[], env: NodeJS.ProcessEnv }
  OUTPUT: boolean
  
  baseUrl = input.env.BACKEND_URL || 'http://localhost:3000'
  
  RETURN baseUrl.startsWith('http://localhost')
         AND input.driveFiles.length > 0
END FUNCTION
```

### Examples

- **本番環境・BACKEND_URL未設定**: `thumbnailUrl = "http://localhost:3000/api/public/images/abc123/thumbnail"` → フロントエンドから到達不能 → 画像表示失敗
- **本番環境・BACKEND_URL設定済み**: `thumbnailUrl = "https://property-site-frontend-kappa.vercel.app/api/public/images/abc123/thumbnail"` → 正常に表示
- **ローカル環境**: `thumbnailUrl = "http://localhost:3000/api/public/images/abc123/thumbnail"` → ローカルでは到達可能 → 正常に表示（バグ条件に該当しない）
- **画像なし物件**: `driveFiles = []` → `thumbnailUrl` は生成されない → バグ条件に該当しない

## Expected Behavior

### Preservation Requirements

**変更してはいけない動作:**
- ローカル環境（`localhost:5173` + `localhost:3000`）での画像表示
- 画像プロキシエンドポイント（`GET /api/public/images/:fileId/thumbnail`）の動作
- `image_url` が直接設定されている物件の表示
- 画像なし物件のプレースホルダー表示
- 公開物件詳細ページ（`/public/properties/:id`）の画像表示
- `skipImages=true` パラメータでの高速レスポンス

**スコープ:**
`convertToPropertyImages()` メソッドの `thumbnailUrl` / `fullImageUrl` 生成ロジックのみを変更する。Google Drive からの画像取得ロジック、キャッシュロジック、その他のメソッドは変更しない。

## Hypothesized Root Cause

確定した根本原因:

1. **BACKEND_URL 環境変数の未設定**: Vercel 本番環境の環境変数に `BACKEND_URL` が設定されていない。`process.env.BACKEND_URL || 'http://localhost:3000'` のフォールバックが `http://localhost:3000` を返す。

2. **フロントエンドとバックエンドが同一オリジン**: Vercel では `property-site-frontend` プロジェクトにフロントエンドとバックエンドが同居しており、`/api/*` は相対パスで到達可能。絶対URLを生成する必要がない。

3. **コメントの誤解**: コード内のコメント「フロントエンドとバックエンドは常に別オリジン（ローカルでも5173と3000）」は正しいが、本番環境では同一オリジンのため `BACKEND_URL` を設定しなくても相対URLで動作する。

## Correctness Properties

Property 1: Fault Condition - thumbnailUrl が到達可能なURLを生成する

_For any_ `DriveFile[]` の入力に対して、修正後の `convertToPropertyImages()` が生成する `thumbnailUrl` は、`http://localhost` を含まず、フロントエンドから到達可能なパス（相対URLまたは正しい絶対URL）であること。

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - ローカル環境での動作が維持される

_For any_ ローカル環境（`BACKEND_URL` が `http://localhost:3000` に設定されている、またはリクエストが `localhost` から来る）での呼び出しに対して、修正後の `convertToPropertyImages()` は修正前と同じ `thumbnailUrl` を生成すること。

**Validates: Requirements 3.1, 3.4**

## Fix Implementation

### Changes Required

**File**: `backend/api/src/services/PropertyImageService.ts`

**Function**: `convertToPropertyImages(driveFiles: DriveFile[])`

**修正方針: 相対URLを使用する**

Vercel 環境ではフロントエンドとバックエンドが同一オリジンのため、`thumbnailUrl` に絶対URLは不要。相対URL（`/api/public/images/{fileId}/thumbnail`）を使用することで、環境変数への依存を完全に排除できる。

**Specific Changes**:

1. **`convertToPropertyImages()` の修正**:
   ```typescript
   // 修正前
   const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
   return driveFiles.map(file => ({
     ...
     thumbnailUrl: `${baseUrl}/api/public/images/${file.id}/thumbnail`,
     fullImageUrl: `${baseUrl}/api/public/images/${file.id}`,
   }));
   
   // 修正後
   return driveFiles.map(file => ({
     ...
     thumbnailUrl: `/api/public/images/${file.id}/thumbnail`,
     fullImageUrl: `/api/public/images/${file.id}`,
   }));
   ```

2. **`getFirstImage()` の修正**:
   キャッシュヒット時とキャッシュミス時の両方で `baseUrl` を使用している箇所を相対URLに変更する。
   ```typescript
   // 修正前
   const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
   return [`${baseUrl}/api/public/images/${cachedEntry.images[0].id}/thumbnail`];
   
   // 修正後
   return [`/api/public/images/${cachedEntry.images[0].id}/thumbnail`];
   ```

3. **コメントの更新**: 誤解を招くコメント「フロントエンドとバックエンドは常に別オリジン」を削除し、相対URLを使用する理由を記述する。

**変更しないファイル:**
- `backend/api/index.ts`（画像プロキシエンドポイントは変更不要）
- `frontend/` 以下のファイル（フロントエンドは `<img src>` に渡すだけ）
- `backend/src/` 以下のファイル（売主管理システムは別バックエンド）

## Testing Strategy

### Validation Approach

2フェーズのアプローチ: まず未修正コードでバグを再現し、次に修正後の動作と既存動作の保存を検証する。

### Exploratory Fault Condition Checking

**Goal**: 未修正コードで `BACKEND_URL` 未設定時に `localhost` URLが生成されることを確認する。

**Test Plan**: `convertToPropertyImages()` を `BACKEND_URL` 未設定の状態で呼び出し、生成された `thumbnailUrl` が `http://localhost:3000` を含むことを確認する。

**Test Cases**:
1. **BACKEND_URL未設定テスト**: `process.env.BACKEND_URL` を削除した状態で `convertToPropertyImages([{id: 'abc123', ...}])` を呼び出す → `thumbnailUrl` が `http://localhost:3000/api/public/images/abc123/thumbnail` になることを確認（未修正コードで失敗するはず）
2. **BACKEND_URL設定済みテスト**: `process.env.BACKEND_URL = 'https://example.vercel.app'` を設定した状態で呼び出す → `thumbnailUrl` が `https://example.vercel.app/api/public/images/abc123/thumbnail` になることを確認
3. **空配列テスト**: `convertToPropertyImages([])` を呼び出す → 空配列が返ることを確認

**Expected Counterexamples**:
- `thumbnailUrl` が `http://localhost:3000` を含む → バグ条件が確認される
- フロントエンドが `http://localhost:3000` へのリクエストを試みて失敗する

### Fix Checking

**Goal**: 修正後、`BACKEND_URL` の設定に関わらず到達可能なURLが生成されることを検証する。

**Pseudocode:**
```
FOR ALL driveFiles WHERE isBugCondition({ driveFiles, env: { BACKEND_URL: undefined } }) DO
  result := convertToPropertyImages_fixed(driveFiles)
  ASSERT NOT result[0].thumbnailUrl.startsWith('http://localhost')
  ASSERT result[0].thumbnailUrl.startsWith('/api/public/images/')
END FOR
```

### Preservation Checking

**Goal**: 修正後も既存の動作が変わらないことを検証する。

**Pseudocode:**
```
FOR ALL driveFiles WHERE NOT isBugCondition({ driveFiles, env }) DO
  result_original := convertToPropertyImages_original(driveFiles)
  result_fixed := convertToPropertyImages_fixed(driveFiles)
  ASSERT result_fixed[i].id = result_original[i].id
  ASSERT result_fixed[i].name = result_original[i].name
  ASSERT result_fixed[i].mimeType = result_original[i].mimeType
  -- thumbnailUrlのパス部分（/api/public/images/{id}/thumbnail）は同一
  ASSERT result_fixed[i].thumbnailUrl.endsWith(result_original[i].thumbnailUrl.split('/api')[1])
END FOR
```

**Testing Approach**: プロパティベーステストを推奨。任意の `DriveFile[]` に対して、修正後の `thumbnailUrl` が常に `/api/public/images/` で始まることを検証できる。

**Test Cases**:
1. **ローカル環境保存テスト**: ローカル環境でも相対URLが生成され、ブラウザが正しく解決することを確認
2. **詳細ページ保存テスト**: `getImagesFromStorageUrl()` が呼ばれる詳細ページでも同じ修正が適用されることを確認
3. **キャッシュ動作保存テスト**: キャッシュヒット時の `getFirstImage()` でも相対URLが返ることを確認

### Unit Tests

- `convertToPropertyImages()` が相対URLを生成することを確認
- `getFirstImage()` のキャッシュヒット・ミス両方で相対URLが返ることを確認
- `BACKEND_URL` 環境変数の有無に関わらず同じ相対URLが生成されることを確認

### Property-Based Tests

- 任意の `DriveFile[]` に対して、`thumbnailUrl` が常に `/api/public/images/{id}/thumbnail` の形式であることを検証
- 任意の `DriveFile[]` に対して、`fullImageUrl` が常に `/api/public/images/{id}` の形式であることを検証
- `id` フィールドが `thumbnailUrl` に正しく含まれることを検証

### Integration Tests

- Vercel 本番環境で `GET /api/public/properties` を呼び出し、レスポンスの `images[0].thumbnailUrl` が `/api/public/images/` で始まることを確認
- フロントエンドの `PublicPropertyCard` が相対URLで画像を正しく表示することを確認
- `GET /api/public/images/:fileId/thumbnail` エンドポイントが引き続き正常に動作することを確認
