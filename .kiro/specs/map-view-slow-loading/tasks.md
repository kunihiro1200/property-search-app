# 実装計画（地図→リスト切り替え遅延修正）

- [x] 1. `searchParams` 比較から `view` パラメータを除外して誤検知を修正する
  - **対象ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`
  - **問題**: `viewMode` が `'map'` → `'list'` に変わると `searchParams` から `view=map` が削除される。この変化が `filterChangedDuringMapRef.current = true` を誤って設定し、「フィルター変更なし」のスキップ制御が機能しない
  - **修正内容**:
    - `searchParams` を比較する際に `view` パラメータを除外するヘルパー関数を追加する
    - `searchParamsDuringMapRef.current` への保存も `view` を除いた値で行う
    - `filterChangedDuringMapRef` の判定が `view` パラメータの変化に影響されないようにする
  - **期待される結果**: フィルター変更なしで地図→リスト切り替えをした場合、`fetchProperties` が呼ばれない
  - _Requirements: 2.1, 2.2_

- [x] 2. `fetchProperties` に `skipImages=true` を追加して高速化する
  - **対象ファイル**: `frontend/src/pages/PublicPropertiesPage.tsx`
  - **問題**: `fetchProperties` が `skipImages` パラメータなしで呼ばれるため、バックエンドが各物件の `getStorageUrlFromWorkTasks`（Google Sheets API）を呼び出し、クォータ超過時に16秒以上の遅延が発生する
  - **修正内容**:
    - `fetchProperties` 内の `params` に `skipImages: 'true'` を追加する
    - 画像は `PublicPropertyCard` の `img` タグ（`/api/public/folder-thumbnail/:folderId`）で遅延ロードされるため、リスト表示の速度には影響しない
  - **期待される結果**: `fetchProperties` が呼ばれた場合でも、画像取得をスキップして高速にレスポンスが返る
  - _Requirements: 2.3_

- [x] 3. `folder-thumbnail` エンドポイントの 404 をプレースホルダーにリダイレクトする
  - **対象ファイル**: `backend/api/index.ts`
  - **問題**: フォルダに画像が存在しない場合に 404 を返すため、ブラウザのコンソールに大量のエラーが表示される（`113zYynCUGbeJDZdA_f9i0b_V6hV9aCc2` への 404 が多数）
  - **修正内容**:
    - `result.images` が空の場合、404 ではなくプレースホルダー画像（`https://via.placeholder.com/400x300?text=No+Image`）にリダイレクトする
    - エラー時（`catch` ブロック）も同様にプレースホルダーにリダイレクトする
  - **期待される結果**: 画像なしの物件でもコンソールエラーが発生しない
  - _Requirements: 2.4_

- [x] 4. 動作確認
  - 地図ビューで「リスト表示に戻る」をクリックした際に即座にリスト表示されることを確認する
  - 地図ビュー中にフィルターを変更してからリストビューに戻った場合、正しく再取得されることを確認する
  - リストビューでのページネーション・フィルター動作が変わっていないことを確認する
  - 詳細ページからの状態復元が変わっていないことを確認する
  - コンソールに `folder-thumbnail` の 404 エラーが出なくなっていることを確認する
