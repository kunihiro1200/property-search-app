# Implementation Plan

- [x] 1. バグ条件の探索テストを書く
  - **Property 1: Bug Condition** - 地図ビューからの戻りナビゲーションバグ
  - **CRITICAL**: このテストは修正前のコードで必ず FAIL する — FAIL することでバグの存在を確認する
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待動作をエンコードしている — 修正後に PASS することで修正を検証する
  - **GOAL**: バグが存在することを示す反例（counterexample）を見つける
  - **Scoped PBT Approach**: 決定論的バグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象: `navigationState = { viewMode: 'map', currentPage: 1, scrollPosition: 0, filters: {} }` を渡して `handleBackClick` を呼び出す
  - アサーション: 遷移先URLに `view=map` が含まれること（修正前は含まれないため FAIL）
  - テスト対象2: `savedState = { viewMode: 'map', ... }` で状態復元処理を実行する
  - アサーション2: `viewMode` が `'map'` として復元されること（修正前は `'list'` に強制上書きされるため FAIL）
  - テスト対象3: `canHide=true` かつ `viewMode: 'map'` の場合に遷移先が `/public/properties?view=map&canHide=true` になること
  - 修正前のコードでテストを実行する
  - **EXPECTED OUTCOME**: テストが FAIL する（これが正しい — バグの存在を証明する）
  - 反例を記録して根本原因を理解する（例: `handleBackClick` が `navigationState.viewMode` を参照していないため `?view=map` が付与されない）
  - テストを書き、実行し、FAIL を記録したらタスク完了とする
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 保全プロパティテストを書く（修正前に実施）
  - **Property 2: Preservation** - リストビューからの戻りナビゲーション保全
  - **IMPORTANT**: 観察優先メソドロジーに従う
  - 修正前のコードで非バグ条件の入力（`viewMode: 'list'` または `navigationState = null`）を観察する
  - 観察1: `navigationState = { viewMode: 'list', ... }` の場合、`handleBackClick` は `/public/properties` へ遷移する
  - 観察2: `navigationState = null` の場合、`handleBackClick` は `/public/properties` へ遷移する
  - 観察3: `canHide=true` かつ `viewMode: 'list'` の場合、`/public/properties?canHide=true` へ遷移する
  - 観察4: `viewMode: 'list'` で状態復元した場合、フィルター設定（物件タイプ・価格帯・築年数・検索クエリ）が正しく復元される
  - プロパティベーステスト: ランダムな `NavigationState`（`viewMode: 'list'` または未設定）を生成し、`?view=map` が付与されないことを検証
  - 修正前のコードでテストを実行する
  - **EXPECTED OUTCOME**: テストが PASS する（これが正しい — 保全すべきベースライン動作を確認する）
  - テストを書き、実行し、PASS を確認したらタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [-] 3. 地図ビュー戻りナビゲーションバグの修正

  - [x] 3.1 `PublicPropertyHeader.tsx` の `handleBackClick` を修正する
    - `navigationState?.viewMode` を参照して `viewMode` を取得する
    - `viewMode === 'map'` の場合は URLパラメータに `view=map` を付与する
    - `canHide=true` かつ `viewMode === 'map'` の場合は `/public/properties?view=map&canHide=true` へ遷移する
    - `canHide=true` かつ `viewMode !== 'map'` の場合は `/public/properties?canHide=true` へ遷移する（既存動作を維持）
    - `navigationState` が `null` の場合はデフォルトの `/public/properties` へ遷移する（既存動作を維持）
    - _Bug_Condition: isBugCondition(navigationState) where navigationState.viewMode = 'map' AND handleBackClick IGNORES navigationState.viewMode_
    - _Expected_Behavior: handleBackClick_fixed(navigationState) → URL contains 'view=map' when navigationState.viewMode = 'map'_
    - _Preservation: viewMode が 'list' または未設定の場合、修正前後で遷移先URLが同一であること_
    - _Requirements: 2.1, 2.2, 3.1, 3.3, 3.4_

  - [x] 3.2 `PublicPropertiesPage.tsx` の状態復元処理を修正する
    - 行248付近の `setViewMode('list')` の無条件実行を削除する
    - `savedState.viewMode` が存在する場合はその値で `setViewMode` を呼び出す
    - `savedState.viewMode` が未設定の場合は初期値（URLパラメータまたは `'list'`）のまま維持する
    - _Bug_Condition: isBugCondition(navigationState) where PublicPropertiesPage FORCES viewMode TO 'list'_
    - _Expected_Behavior: restoreState_fixed(savedState) → viewMode = savedState.viewMode when savedState.viewMode is set_
    - _Preservation: viewMode が 'list' の場合、修正前後で状態復元の動作が同一であること_
    - _Requirements: 2.3, 3.1, 3.2_

  - [x] 3.3 バグ条件の探索テストが PASS することを確認する
    - **Property 1: Expected Behavior** - 地図ビューからの戻りナビゲーション
    - **IMPORTANT**: タスク1 で書いた同じテストを再実行する — 新しいテストを書かない
    - タスク1 のテストは期待動作をエンコードしている
    - このテストが PASS すれば、期待動作が満たされていることを確認できる
    - タスク1 のバグ条件探索テストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（バグが修正されたことを確認）
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 保全テストが引き続き PASS することを確認する
    - **Property 2: Preservation** - リストビューからの戻りナビゲーション保全
    - **IMPORTANT**: タスク2 で書いた同じテストを再実行する — 新しいテストを書かない
    - タスク2 の保全プロパティテストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（リグレッションがないことを確認）
    - 修正後もリストビューからの遷移・フィルター復元・スクロール位置復元が変わらず機能することを確認する

- [x] 4. チェックポイント — 全テストが PASS することを確認する
  - タスク1 のバグ条件探索テストが PASS することを確認する
  - タスク2 の保全プロパティテストが PASS することを確認する
  - 疑問点があればユーザーに確認する
