# Implementation Plan: 物件リストステータス表示機能

## Overview

物件リストの「atbb成約済み/非公開」カラムの値に基づいて、ユーザーフレンドリーなステータスバッジを表示する機能を実装する。

## Tasks

- [x] 1. StatusBadge コンポーネントの作成
  - 新しいReactコンポーネントを作成
  - バッジの表示ロジックを実装
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 6.1, 6.2_

- [ ]* 1.1 StatusBadge コンポーネントのユニットテストを作成
  - 公開前情報バッジの表示テスト
  - 非公開物件バッジの表示テスト
  - 成約済みバッジの表示テスト
  - バッジ非表示のテスト
  - _Requirements: 1.1, 2.1, 3.1_

- [ ]* 1.2 StatusBadge コンポーネントのプロパティテストを作成
  - **Property 1: バッジ表示の正確性**
  - **Validates: Requirements 1.1**

- [ ]* 1.3 StatusBadge コンポーネントのプロパティテストを作成（非公開物件）
  - **Property 2: 非公開物件バッジの正確性**
  - **Validates: Requirements 2.1**

- [ ]* 1.4 StatusBadge コンポーネントのプロパティテストを作成（成約済み）
  - **Property 3: 成約済みバッジの正確性**
  - **Validates: Requirements 3.1**

- [ ]* 1.5 StatusBadge コンポーネントのプロパティテストを作成（排他性）
  - **Property 4: バッジの排他性**
  - **Validates: Requirements 6.2**

- [x] 2. publicUrlGenerator の修正
  - generatePublicPropertyUrl 関数を修正してすべての物件にURLを表示
  - propertyId（UUID）からpropertyNumber（物件番号）に変更
  - atbbStatusパラメータを削除
  - isPublicProperty 関数を削除
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 2.4 publicUrlGenerator の修正を実装
  - generatePublicPropertyUrl関数のシグネチャを変更
  - atbbStatusによる条件分岐を削除
  - propertyNumberを使用してURLを生成
  - isPublicProperty関数を削除
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 2.1 publicUrlGenerator のユニットテストを更新
  - すべての物件番号でURLが生成されることをテスト
  - UUIDではなく物件番号が使用されることをテスト
  - 常に有効なURLが返されることをテスト
  - _Requirements: 4.1, 4.4_

- [ ]* 2.2 publicUrlGenerator のプロパティテストを作成
  - **Property 5: URL表示の正確性**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 2.3 publicUrlGenerator のプロパティテストを作成（URL形式）
  - **Property 6: URL形式の正確性**
  - **Validates: Requirements 4.4**

- [x] 2.5 PublicUrlCell コンポーネントを更新
  - propertyIdの代わりにpropertyNumberを受け取るように変更
  - atbbStatusパラメータを削除
  - 常にURLを表示するように変更
  - _Requirements: 4.1, 4.2_

- [x] 2.6 PropertyListingsPage を更新
  - PublicUrlCellにpropertyNumberを渡すように変更
  - atbbStatusパラメータを削除
  - _Requirements: 4.1, 4.2_

- [x] 2.7 PropertyListingDetailPage を更新
  - PublicUrlCellにpropertyNumberを渡すように変更
  - atbbStatusパラメータを削除
  - _Requirements: 4.1, 4.2_

- [x] 3. PropertyListingsPage の更新
  - テーブルヘッダーに「バッジ」列を追加
  - テーブル行にStatusBadgeコンポーネントを追加
  - レスポンシブデザインの調整
  - _Requirements: 1.1, 2.1, 3.1, 6.3, 6.4, 6.5_

- [ ]* 3.1 PropertyListingsPage の統合テストを作成
  - 公開前情報物件のテスト
  - 非公開物件のテスト
  - 成約済み物件のテスト
  - 公開中物件のテスト
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.3_

- [x] 4. Checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、ユーザーに質問があれば尋ねる

- [x] 5. スタイリングとアクセシビリティの改善
  - バッジの色とコントラストを調整
  - aria-labelを追加
  - レスポンシブデザインの最終調整
  - _Requirements: 6.3, 6.4, 6.5_

- [ ]* 5.1 アクセシビリティのテストを作成
  - aria-labelの存在確認
  - コントラスト比の確認
  - _Requirements: 6.3_

- [x] 6. ドキュメントの更新
  - README.mdに新機能の説明を追加
  - コンポーネントのJSDocコメントを追加
  - _Requirements: すべて_

- [x] 7. Final checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、ユーザーに質問があれば尋ねる

## Notes

- タスクに`*`が付いているものはオプションで、より速いMVPのためにスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントで段階的な検証を実施
- プロパティテストは普遍的な正確性プロパティを検証
- ユニットテストは特定の例とエッジケースを検証
