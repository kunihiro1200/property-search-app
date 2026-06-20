# AA13601 画像表示バグ 設計ドキュメント

## Overview

公開物件サイト（`property-site-frontend-kappa.vercel.app`）において、物件AA13601の詳細ページ `/public/properties/AA13601` で「画像がありません」と表示されるバグを修正する。

Google Driveの `athome公開` フォルダには画像が存在しているにもかかわらず、バックエンドの `/api/public/properties/AA13601/images` エンドポイントが空配列 `images: []` を返している。

修正方針は以下の2段階で対応する：
1. **根本原因の特定**: AA13601の `storage_location` がDBに設定されているか確認し、設定されていない場合はフォールバックロジック（`work_tasks` テーブルの `格納先URL`）が正しく機能しているか検証する
2. **フォールバックロジックの修正**: `storage_location` が空の場合に `work_tasks` テーブルから取得するロジック、または `athome_data[0]` からのフォールバックが正しく動作するよう修正する

---

## Glossary

- **Bug_Condition (C)**: AA13601の画像取得リクエストに対して空配列が返される条件 — `storage_location` が空かつフォールバックロジックが失敗している状態
- **Property (P)**: 正しい動作 — `athome公開` フォルダ内の画像が1件以上返される
- **Preservation**: 他の物件（例: AA12649）の画像表示、`storage_location` が正しく設定されている物件の動作が変わらないこと
- **PropertyImageService**: `backend/api/src/services/PropertyImageService.ts` — Google DriveフォルダURLから画像一覧を取得するサービス
- **PropertyListingService**: `backend/api/src/services/PropertyListingService.ts` — 物件データを取得し、`storage_location` の補完ロジックを持つサービス
- **getStorageUrlFromWorkTasks**: `PropertyListingService` 内のプライベートメソッド — `storage_location` が空の場合に業務リスト（業務依頼）スプレッドシートの `格納先URL` カラムから取得する
- **getPublicFolderIdIfExists**: `PropertyImageService` 内のメソッド — 親フォルダ内の `athome公開` または `atbb公開` サブフォルダを検索する
- **athome_data**: `property_details` テーブルのカラム — `[0]` にGoogle DriveフォルダURLまたはパノラマURL、`[1]` にパノラマURLを格納する配列

---

## Bug Details

### Bug Condition

AA13601の画像取得リクエストが空配列を返すバグは、以下のいずれかの条件が成立したときに発生する：

1. `property_listings` テーブルの `storage_location` が空（NULL または空文字列）
2. かつ、`work_tasks` テーブルの `格納先URL` にもAA13601のエントリが存在しない
3. または、`athome_data[0]` が存在しないか、Google DriveフォルダURLの形式でない

**Formal Specification:**
```
FUNCTION isBugCondition(propertyNumber)
  INPUT: propertyNumber = "AA13601"
  OUTPUT: boolean

  storageLocation := DB.property_listings.storage_location WHERE property_number = propertyNumber
  workTasksUrl   := 業務リスト.格納先URL WHERE 物件番号 = propertyNumber
  athomeData     := DB.property_details.athome_data WHERE property_number = propertyNumber

  RETURN (storageLocation IS NULL OR storageLocation = "")
         AND (workTasksUrl IS NULL OR workTasksUrl = "")
         AND (
           athomeData IS NULL
           OR athomeData[0] IS NULL
           OR NOT athomeData[0].contains("/folders/")
         )
END FUNCTION
```

### Examples

- **バグ発生例**: AA13601の `storage_location` がNULL、業務リストにも `格納先URL` なし → `images: []` が返される
- **バグ発生例**: AA13601の `storage_location` がNULL、`athome_data[0]` がパノラマURL（`vrpanorama.athome.jp`）のみ → フォルダIDを抽出できず `images: []` が返される
- **正常例（他物件）**: AA12649の `storage_location` が設定済み → `athome公開` フォルダから画像が返される
- **エッジケース**: `storage_location` が設定されているが、Google DriveフォルダIDの抽出に失敗するURL形式 → `images: []` が返される

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `storage_location` が正しく設定されている他の物件（例: AA12649）の画像表示は変わらない
- `/api/public/properties/:identifier/images` エンドポイントの既存の動作（キャッシュ、非表示画像フィルタリング）は変わらない
- `PropertyImageService.getImagesFromStorageUrl()` の `athome公開` サブフォルダ優先検索ロジックは変わらない
- 公開物件一覧ページのサムネイル画像表示は変わらない

**Scope:**
`storage_location` が正しく設定されている物件、または業務リストに `格納先URL` が存在する物件は、このバグ修正の影響を受けない。

---

## Hypothesized Root Cause

コードの分析から、以下の根本原因が考えられる：

1. **AA13601の `storage_location` がDBに未設定**
   - `property_listings` テーブルの `storage_location` カラムがNULLまたは空文字列
   - 過去にAA12649で同様の問題が発生しており、同じパターンの可能性が高い

2. **業務リスト（業務依頼）スプレッドシートへのフォールバックが失敗**
   - `getStorageUrlFromWorkTasks()` が `GYOMU_LIST_SPREADSHEET_ID` 環境変数を参照
   - AA13601の `物件番号` が業務リストに存在しない、またはスプレッドシートIDが正しくない
   - Google Sheets API認証エラーによりサイレントに `null` を返している可能性

3. **`athome_data[0]` フォールバックが機能しない**
   - `index.ts` の画像エンドポイントでは `property.athome_data[0]` をフォールバックとして使用
   - しかし `athome_data[0]` がパノラマURL（`vrpanorama.athome.jp`）の場合、Google DriveフォルダURLではないため `extractFolderIdFromUrl()` が `null` を返す
   - または `property_details` テーブルに AA13601 のエントリが存在しない

4. **`findFolderByName` での `athome公開` 検索失敗**
   - `storage_location` が設定されていても、Google Driveの `athome公開` サブフォルダ検索が失敗する可能性
   - `corpora: 'drive'` と `driveId` の設定が共有ドライブに対して正しく機能していない可能性

---

## Correctness Properties

Property 1: Bug Condition - AA13601画像取得

_For any_ リクエスト where the bug condition holds（AA13601の `storage_location` が空かつフォールバックが失敗している）, the fixed endpoint SHALL Google Driveの `athome公開` フォルダから1件以上の画像を取得して返す。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - 他物件の画像表示

_For any_ リクエスト where the bug condition does NOT hold（`storage_location` が正しく設定されている物件）, the fixed code SHALL produce the same result as the original code, preserving 既存の画像取得・表示動作。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

---

## Fix Implementation

### Changes Required

根本原因の分析に基づき、以下の修正を行う。修正は段階的に実施し、各段階で動作を確認する。

**Step 1: DBの `storage_location` を確認・設定**

AA13601の `storage_location` がNULLの場合、Google Driveで物件番号フォルダを検索して設定する。

```
// 確認クエリ（Supabase）
SELECT property_number, storage_location, atbb_status
FROM property_listings
WHERE property_number = 'AA13601';
```

`storage_location` がNULLの場合、`PropertyImageService.getImageFolderUrl('AA13601')` を使用してGoogle Driveからフォルダを検索し、DBに保存する。

---

**Step 2: フォールバックロジックの修正（必要な場合）**

**File**: `backend/api/index.ts`

**Function**: `GET /api/public/properties/:identifier/images`

**Specific Changes**:

1. **`athome_data[0]` フォールバックの改善**: `athome_data[0]` がパノラマURLの場合はスキップし、`athome_data` の全要素からGoogle DriveフォルダURLを探す

   ```typescript
   // 現在のコード（問題あり）
   storageUrl = property.athome_data[0];
   
   // 修正後
   const driveUrl = property.athome_data.find(
     (url: string) => typeof url === 'string' && url.includes('/folders/')
   );
   if (driveUrl) storageUrl = driveUrl;
   ```

2. **`storage_location` が空の場合のGoogle Drive自動検索**: `work_tasks` にも存在しない場合、`PropertyImageService.getImageFolderUrl()` でGoogle Driveを検索する

   ```typescript
   if (!storageUrl) {
     const propertyImageService = new PropertyImageService(new GoogleDriveService(), ...);
     storageUrl = await propertyImageService.getImageFolderUrl(property.property_number);
     if (storageUrl) {
       // DBに保存して次回以降のフォールバックを不要にする
       await supabase.from('property_listings')
         .update({ storage_location: storageUrl })
         .eq('id', property.id);
     }
   }
   ```

---

**Step 3: `PropertyListingService.getPublicPropertyByNumber()` の `athome_data` フォールバック改善**

**File**: `backend/api/src/services/PropertyListingService.ts`

`getPublicPropertyByNumber()` が返す `athome_data` は `property_details` テーブルから取得される。AA13601の `property_details` エントリが存在しない場合、`athome_data` は `null` になる。

この場合、`index.ts` の画像エンドポイントでの `athome_data[0]` フォールバックが機能しない。`property_details` テーブルにAA13601のエントリを作成するか、フォールバックロジックを強化する。

---

## Testing Strategy

### Validation Approach

テスト戦略は2フェーズで実施する：
1. **探索フェーズ**: 未修正コードでバグを再現し、根本原因を確認する
2. **修正検証フェーズ**: 修正後にバグが解消され、既存動作が保持されることを確認する

### Exploratory Bug Condition Checking

**Goal**: 未修正コードでバグを再現し、根本原因を特定する。

**Test Plan**: DBの状態を確認し、各フォールバックロジックが実際に機能しているかをログで追跡する。

**Test Cases**:
1. **DBの `storage_location` 確認**: Supabaseで `SELECT storage_location FROM property_listings WHERE property_number = 'AA13601'` を実行（NULLの場合はバグ確定）
2. **業務リストフォールバック確認**: `getStorageUrlFromWorkTasks('AA13601')` の戻り値をログで確認（nullの場合はフォールバック失敗）
3. **`athome_data` 確認**: `SELECT athome_data FROM property_details WHERE property_number = 'AA13601'` を実行（NULLまたはパノラマURLのみの場合はフォールバック失敗）
4. **エンドポイント直接呼び出し**: `GET /api/public/properties/AA13601/images` を呼び出してログを確認

**Expected Counterexamples**:
- `storage_location` がNULLで、業務リストにも存在しない → `storageUrl` が `undefined` のまま404を返す
- または `athome_data[0]` がパノラマURLのため `extractFolderIdFromUrl()` が `null` を返す → `images: []` を返す

### Fix Checking

**Goal**: 修正後、AA13601の画像が正しく返されることを確認する。

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := GET /api/public/properties/AA13601/images
  ASSERT result.images.length > 0
  ASSERT result.images[0].thumbnailUrl IS NOT NULL
END FOR
```

### Preservation Checking

**Goal**: 修正後、他の物件の画像取得動作が変わらないことを確認する。

**Pseudocode:**
```
FOR ALL propertyNumber WHERE NOT isBugCondition(propertyNumber) DO
  result_original := GET /api/public/properties/{propertyNumber}/images (before fix)
  result_fixed    := GET /api/public/properties/{propertyNumber}/images (after fix)
  ASSERT result_original.images.length = result_fixed.images.length
END FOR
```

**Testing Approach**: 既存の動作するプロパティ（AA12649など）で修正前後の結果を比較する。

**Test Cases**:
1. **AA12649の画像取得保持**: 修正前後で同じ画像数が返されることを確認
2. **`storage_location` 設定済み物件の動作保持**: 複数の物件で修正前後の動作が同一であることを確認
3. **キャッシュ動作の保持**: 2回目のリクエストで `cached: true` が返されることを確認
4. **非表示画像フィルタリングの保持**: `includeHidden=false` の場合に非表示画像が除外されることを確認

### Unit Tests

- `PropertyImageService.extractFolderIdFromUrl()` のURL形式バリエーションテスト
- `PropertyImageService.getPublicFolderIdIfExists()` の `athome公開` 検索テスト
- `PropertyListingService.getStorageUrlFromWorkTasks()` のキャッシュ動作テスト
- `index.ts` の画像エンドポイントにおける `athome_data` フォールバックロジックテスト

### Property-Based Tests

- ランダムなGoogle DriveフォルダURLに対して `extractFolderIdFromUrl()` が正しくフォルダIDを抽出することを検証
- `storage_location` が空の物件に対して、フォールバックロジックが正しく動作することを検証（多様な `athome_data` 構造に対して）
- 修正後、`storage_location` が設定されている全物件で画像取得が保持されることを検証

### Integration Tests

- AA13601の詳細ページ（`/public/properties/AA13601`）で画像が表示されることを確認
- 修正後にDBの `storage_location` が自動設定される場合、次回リクエストでキャッシュが機能することを確認
- 公開物件一覧ページでAA13601のサムネイルが表示されることを確認
