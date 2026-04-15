# Implementation Plan

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - 複数フィルター条件 + showPublicOnly=true で 400 エラー
  - **重要**: このテストは修正前のコードで実行し、**失敗することを確認する**（失敗 = バグの存在を証明）
  - **修正前にテストを書くこと。テストが失敗しても修正しないこと**
  - **目的**: バグが存在することを示す反例（counterexample）を記録する
  - **スコープ付き PBT アプローチ**: 決定論的なバグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象: `backend/api/src/services/PropertyListingService.ts` の `getPublicProperties` メソッド
  - バグ条件（design.md の Bug Condition より）:
    - `showPublicOnly=true` かつ `location="大分市品域南"` かつ `propertyType="土地"` → 400 エラー
    - `showPublicOnly=true` かつ `priceRange={min: 1000}` → `.or()` が2回連鎖し 400 エラー
    - `showPublicOnly=true` かつ `location="大分市"` → 400 エラー
  - テストアサーション（design.md の Expected Behavior より）:
    - `result.status = 200` であること
    - `result.properties` が null でないこと
    - 400 エラーが発生しないこと
  - 未修正コードで実行 → **失敗が期待される結果**（バグの存在を確認）
  - 反例を記録する（例: `showPublicOnly=true` + `priceRange={min:1000}` で `.or()` が連鎖し 400 エラー）
  - タスク完了条件: テストを作成し、実行し、失敗を記録したとき
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. 保持プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - 非バグ条件入力での動作保持
  - **重要**: 観察優先メソドロジーに従うこと
  - 未修正コードで非バグ条件の動作を観察し、その動作を保持するテストを作成する
  - 観察対象（`isBugCondition(X)=false` となる入力）:
    - フィルターなし全件取得: `getPublicProperties({})` → 全物件が返ること
    - `propertyType` のみ: `getPublicProperties({propertyType: "土地"})` → 土地のみ返ること
    - `location` のみ: `getPublicProperties({location: "大分市"})` → 大分市の物件のみ返ること
    - `showPublicOnly=true` のみ: `getPublicProperties({showPublicOnly: true})` → 公開中のみ返ること
    - `priceRange` のみ: `getPublicProperties({priceRange: {min: 1000}})` → 価格帯に合致する物件のみ返ること
    - `withCoordinates=true` のみ: 座標がある物件のみ返ること
  - プロパティベーステストで多様な非バグ条件入力を生成し、動作保持を強く保証する
  - 未修正コードで実行 → **成功が期待される結果**（ベースライン動作の確認）
  - タスク完了条件: テストを作成し、実行し、未修正コードで成功を確認したとき
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. `.or()` 連鎖バグの修正

  - [x] 3.1 `priceRange` フィルターの `.or()` 連鎖を解消する
    - 修正対象ファイル: `backend/api/src/services/PropertyListingService.ts` のみ
    - `backend/src/` は売主管理システム用のため絶対に触らない
    - `vercel.json`（ルート）は絶対に触らない
    - 現在の問題のあるコード（design.md の Hypothesized Root Cause より）:
      ```typescript
      // 問題: .or() が2回連鎖する
      if (priceRange?.min !== undefined) {
        query = query.or(`sales_price.gte.${priceRange.min},listing_price.gte.${priceRange.min}`);
      }
      if (priceRange?.max !== undefined) {
        query = query.or(`sales_price.lte.${priceRange.max},listing_price.lte.${priceRange.max}`);
      }
      ```
    - 修正内容（design.md の Fix Implementation より）:
      - `priceRange.min` と `priceRange.max` の条件を1つの `.or()` 呼び出しにまとめる
      - `min` と `max` が同時に指定された場合の AND 結合を正しく処理する
    - _Bug_Condition: `isBugCondition(X)` where `X.showPublicOnly=true AND X.priceRange IS NOT NULL`_
    - _Expected_Behavior: `result.status=200 AND result.properties IS NOT NULL AND no_400_error(result)`_
    - _Preservation: `showPublicOnly=false` または他のフィルター条件が全て未指定の場合、修正前後で同じ結果を返す_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 バグ条件の探索テストが成功することを確認する
    - **Property 1: Expected Behavior** - 複数フィルター条件 + showPublicOnly=true で 200 レスポンス
    - **重要**: タスク1で作成した同じテストを再実行する。新しいテストを書かないこと
    - タスク1のテストは期待される動作をエンコードしている
    - このテストが成功すれば、バグが修正されたことを確認できる
    - 修正後のコードで実行 → **成功が期待される結果**（バグ修正の確認）
    - _Requirements: 2.1, 2.2, 2.3 の Expected Behavior Properties_

  - [x] 3.3 保持プロパティテストが引き続き成功することを確認する
    - **Property 2: Preservation** - 非バグ条件入力での動作保持
    - **重要**: タスク2で作成した同じテストを再実行する。新しいテストを書かないこと
    - 修正後のコードで実行 → **成功が期待される結果**（リグレッションなしの確認）
    - 全ての非バグ条件入力で修正前後の動作が一致することを確認する

- [x] 4. チェックポイント - 全テストの成功を確認する
  - タスク1（バグ条件テスト）が成功することを確認する
  - タスク2（保持プロパティテスト）が成功することを確認する
  - 全テストが成功したら、`git push` でVercelに自動デプロイされる
  - 本番環境（`https://property-site-frontend-kappa.vercel.app/public/properties`）で動作確認する
  - AA13674 がエリア「大分市品域南」・物件タイプ「土地」・公開中のみ表示 ON の条件で表示されることを確認する
  - 疑問が生じた場合はユーザーに確認する
