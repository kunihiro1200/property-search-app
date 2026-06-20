# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - 詳細ページAPIがpriceフィールドを計算せずに返すバグ
  - **CRITICAL**: このテストは未修正コードで FAIL することが期待される — FAIL がバグの存在を証明する
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: このテストは期待される動作をエンコードしている — 修正後に PASS することで修正を検証する
  - **GOAL**: バグが存在することを示すカウンターエグザンプルを見つける
  - **Scoped PBT Approach**: `sales_price` または `listing_price` が存在する物件（例: CC19）に絞ってプロパティをスコープする
  - `GET /api/public/properties/:propertyIdentifier` を呼び出し、`sales_price` または `listing_price` が存在する物件のレスポンスに `price` フィールドが含まれないことを確認する（design.md の Fault Condition より）
  - テストアサーション: `response.property.price === property.sales_price || property.listing_price` であること
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが FAIL する（これが正しい — バグの存在を証明する）
  - カウンターエグザンプルを記録して根本原因を理解する（例: 「CC19の詳細APIレスポンスに price フィールドが存在しない」）
  - テストを書き、実行し、FAIL を記録したらタスク完了とする
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - 一覧ページおよび価格なし物件の動作が変わらない
  - **IMPORTANT**: 観察優先メソドロジーに従う
  - 未修正コードで以下を観察する:
    - `sales_price` も `listing_price` も null の物件の詳細APIを呼び出し → `price` フィールドが設定されないことを確認
    - 一覧API（`GET /api/public/properties`）を呼び出し → `price` が正しく計算されていることを確認
    - 詳細APIで `address`、`property_type`、`land_area` などの価格以外フィールドが返されることを確認
  - プロパティベーステストを書く（design.md の Preservation Requirements より）:
    - `sales_price` も `listing_price` も存在しない物件では、修正後も `price` が設定されないこと
    - 一覧APIのレスポンスが修正前後で変わらないこと
    - 詳細APIの価格以外フィールドが修正前後で同じであること
  - 未修正コードでテストを実行する
  - **EXPECTED OUTCOME**: テストが PASS する（これが正しい — 保持すべきベースライン動作を確認する）
  - タスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: 詳細ページAPIにpriceフィールドの計算を追加

  - [x] 3.1 Implement the fix
    - `backend/api/index.ts` の `GET /api/public/properties/:propertyIdentifier` エンドポイント（行 291 付近）を修正する
    - `res.json()` 呼び出し直前に `const price = property.sales_price || property.listing_price || undefined;` を追加する
    - レスポンスの `property` オブジェクトに `...(price !== undefined ? { price } : {})` を追加する
    - `backend/src/` および `vercel.json` は一切変更しない
    - _Bug_Condition: isBugCondition(request) — `sales_price` または `listing_price` が存在するにもかかわらず `response.property.price` が `undefined` になる状態_
    - _Expected_Behavior: `price = sales_price || listing_price` を計算してレスポンスに付与する（design.md の Fix Implementation より）_
    - _Preservation: 一覧ページの動作、価格なし物件の「価格応談」表示、価格以外フィールドの表示を変更しない_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - 詳細ページAPIがpriceフィールドを計算して返す
    - **IMPORTANT**: タスク 1 と同じテストを再実行する — 新しいテストを書かない
    - タスク 1 のテストは期待される動作をエンコードしている
    - このテストが PASS すれば、期待される動作が満たされたことを確認できる
    - タスク 1 のバグ条件探索テストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（バグが修正されたことを確認）
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - 一覧ページおよび価格なし物件の動作が変わらない
    - **IMPORTANT**: タスク 2 と同じテストを再実行する — 新しいテストを書かない
    - タスク 2 の保持プロパティテストを実行する
    - **EXPECTED OUTCOME**: テストが PASS する（リグレッションがないことを確認）
    - 修正後も全テストが PASS することを確認する

- [x] 4. Checkpoint - Ensure all tests pass
  - 全テストが PASS することを確認する。疑問点があればユーザーに確認する。
