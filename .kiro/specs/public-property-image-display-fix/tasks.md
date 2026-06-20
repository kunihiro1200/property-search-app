# 実装計画

- [ ] 1. バグ条件の探索テストを書く
  - **Property 1: Bug Condition** - storage_location あり・images 空の物件カード画像未表示バグ
  - **CRITICAL**: このテストは未修正コードで FAIL することが期待される — FAIL がバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待される動作をエンコードしている — 修正後に PASS することで修正を検証する
  - **GOAL**: バグが存在することを示すカウンターエグザンプルを発見する
  - **Scoped PBT Approach**: 決定論的バグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象: `images: []` かつ `storage_location: "https://drive.google.com/drive/folders/ABC123"` の物件で `PublicPropertyCard` をレンダリング
  - バグ条件（design.md の isBugCondition より）: `X.property.images.length = 0 AND X.property.storage_location IS NOT NULL AND X.property.storage_location != ''`
  - アサーション（期待される動作）: `<img src="/api/public/folder-thumbnail/ABC123">` タグが存在すること、「画像なし」ボックスが表示されないこと
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが FAIL する（これが正しい — バグの存在を証明する）
  - 発見したカウンターエグザンプルを記録して根本原因を理解する（例: `PublicPropertyCard` が `<img src="/api/public/folder-thumbnail/ABC123">` を表示しない）
  - テストを書き、実行し、FAIL を記録したらタスク完了とする
  - _Requirements: 1.2_

- [ ] 2. 保全プロパティテストを書く（修正実装の前に）
  - **Property 2: Preservation** - storage_location なし物件の「画像なし」表示保全
  - **IMPORTANT**: 観察優先メソドロジーに従う
  - 未修正コードで非バグ条件の入力（`isBugCondition` が false のケース）の動作を観察する
  - 観察: `storage_location: null` の物件で `PublicPropertyCard` をレンダリング → 「画像なし」ボックスが表示される
  - 観察: `images: [{ thumbnailUrl: "/api/public/images/XYZ/thumbnail" }]` の物件 → 既存の `<img>` タグが表示される
  - 観察: `storage_location: ""` （空文字列）の物件 → 「画像なし」ボックスが表示される
  - プロパティベーステスト: `storage_location` が null または空文字列の全ての物件で「画像なし」ボックスが表示されること（design.md の Preservation Requirements より）
  - プロパティベーステスト: `images` 配列に画像データがある場合は既存の `<img>` タグが表示されること
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが PASS する（これがベースライン動作を確認する）
  - テストを書き、実行し、未修正コードで PASS することを確認したらタスク完了とする
  - _Requirements: 3.3_

- [ ] 3. 公開物件一覧ページ画像表示バグの修正

  - [ ] 3.1 PublicPropertyCard に storage_location からの遅延ロードロジックを実装する
    - `frontend/src/components/PublicPropertyCard.tsx` を修正する
    - `property.storage_location` から `/folders/FOLDER_ID` パターンでフォルダIDを抽出するロジックを追加する（例: `https://drive.google.com/drive/folders/ABC123` → `ABC123`）
    - `thumbnailUrl` の決定ロジックを更新する:
      - `images` 配列に画像がある場合: 既存の `images[0].thumbnailUrl` を使用（変更なし）
      - `images` が空かつ `storage_location` からフォルダIDが抽出できる場合: `/api/public/folder-thumbnail/{folderId}` を使用
      - それ以外: `null`（「画像なし」ボックスを表示）
    - `PublicProperty` 型（`frontend/src/types/publicProperty.ts`）に `storage_location?: string` フィールドを追加する
    - _Bug_Condition: isBugCondition(X) where X.property.images.length = 0 AND X.property.storage_location IS NOT NULL AND X.property.storage_location != ''_
    - _Expected_Behavior: rendered contains `<img src="/api/public/folder-thumbnail/{folderId}">` AND does NOT show "画像なし" box_
    - _Preservation: storage_location が null または空文字列の場合は「画像なし」ボックスを表示し続ける_
    - _Requirements: 2.2, 3.3_

  - [ ] 3.2 folder-thumbnail エンドポイントのフォールバック処理を復元する
    - `backend/api/index.ts` の `/api/public/folder-thumbnail/:folderId` エンドポイントのみを修正する（エンドポイント全体は変更しない）
    - 画像なし時（`result.images.length === 0`）のフォールバック: 404 JSON の代わりにインラインSVGプレースホルダーを返す
    - エラー時（`catch` ブロック）のフォールバック: 500 JSON の代わりにインラインSVGプレースホルダーを返す
    - レスポンスヘッダー: `Content-Type: image/svg+xml`、`Cache-Control: public, max-age=86400`
    - エラーログはサーバーサイドのデバッグのため引き続き出力する
    - SVGプレースホルダー例: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f5f5f5"/><text x="200" y="150" text-anchor="middle" fill="#999" font-size="16">画像なし</text></svg>`
    - **注意**: `vercel.json`（ルート）は絶対に触らない。`backend/src/` は売主管理システム用なので触らない
    - _Bug_Condition: folderHasNoImages(folderId) OR driveApiError(folderId)_
    - _Expected_Behavior: response.status = 200 AND response.headers['Content-Type'] = 'image/svg+xml'_
    - _Preservation: 画像が存在する場合は引き続き画像データを返す_
    - _Requirements: 2.3, 2.4_

  - [ ] 3.3 バグ条件の探索テストが PASS することを確認する
    - **Property 1: Expected Behavior** - storage_location からの遅延ロード画像表示
    - **IMPORTANT**: タスク1で書いた同じテストを再実行する — 新しいテストを書かない
    - タスク1のテストは期待される動作をエンコードしている
    - このテストが PASS すると、期待される動作が満たされていることを確認できる
    - タスク1のバグ条件探索テストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（バグが修正されたことを確認する）
    - _Requirements: 2.2_

  - [ ] 3.4 保全テストが引き続き PASS することを確認する
    - **Property 2: Preservation** - storage_location なし物件の「画像なし」表示保全
    - **IMPORTANT**: タスク2で書いた同じテストを再実行する — 新しいテストを書かない
    - タスク2の保全プロパティテストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（リグレッションがないことを確認する）
    - 修正後も全てのテストが PASS することを確認する（リグレッションなし）

- [ ] 4. チェックポイント — 全テストが PASS することを確認する
  - 全てのテストが PASS することを確認する。疑問が生じた場合はユーザーに確認する。
