# AA3959 画像表示バグ 修正設計

## Overview

公開物件サイトで物件AA3959の画像が表示されない問題を修正する。
Google Drive の `AA3959_火売土地_杉田...` フォルダ内の `athome公開` サブフォルダには画像が存在しているにもかかわらず、`/api/public/properties/AA3959/images` が空配列を返す。

根本原因の候補は3つある：
1. `storage_location` がDBに未設定（最も可能性が高い）
2. `findFolderByName` による `athome公開` フォルダ検索が共有ドライブのパラメータ問題で失敗
3. `searchFolderByName` による物件番号フォルダ検索が共有ドライブ検索時に機能していない

修正方針は、まず探索的テストで根本原因を特定し、最小限の変更で修正する。

## Glossary

- **Bug_Condition (C)**: 物件AA3959の画像取得リクエストで空配列が返される条件
- **Property (P)**: 画像取得リクエストに対して `athome公開` フォルダ内の画像一覧が返されるべき正しい動作
- **Preservation**: 他の物件（AA12649など）の画像取得、`atbb公開` フォルダからの取得、`athome公開` フォルダが存在しない物件の動作など、変更してはならない既存の挙動
- **PropertyImageService**: `backend/api/src/services/PropertyImageService.ts` の画像取得サービス。`storage_location` URLからフォルダIDを抽出し、`athome公開` サブフォルダを検索して画像を返す
- **GoogleDriveService**: `backend/api/src/services/GoogleDriveService.ts` のGoogle Drive連携サービス。`findFolderByName`（親フォルダ内検索）と `searchFolderByName`（ルートレベル検索）を提供する
- **storage_location**: DBの `property_listings` テーブルに保存されるGoogle DriveフォルダURL。画像取得の起点となる
- **parentFolderId**: `GOOGLE_DRIVE_PARENT_FOLDER_ID` 環境変数で設定される共有ドライブのルートフォルダID

## Bug Details

### Bug Condition

物件AA3959の画像取得リクエストで空配列が返される。`PropertyImageService.getImagesFromStorageUrl()` が `athome公開` フォルダを見つけられないか、そもそも `storage_location` が未設定のため処理が開始されない。

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { propertyNumber: string }
  OUTPUT: boolean

  RETURN input.propertyNumber = 'AA3959'
         AND (
           storage_location IS NULL OR storage_location IS EMPTY
           OR findFolderByName(storage_location_folder_id, 'athome公開') RETURNS NULL
           OR searchFolderByName('AA3959') RETURNS NULL
         )
         AND imagesResult.images.length = 0
END FUNCTION
```

### Examples

- **例1（バグあり）**: `GET /api/public/properties/AA3959/images` → `{ images: [], folderId: null }` （storage_location未設定の場合）
- **例2（バグあり）**: `storage_location` が設定されていても `findFolderByName` が `athome公開` を見つけられず → `{ images: [], folderId: 親フォルダID }`
- **例3（バグあり）**: `searchFolderByName('AA3959')` が共有ドライブで `null` を返す → `storage_location` が自動設定されない
- **例4（正常）**: `storage_location` が正しく設定され `findFolderByName` が成功 → `{ images: [画像一覧], folderId: athome公開のID }`

## Expected Behavior

### Preservation Requirements

**変更してはならない挙動:**
- `storage_location` が正しく設定されている他の物件（例: AA12649）の画像取得は引き続き正常に動作する
- `athome公開` フォルダが存在しない物件では引き続き「画像がありません」と表示される（エラーなし）
- `atbb公開` フォルダのみが存在する物件では引き続き `atbb公開` フォルダから画像を取得して表示する
- 複数の物件の画像を一覧ページで取得する際のサムネイル表示は引き続き正常に動作する

**スコープ:**
物件AA3959以外の物件、および `storage_location` が正しく設定されている物件の動作は、この修正によって一切影響を受けてはならない。

## Hypothesized Root Cause

根本原因の候補を優先度順に列挙する：

1. **`storage_location` がDBに未設定（最有力）**: AA3959の `property_listings` レコードに `storage_location` カラムが `NULL` または空文字列のまま。`getImagesFromStorageUrl(null)` は即座に空配列を返す。`getImageFolderUrl` による自動設定が実行されていないか、`searchFolderByName` が失敗している可能性がある。

2. **`searchFolderByName` の共有ドライブ検索失敗**: `searchFolderByName` はまずマイドライブを検索し、見つからなければ `corpora: 'allDrives'` で共有ドライブを検索する。しかし `corpora: 'allDrives'` は `driveId` を指定しない全ドライブ検索であり、権限の問題や検索結果の制限で `AA3959` フォルダが見つからない可能性がある。

3. **`findFolderByName` の共有ドライブパラメータ問題**: `findFolderByName` は `isSharedDrive=true` かつ `this.parentFolderId` が設定されている場合に `corpora: 'drive'` と `driveId: this.parentFolderId` を使用する。しかし `athome公開` フォルダの親（AA3959フォルダ）が共有ドライブの直下でない場合、`driveId` の指定が検索を制限してしまう可能性がある。

4. **`findFolderByName` の前方一致ロジック問題**: `findFolderByName` は `name contains 'athome公開'` で検索後、`f.name?.startsWith(name)` で前方一致フィルタリングを行う。`athome公開` は前方一致でも完全一致でも問題ないはずだが、フォルダ名に予期しない文字が含まれている場合に失敗する可能性がある。

## Correctness Properties

Property 1: Bug Condition - AA3959の画像取得が正しく動作する

_For any_ リクエストで物件番号 `AA3959` の画像一覧を取得する場合、修正後の処理は Google Drive の `AA3959_火売土地_杉田...` フォルダ内の `athome公開` サブフォルダを正しく特定し、`0412 区画 AA3959.jpg` などの画像ファイルを含む非空の配列を返す SHALL。

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - 他の物件の画像取得動作が変わらない

_For any_ リクエストで物件番号が `AA3959` 以外の物件の画像一覧を取得する場合、修正後の処理は修正前と同一の結果を返す SHALL。具体的には、`storage_location` が設定済みの物件は引き続き正常に画像を返し、`athome公開` フォルダが存在しない物件は引き続き空配列を返す。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

根本原因の特定後、以下のいずれかの変更を実施する：

**ケース1: `storage_location` が未設定の場合**

**File**: `backend/api/index.ts` または DB直接更新スクリプト

**Specific Changes**:
1. **DBへの `storage_location` 設定**: AA3959の `property_listings` レコードに `storage_location` を手動または自動で設定する
   - `getImageFolderUrl('AA3959')` を呼び出して `storage_location` を取得・保存する
   - または管理画面から手動でGoogle DriveフォルダURLを設定する

---

**ケース2: `searchFolderByName` の共有ドライブ検索が失敗している場合**

**File**: `backend/api/src/services/GoogleDriveService.ts`

**Function**: `searchFolderByName`

**Specific Changes**:
1. **共有ドライブ検索の改善**: `corpora: 'allDrives'` の代わりに `corpora: 'drive'` と `driveId: this.parentFolderId` を使用して特定の共有ドライブを検索する
   ```typescript
   // 修正前
   corpora: 'allDrives',
   
   // 修正後
   corpora: 'drive',
   driveId: this.parentFolderId,
   ```

---

**ケース3: `findFolderByName` の共有ドライブパラメータが問題の場合**

**File**: `backend/api/src/services/GoogleDriveService.ts`

**Function**: `findFolderByName`

**Specific Changes**:
1. **`driveId` 指定の見直し**: `athome公開` フォルダの検索時に `driveId` を指定すると、共有ドライブのルート直下のフォルダしか検索できない場合がある。`corpora: 'allDrives'` に変更するか、`driveId` なしで検索する
   ```typescript
   // 修正案
   if (isSharedDrive) {
     queryParams.supportsAllDrives = true;
     queryParams.includeItemsFromAllDrives = true;
     queryParams.corpora = 'allDrives';
     // driveId を削除（または条件付きで設定）
   }
   ```

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで実施する：まず探索的テストでバグを再現・根本原因を特定し、次に修正後の動作確認と既存動作の保全確認を行う。

### Exploratory Bug Condition Checking

**Goal**: 修正前のコードでバグを再現し、根本原因を特定する。

**Test Plan**: DBの `storage_location` 値を確認し、Google Drive API呼び出しをシミュレートして失敗箇所を特定する。

**Test Cases**:
1. **DBの `storage_location` 確認テスト**: AA3959の `property_listings` レコードを取得し、`storage_location` が設定されているか確認する（未設定なら根本原因1が確定）
2. **`searchFolderByName` テスト**: `searchFolderByName('AA3959')` を実行し、共有ドライブでフォルダが見つかるか確認する（失敗なら根本原因3が確定）
3. **`findFolderByName` テスト**: AA3959フォルダIDを使って `findFolderByName(folderId, 'athome公開')` を実行し、サブフォルダが見つかるか確認する（失敗なら根本原因2が確定）
4. **エンドポイント直接テスト**: `/api/public/properties/AA3959/images` を呼び出し、レスポンスとサーバーログを確認する

**Expected Counterexamples**:
- `storage_location` が `NULL` → 即座に空配列が返される
- `searchFolderByName` が `null` を返す → `storage_location` が自動設定されない
- `findFolderByName` が `null` を返す → `athome公開` フォルダが見つからず親フォルダにフォールバック

### Fix Checking

**Goal**: 修正後、バグ条件が成立する全ての入力に対して正しい動作が確認できること。

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := getImagesFromStorageUrl_fixed(input.storageUrl)
  ASSERT result.images.length > 0
  ASSERT result.images[0].name CONTAINS 'AA3959'
  ASSERT result.folderId IS NOT NULL
END FOR
```

### Preservation Checking

**Goal**: バグ条件が成立しない全ての入力に対して、修正前後で同一の結果が返されること。

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT getImagesFromStorageUrl_original(input) = getImagesFromStorageUrl_fixed(input)
END FOR
```

**Testing Approach**: プロパティベーステストを推奨する。理由：
- 多様な物件番号・フォルダ構成に対して自動的にテストケースを生成できる
- 手動テストでは見落としがちなエッジケース（`atbb公開` のみ存在、サブフォルダなし、など）を網羅できる
- 修正が他の物件に影響を与えていないことを強く保証できる

**Test Cases**:
1. **既存物件の保全テスト**: `storage_location` が設定済みの物件（例: AA12649）で画像取得が引き続き正常に動作することを確認
2. **`atbb公開` フォルダ保全テスト**: `atbb公開` フォルダのみ存在する物件で引き続き正常に画像が取得されることを確認
3. **`athome公開` なし保全テスト**: `athome公開` フォルダが存在しない物件で引き続き空配列が返されることを確認
4. **一覧ページ保全テスト**: 複数物件のサムネイル取得が引き続き正常に動作することを確認

### Unit Tests

- `extractFolderIdFromUrl` のURL形式バリエーションテスト
- `findFolderByName` の共有ドライブパラメータ設定テスト
- `searchFolderByName` のマイドライブ→共有ドライブフォールバックテスト
- `getPublicFolderIdIfExists` の検索順序テスト（athome公開 → atbb公開 → 親フォルダ）

### Property-Based Tests

- ランダムな物件番号に対して `searchFolderByName` が一貫した結果を返すことを検証
- ランダムなフォルダ構成（athome公開あり/なし、atbb公開あり/なし）に対して `getPublicFolderIdIfExists` が正しいフォルダIDを返すことを検証
- 修正前後で `storage_location` が設定済みの物件の画像取得結果が変わらないことを検証

### Integration Tests

- AA3959の画像取得エンドポイント（`/api/public/properties/AA3959/images`）が非空の画像配列を返すことを確認
- AA3959の詳細ページ（`/public/properties/AA3959`）で画像が表示されることを確認
- 修正後も他の物件（AA12649など）の画像取得が正常に動作することを確認
