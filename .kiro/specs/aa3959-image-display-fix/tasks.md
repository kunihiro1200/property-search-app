# 実装計画

- [x] 1. バグ条件の探索的テストを作成する
  - **Property 1: Bug Condition** - AA3959 画像取得が空配列を返す
  - **重要**: このテストは修正前のコードで実行し、**必ず FAIL すること**（バグの存在を確認）
  - **目的**: バグが存在することを示すカウンターエグザンプルを発見する
  - **スコープ付き PBT アプローチ**: 決定論的バグのため、具体的な失敗ケースにスコープを絞る
  - テスト内容: `GET /api/public/properties/AA3959/images` を呼び出し、レスポンスを確認する
  - 確認項目1: DBの `property_listings` テーブルで AA3959 の `storage_location` が NULL または空文字列か確認する（根本原因1の特定）
  - 確認項目2: `storage_location` が設定されている場合、`searchFolderByName('AA3959')` が共有ドライブで `null` を返すか確認する（根本原因3の特定）
  - 確認項目3: AA3959フォルダIDが取得できた場合、`findFolderByName(folderId, 'athome公開')` が `null` を返すか確認する（根本原因2の特定）
  - テストアサーション: `result.images.length === 0`（バグ条件: `isBugCondition(input)` where `input.propertyNumber = 'AA3959'`）
  - 修正前のコードで実行 → **FAIL が期待される結果**（バグの存在を証明）
  - 発見したカウンターエグザンプルを記録する（例: `storage_location = NULL` → 即座に空配列が返される）
  - タスク完了条件: テストを作成し、実行し、失敗を記録したとき
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 保全プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - 他の物件の画像取得動作が変わらない
  - **重要**: 観察優先メソドロジーに従う
  - 観察: 修正前のコードで `storage_location` が設定済みの物件（例: AA12649）の画像取得が正常に動作することを確認する
  - 観察: `athome公開` フォルダが存在しない物件で空配列が返されることを確認する
  - 観察: `atbb公開` フォルダのみ存在する物件で `atbb公開` から画像が取得されることを確認する
  - プロパティベーステスト: `isBugCondition(input)` が false（`input.propertyNumber !== 'AA3959'`）の全ての入力に対して、修正前後で同一の結果が返されることを検証する
  - テスト内容: `storage_location` が設定済みの物件で `getImagesFromStorageUrl(storageUrl)` が非空の配列を返すことを確認する
  - テスト内容: `athome公開` フォルダが存在しない物件で空配列が返されることを確認する（エラーなし）
  - テスト内容: `atbb公開` フォルダのみ存在する物件で `atbb公開` から画像が取得されることを確認する
  - 修正前のコードで実行 → **PASS が期待される結果**（ベースライン動作の確認）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. AA3959 画像表示バグの修正

  - [x] 3.1 根本原因を特定して修正を実装する
    - タスク1の探索的テストの結果に基づいて、以下のいずれかの修正を実施する
    - **ケース1（最有力）: `storage_location` が未設定の場合**
      - `backend/api/index.ts` の `/api/public/properties/:identifier/images` エンドポイントで、`storage_location` が空の場合に `getImageFolderUrl('AA3959')` を呼び出して自動設定するロジックを追加する
      - または、DBに直接 `storage_location` を設定するスクリプトを実行する
    - **ケース2: `searchFolderByName` の共有ドライブ検索が失敗している場合**
      - `backend/api/src/services/GoogleDriveService.ts` の `searchFolderByName` メソッドで、共有ドライブ検索時に `corpora: 'allDrives'` の代わりに `corpora: 'drive'` と `driveId: this.parentFolderId` を使用するよう修正する
    - **ケース3: `findFolderByName` の共有ドライブパラメータが問題の場合**
      - `backend/api/src/services/GoogleDriveService.ts` の `findFolderByName` メソッドで、`driveId` 指定を削除して `corpora: 'allDrives'` に変更する
    - _Bug_Condition: `isBugCondition(input)` where `input.propertyNumber = 'AA3959'` AND (`storage_location IS NULL` OR `findFolderByName RETURNS NULL` OR `searchFolderByName RETURNS NULL`)_
    - _Expected_Behavior: `getImagesFromStorageUrl(storageUrl).images.length > 0` AND `images[0].name CONTAINS 'AA3959'` AND `folderId IS NOT NULL`_
    - _Preservation: `storage_location` が設定済みの他の物件の画像取得は引き続き正常に動作する。`athome公開` フォルダが存在しない物件は引き続き空配列を返す。`atbb公開` フォルダのみ存在する物件は引き続き `atbb公開` から画像を取得する_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 バグ条件の探索的テストが PASS することを確認する
    - **Property 1: Expected Behavior** - AA3959 画像取得が正しく動作する
    - **重要**: タスク1で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - タスク1のテストは期待される動作をエンコードしている
    - このテストが PASS すれば、バグが修正されたことを確認できる
    - `GET /api/public/properties/AA3959/images` が非空の画像配列を返すことを確認する
    - `result.images.length > 0` であることを確認する
    - `result.folderId` が null でないことを確認する
    - **期待される結果**: テストが PASS（バグが修正されたことを証明）
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 保全テストが引き続き PASS することを確認する
    - **Property 2: Preservation** - 他の物件の画像取得動作が変わらない
    - **重要**: タスク2で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - 修正後も他の物件（AA12649など）の画像取得が正常に動作することを確認する
    - 修正後も `athome公開` フォルダが存在しない物件で空配列が返されることを確認する
    - 修正後も `atbb公開` フォルダのみ存在する物件で正常に画像が取得されることを確認する
    - **期待される結果**: 全テストが PASS（リグレッションなし）

- [x] 4. チェックポイント - 全テストが PASS することを確認する
  - タスク1のバグ条件テストが PASS することを確認する（修正後）
  - タスク2の保全テストが全て PASS することを確認する（リグレッションなし）
  - 本番環境（Vercel）で `https://property-site-frontend-kappa.vercel.app/public/properties/AA3959` にアクセスして画像が表示されることを確認する
  - 他の物件の詳細ページでも画像が引き続き正常に表示されることを確認する
  - 疑問点があればユーザーに確認する
