# 実装計画

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - fetchAllProperties の while ループによる複数リクエスト
  - **重要**: このテストは修正前のコードで実行し、**失敗することを確認する**（バグの存在を証明）
  - **目的**: バグが存在することを示すカウンターサンプルを記録する
  - **スコープ付き PBT アプローチ**: 決定論的なバグのため、具体的な失敗ケースにスコープを絞る
  - テスト内容（design.md の Bug Condition より）:
    - `fetchAllProperties` が `while (hasMore)` ループを使用していることを確認
    - `withCoordinates=true` + `skipImages=true` を指定しているにもかかわらず、座標付き物件が 1,001 件存在する場合に API リクエストが 2 回実行されることを確認
    - `searchParams` が変更された際にデバウンスなしで即座に `fetchAllProperties` が再実行されることを確認
    - `viewMode` の `useEffect` と `searchParams` の `useEffect` が同時に `fetchAllProperties` を呼び出す二重トリガーを確認
  - 修正前のコードでテストを実行する
  - **期待される結果**: テストが失敗する（バグの存在を証明）
  - カウンターサンプルを記録する（例: 「座標付き物件が 1,001 件の場合、API リクエストが 2 回実行される」）
  - テストを作成・実行し、失敗を記録したらタスク完了とする
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 保持プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - リストビューおよびその他の既存動作の保持
  - **重要**: 観察優先メソドロジーに従う
  - 修正前のコードで非バグ条件の入力（リストビューでの操作）を観察する:
    - `fetchProperties` がページネーション付きで動作することを観察（`limit=20`, `offset` が正しく計算される）
    - `sessionStorage` からの状態復元（フィルター・ページ番号・スクロール位置）が正常に動作することを観察
    - `allProperties` のデータ構造が `PropertyMapView` コンポーネントの期待する形式と一致することを観察
    - フィルター変更時に `searchParams` が正しく更新されることを観察
  - 観察した動作をプロパティベーステストとして記述する:
    - 任意のフィルター条件（物件タイプ・価格帯・築年数の組み合わせ）で `fetchProperties` が常に `limit=20` のページネーション付きリクエストを実行することを検証
    - 任意の `searchParams` 変更後にリストビューが正しいページネーション動作を維持することを検証
  - 修正前のコードでテストを実行する
  - **期待される結果**: テストが通過する（ベースライン動作を確認）
  - テストを作成・実行し、通過を確認したらタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 地図ビュー遅延読み込みバグの修正

  - [x] 3.1 `fetchAllProperties` の `while` ループを廃止して単一リクエストに置き換える
    - `frontend/src/pages/PublicPropertiesPage.tsx` の `fetchAllProperties` 関数を修正
    - `while (hasMore)` ループを削除し、単一の `fetch` 呼び出しに置き換える
    - `limit` を `5000` に設定（座標付き物件の実件数を超える十分大きな値）
    - `offset` は常に `0`
    - `withCoordinates: 'true'` + `skipImages: 'true'` は維持
    - `offset >= 10000` の安全装置は `while` ループ廃止に伴い削除
    - エラーハンドリング（`try/catch`、`setIsLoadingAllProperties`）は維持
    - _Bug_Condition: isBugCondition(input) where input.viewMode === 'map' AND fetchAllPropertiesUsesWhileLoop()_
    - _Expected_Behavior: API リクエストが 1 回のみ実行され、withCoordinates=true + skipImages=true が含まれる_
    - _Preservation: fetchProperties（リストビュー用）は変更しない_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 `searchParams` 変更時のデバウンス制御を追加する
    - `frontend/src/pages/PublicPropertiesPage.tsx` に `useRef` でタイマーIDを保持する変数を追加
    - 地図ビュー用の `useEffect`（`searchParams` を依存配列に持つもの）にデバウンス処理（300〜500ms）を追加
    - 前回のタイマーをキャンセルしてから新しいタイマーをセットする
    - または `AbortController` を使用して進行中のリクエストをキャンセルする方式でも可
    - _Bug_Condition: input.searchParams が変更された AND 重複リクエスト制御がない_
    - _Expected_Behavior: 連続したフィルター変更で最後の変更のみが実行される_
    - _Requirements: 2.3_

  - [x] 3.3 `useEffect` のトリガー条件を整理して重複実行を防止する
    - `frontend/src/pages/PublicPropertiesPage.tsx` の `viewMode` の `useEffect` と `searchParams` の `useEffect` の重複実行を防ぐ
    - `viewMode === 'map'` に切り替わった時のみ `fetchAllProperties` を実行する条件を明確化
    - 二重トリガーが発生しないようにトリガー条件を整理する
    - _Bug_Condition: searchParams の useEffect と viewMode の useEffect が同時に fetchAllProperties を呼び出す_
    - _Requirements: 2.1_

  - [x] 3.4 バックエンドの `withCoordinates` パラメータ対応を確認する
    - `backend/api/index.ts` の `/api/public/properties` エンドポイントで `withCoordinates` パラメータが正しく処理されていることを確認
    - `withCoordinates=true` の場合、`latitude` と `longitude` が両方 `null` でない物件のみを返すことを確認
    - 既に実装済みの場合は変更不要（design.md より「バックエンドには既に実装済み」）
    - 必要に応じて `PropertyListingService` の `getPublicProperties` メソッドの `withCoordinates` 処理を確認
    - _Requirements: 2.4_

  - [x] 3.5 バグ条件の探索テストが通過することを確認する
    - **Property 1: Expected Behavior** - fetchAllProperties の単一リクエスト取得
    - **重要**: タスク 1 で作成した同じテストを再実行する（新しいテストを書かない）
    - タスク 1 のテストは期待される動作をエンコードしている
    - このテストが通過することで、バグが修正されたことを確認する
    - 修正後のコードでテストを実行する
    - **期待される結果**: テストが通過する（バグが修正されたことを証明）
    - _Requirements: 2.1, 2.2 の Expected Behavior Properties_

  - [x] 3.6 保持テストが引き続き通過することを確認する
    - **Property 2: Preservation** - リストビューおよびその他の既存動作の保持
    - **重要**: タスク 2 で作成した同じテストを再実行する（新しいテストを書かない）
    - 修正後のコードで保持テストを実行する
    - **期待される結果**: テストが通過する（リグレッションがないことを確認）
    - リストビューのページネーション取得・詳細ページからの状態復元・地図マーカーのクリック動作が変わっていないことを確認

- [x] 4. チェックポイント - 全テストの通過を確認する
  - タスク 1 のバグ条件テストが通過することを確認する（修正後）
  - タスク 2 の保持テストが通過することを確認する（修正後）
  - 地図ビューに切り替えた際の API リクエスト数が 1 回であることを確認する
  - フィルター変更後の地図ビューで正しい物件マーカーが表示されることを確認する
  - リストビューと地図ビューを切り替えた際に両方の動作が正常であることを確認する
  - 詳細ページから戻った際にリストビューが正しく復元されることを確認する
  - 疑問が生じた場合はユーザーに確認する
