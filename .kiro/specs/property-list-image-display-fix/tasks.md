# Implementation Plan

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Fault Condition** - BACKEND_URL未設定時にlocalhost URLが生成される
  - **CRITICAL**: このテストは未修正コードで**FAIL**することが期待される（バグの存在を確認）
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待される動作をエンコードしており、修正後にPASSすることでバグ修正を検証する
  - **GOAL**: `thumbnailUrl` に `http://localhost:3000` が含まれるカウンターサンプルを発見する
  - **Scoped PBT Approach**: `BACKEND_URL` を削除した状態で `convertToPropertyImages([{id: 'abc123', ...}])` を呼び出す具体的なケースにスコープを絞る
  - `backend/api/src/services/PropertyImageService.ts` の `convertToPropertyImages()` を `process.env.BACKEND_URL` を削除した状態で呼び出す
  - テストアサーション: `thumbnailUrl` が `/api/public/images/` で始まること（未修正コードでは `http://localhost:3000` が含まれるためFAIL）
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが**FAIL**する（バグの存在を証明）
  - カウンターサンプルを記録する（例: `thumbnailUrl = "http://localhost:3000/api/public/images/abc123/thumbnail"`）
  - テストを作成・実行・失敗を記録したらタスク完了とする
  - _Requirements: 1.2_

- [x] 2. 保存プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - 既存の動作が変わらないことを確認する
  - **IMPORTANT**: 観察優先メソドロジーに従う
  - 未修正コードで非バグ条件の入力（`BACKEND_URL` が設定されている場合、空配列など）を観察する
  - 観察: `convertToPropertyImages([])` は空配列を返す
  - 観察: `id`, `name`, `mimeType` フィールドは `BACKEND_URL` の有無に関わらず同一
  - 観察: URLのパス部分（`/api/public/images/{id}/thumbnail`）は `BACKEND_URL` の値に関わらず同一
  - プロパティベーステストを作成: 任意の `DriveFile[]` に対して、`id`・`name`・`mimeType` フィールドが変わらないこと
  - プロパティベーステストを作成: `thumbnailUrl` のパス部分（`/api/public/images/{id}/thumbnail`）が常に含まれること
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが**PASS**する（ベースラインの動作を確認）
  - テストを作成・実行・PASSを確認したらタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. thumbnailURL生成バグの修正

  - [x] 3.1 `convertToPropertyImages()` を相対URLを使用するよう修正する
    - `backend/api/src/services/PropertyImageService.ts` の `convertToPropertyImages()` を修正
    - `const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000'` の行を削除
    - `thumbnailUrl` を `${baseUrl}/api/public/images/${file.id}/thumbnail` から `/api/public/images/${file.id}/thumbnail` に変更
    - `fullImageUrl` を `${baseUrl}/api/public/images/${file.id}` から `/api/public/images/${file.id}` に変更
    - _Bug_Condition: isBugCondition({ driveFiles, env }) where env.BACKEND_URL is undefined and driveFiles.length > 0_
    - _Expected_Behavior: thumbnailUrl starts with '/api/public/images/' and does not contain 'http://localhost'_
    - _Preservation: id, name, mimeType フィールドは変更しない。URLのパス部分は同一を維持_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 `getFirstImage()` のキャッシュヒット時も相対URLに修正する
    - `getFirstImage()` メソッド内のキャッシュヒット時の `thumbnailUrl` 生成を修正
    - `${baseUrl}/api/public/images/${cachedEntry.images[0].id}/thumbnail` を `/api/public/images/${cachedEntry.images[0].id}/thumbnail` に変更
    - `baseUrl` 変数の参照がなくなった場合は宣言も削除する
    - _Requirements: 2.2, 3.4_

  - [x] 3.3 誤解を招くコメントを更新する
    - 「フロントエンドとバックエンドは常に別オリジン」というコメントを削除または修正
    - 相対URLを使用する理由（Vercel環境では同一オリジン）を記述するコメントを追加
    - _Requirements: 2.2_

  - [x] 3.4 バグ条件の探索テストが今度はPASSすることを確認する
    - **Property 1: Expected Behavior** - thumbnailUrlが到達可能なURLを生成する
    - **IMPORTANT**: タスク1で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - タスク1のテストは期待される動作をエンコードしており、修正後にPASSするはず
    - **EXPECTED OUTCOME**: テストが**PASS**する（バグが修正されたことを確認）
    - _Requirements: 2.1, 2.2_

  - [x] 3.5 保存プロパティテストが引き続きPASSすることを確認する
    - **Property 2: Preservation** - 既存の動作が維持されている
    - **IMPORTANT**: タスク2で作成した**同じテスト**を再実行する（新しいテストを書かない）
    - **EXPECTED OUTCOME**: テストが**PASS**する（リグレッションなし）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. チェックポイント - 全テストがPASSすることを確認する
  - 全テストを実行し、PASSすることを確認する
  - 疑問点があればユーザーに確認する
