# 実装計画

- [x] 1. バグ条件の探索テストを作成する
  - **Property 1: Bug Condition** - atbb_statusに関わらず固定色が返されるバグ
  - **重要**: このテストは修正前のコードで必ず**失敗**すること（失敗がバグの存在を証明する）
  - **修正前にテストを書くこと。テストや実装コードを修正しないこと**
  - **目的**: バグが存在することを示すカウンターサンプルを見つける
  - **スコープ限定PBTアプローチ**: 決定論的なバグのため、具体的な失敗ケースにスコープを絞る
  - テスト対象: `frontend/src/components/PropertyMapView.tsx` 内のボタン色取得ロジック
  - `atbb_status = "非公開（成約済み）"` のとき、ボタン色が `#9e9e9e`（グレー）になることを検証（design.md の Bug Condition より）
  - `atbb_status = "公開中"` のとき、ボタン色が `#2196F3`（青）になることを検証
  - `atbb_status = "公開前情報あり"` のとき、ボタン色が `#ff9800`（オレンジ）になることを検証
  - `atbb_status = "配信メールのみ非公開"` のとき、ボタン色が `#f44336`（赤）になることを検証
  - 修正前のコードでテストを実行する
  - **期待される結果**: テストが**失敗**する（これが正しい。バグの存在を証明する）
  - カウンターサンプルを記録して根本原因を理解する（例: 全ての atbb_status で `#FFC107` が返される）
  - テストを書き、実行し、失敗を記録したらタスク完了とする
  - _Requirements: 1.1, 1.2_

- [x] 2. 保全プロパティテストを作成する（修正前に実施）
  - **Property 2: Preservation** - 既存動作（マーカー色・バッジ設定・ナビゲーション）の保全
  - **重要**: 観察優先メソドロジーに従うこと
  - 修正前のコードで非バグ条件の入力（`isBugCondition` が false を返すケース）の動作を観察する
  - 観察: `getMarkerColor("非公開（成約済み）")` が `#9e9e9e` を返すことを確認
  - 観察: `BADGE_CONFIGS['sold'].backgroundColor` が `#9e9e9e` であることを確認
  - 観察: `mapAtbbStatusToDisplayStatus` の変換ロジックが正しく動作することを確認
  - プロパティベーステスト: 任意の `atbb_status` 文字列に対して `getMarkerColor` の出力が修正前後で同一であることを検証（design.md の Preservation Requirements より）
  - プロパティベーステスト: 任意の `atbb_status` 文字列に対して `BADGE_CONFIGS` の参照結果が変わらないことを検証
  - 修正前のコードでテストを実行する
  - **期待される結果**: テストが**成功**する（これが正しい。保全すべきベースライン動作を確認する）
  - テストを書き、実行し、成功を確認したらタスク完了とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. EE2ボタン色バグの修正

  - [x] 3.1 修正を実装する
    - `frontend/src/components/PropertyMapView.tsx` の InfoWindow 内 `Button` コンポーネントの `sx` プロパティを修正する（約590〜600行目）
    - `selectedProperty.atbb_status` を `mapAtbbStatusToDisplayStatus` に渡して `statusType` を取得する
    - `statusType === 'other'` の場合は `#2196F3`（青）を使用し、それ以外は `BADGE_CONFIGS[statusType].backgroundColor` を参照する
    - `color` を `#000` から `#fff` に変更する（グレー・赤・オレンジ背景での視認性確保）
    - `&:hover` の `backgroundColor` も同様に動的に変更する
    - 変更箇所は `Button` の `sx.backgroundColor` の1箇所のみに限定する
    - _Bug_Condition: isBugCondition(property) where Button の sx.backgroundColor が atbb_status に関わらず固定値 `#FFC107` を返す_
    - _Expected_Behavior: statusType に応じて sold→`#9e9e9e`, private→`#f44336`, pre_publish→`#ff9800`, other→`#2196F3` を返す（design.md の getExpectedButtonColor より）_
    - _Preservation: getMarkerColor・BADGE_CONFIGS・mapAtbbStatusToDisplayStatus・ナビゲーション動作・InfoWindow表示動作は変更しない_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 バグ条件の探索テストが成功することを確認する
    - **Property 1: Expected Behavior** - atbb_statusに応じたEE2ボタン色の動的変更
    - **重要**: タスク1で作成した**同じテスト**を再実行すること。新しいテストを書かないこと
    - タスク1のバグ条件探索テストを実行する
    - **期待される結果**: テストが**成功**する（バグが修正されたことを確認する）
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 保全テストが引き続き成功することを確認する
    - **Property 2: Preservation** - 既存動作の保全
    - **重要**: タスク2で作成した**同じテスト**を再実行すること。新しいテストを書かないこと
    - タスク2の保全プロパティテストを実行する
    - **期待される結果**: テストが**成功**する（リグレッションがないことを確認する）
    - 修正後も全てのテストが成功することを確認する

- [x] 4. チェックポイント - 全テストの成功を確認する
  - 全てのテスト（バグ条件テスト・保全テスト）が成功していることを確認する
  - 疑問点があればユーザーに確認する
