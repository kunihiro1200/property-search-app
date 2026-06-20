# 実装計画

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - AA13601 画像取得空配列バグ
  - **重要**: このテストは修正前のコードで実行し、**必ず失敗することを確認する**（失敗 = バグの存在を証明）
  - **目的**: バグが存在することを示すカウンターサンプルを発見する
  - **スコープ付きPBTアプローチ**: 決定論的バグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象: `GET /api/public/properties/AA13601/images` エンドポイント
  - バグ条件（design.mdより）: `storage_location` が NULL かつ `work_tasks` にも格納先URLなし かつ `athome_data[0]` がGoogle DriveフォルダURLでない
  - テストアサーション: `result.images.length > 0` かつ `result.images[0].thumbnailUrl` が存在する
  - 未修正コードで実行 → **失敗が期待される結果**（バグの存在を確認）
  - カウンターサンプルを記録する（例: `storage_location=NULL` の状態で `images: []` が返される）
  - テスト作成・実行・失敗確認後にタスク完了とする
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 2. 保全プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - storage_location設定済み物件の画像表示保全
  - **重要**: 観察優先メソドロジーに従う
  - 未修正コードで非バグ条件の入力（`storage_location` が設定済みの物件）を観察する
  - 観察: AA12649など `storage_location` が設定済みの物件で `GET /api/public/properties/AA12649/images` を呼び出す
  - 観察: `images.length > 0` かつ `cached: false/true` が返されることを確認
  - プロパティベーステスト: `storage_location` が設定済みの全物件で、修正前後で同じ画像数が返されることを検証
  - 未修正コードで実行 → **成功が期待される結果**（ベースライン動作の確認）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [-] 3. AA13601 画像表示バグの修正

  - [x] 3.1 DBの `storage_location` を確認・設定する
    - Supabaseで `SELECT property_number, storage_location FROM property_listings WHERE property_number = 'AA13601'` を実行
    - `storage_location` が NULL の場合、`PropertyImageService.getImageFolderUrl('AA13601')` でGoogle Driveからフォルダを検索
    - 見つかった場合、`UPDATE property_listings SET storage_location = '<url>' WHERE property_number = 'AA13601'` でDBに保存
    - **修正対象**: `backend/api/` のみ（`backend/src/` は触らない）
    - _Bug_Condition: isBugCondition(input) where storage_location IS NULL AND workTasksUrl IS NULL AND athome_data[0] does not contain '/folders/'_
    - _Expected_Behavior: images.length > 0 AND images[0].thumbnailUrl IS NOT NULL_
    - _Preservation: storage_location が設定済みの他物件の動作は変わらない_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 `athome_data` フォールバックロジックを改善する（`backend/api/index.ts`）
    - `GET /api/public/properties/:identifier/images` エンドポイントの `storageUrl` 取得ロジックを修正
    - 現在のコード: `storageUrl = property.athome_data[0]`（パノラマURLの場合に失敗）
    - 修正後: `athome_data` の全要素から `/folders/` を含むGoogle DriveフォルダURLを探す
    ```typescript
    // 修正後
    const driveUrl = property.athome_data?.find(
      (url: string) => typeof url === 'string' && url.includes('/folders/')
    );
    if (driveUrl) storageUrl = driveUrl;
    ```
    - _Bug_Condition: athome_data[0] が vrpanorama.athome.jp のパノラマURLの場合_
    - _Expected_Behavior: athome_data の全要素を検索して Google Drive フォルダURLを見つける_
    - _Requirements: 2.3_

  - [x] 3.3 `storage_location` が空の場合のGoogle Drive自動検索フォールバックを追加する（`backend/api/index.ts`）
    - `work_tasks` にも存在しない場合、`PropertyImageService.getImageFolderUrl()` でGoogle Driveを検索する
    - 見つかった場合、DBの `storage_location` を自動更新して次回以降のフォールバックを不要にする
    ```typescript
    if (!storageUrl) {
      const propertyImageService = new PropertyImageService(new GoogleDriveService(), ...);
      storageUrl = await propertyImageService.getImageFolderUrl(property.property_number);
      if (storageUrl) {
        await supabase.from('property_listings')
          .update({ storage_location: storageUrl })
          .eq('id', property.id);
      }
    }
    ```
    - _Bug_Condition: storage_location IS NULL AND workTasksUrl IS NULL AND athome_data に /folders/ URLなし_
    - _Expected_Behavior: Google Drive検索でフォルダを発見し、DBに保存して画像を返す_
    - _Requirements: 2.3, 2.4_

  - [x] 3.4 バグ条件探索テストが通過することを確認する
    - **Property 1: Expected Behavior** - AA13601 画像取得空配列バグ
    - **重要**: タスク1で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - タスク1のテストは期待される動作をエンコードしている
    - このテストが通過すれば、バグが修正されたことを確認できる
    - `GET /api/public/properties/AA13601/images` が `images.length > 0` を返すことを確認
    - **期待される結果**: テスト**成功**（バグが修正されたことを証明）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 保全テストが引き続き通過することを確認する
    - **Property 2: Preservation** - storage_location設定済み物件の画像表示保全
    - **重要**: タスク2で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - AA12649など `storage_location` が設定済みの物件で画像取得が変わらないことを確認
    - キャッシュ動作（2回目のリクエストで `cached: true`）が保持されることを確認
    - **期待される結果**: テスト**成功**（リグレッションなし）

- [x] 4. チェックポイント - 全テストの通過確認
  - タスク1のバグ条件テストが通過することを確認する
  - タスク2の保全テストが通過することを確認する
  - AA13601の詳細ページ（`/public/properties/AA13601`）で画像が表示されることをブラウザで確認する
  - 他の物件（AA12649など）の画像表示が変わらないことを確認する
  - 疑問点があればユーザーに確認する
