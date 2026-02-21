# Implementation Plan: buyer-three-calls-confirmed-display-fix

## Overview

買主詳細画面（BuyerDetailPage.tsx）において、「3回架電確認済み」フィールドの条件付き表示機能を実装し、全てのボタン形式フィールドのエラーハンドリングを改善します。

## Tasks

- [x] 1. データマイグレーションの実行
  - `backend/migrations/XXX_cleanup_buyer_field_values.sql`を作成
  - `inquiry_email_phone`の想定外の値を「済」に変換するSQLを記述
  - `three_calls_confirmed`の想定外の値を「済」に変換するSQLを記述
  - ローカル環境でマイグレーションをテスト実行
  - 影響を受けるレコード数を確認
  - _Requirements: 3.1, 3.2_

- [x] 2. buyerFieldOptions.tsの更新
  - `THREE_CALLS_CONFIRMED_OPTIONS`を「済」「未」の2つのみに変更
  - 既存の「過去のもの」選択肢を削除
  - _Requirements: 1.3, 2.1_

- [x] 3. 「3回架電確認済み」フィールドの条件付き表示実装
  - [x] 3.1 条件付きレンダリングロジックを実装
    - `BuyerDetailPage.tsx`の1540行目付近の`three_calls_confirmed`フィールドの処理を修正
    - `inquiry_email_phone === '不通'`の場合のみ表示するロジックを実装
    - 赤枠線と必須マーク（*必須）を追加
    - `InlineEditableField`コンポーネントを使用してドロップダウンを表示
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 3.2 条件付き表示のプロパティテストを作成
    - **Property 1: 条件付き表示の一貫性**
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 3.3 ドロップダウンレンダリングのプロパティテストを作成
    - **Property 2: ドロップダウンコンポーネントのレンダリング**
    - **Validates: Requirements 1.3, 1.4**

- [x] 4. 「【問合メール】電話対応」フィールドの修正
  - [x] 4.1 選択肢を「済」「未」「不通」の3つのみに変更
    - `BuyerDetailPage.tsx`の1400行目付近の`inquiry_email_phone`フィールドの処理を修正
    - 「過去のもの」ボタンを削除
    - 標準的な選択肢を`['済', '未', '不通']`に変更
    - _Requirements: 2.1_

  - [x] 4.2 エラーハンドリングを改善
    - `handleButtonClick`関数を実装（try-catchブロックでエラーをキャッチ）
    - 成功時にスナックバーで「保存しました」を表示
    - エラー時にスナックバーでエラーメッセージを表示
    - デバッグログを追加
    - _Requirements: 2.2, 2.3, 3.3_

  - [ ]* 4.3 選択肢の即時更新のプロパティテストを作成
    - **Property 3: 選択肢の即時更新**
    - **Validates: Requirements 2.2, 2.3**

- [x] 5. 「初動担当」フィールドのエラーハンドリング改善
  - [x] 5.1 エラーハンドリングを実装
    - `BuyerDetailPage.tsx`の1548行目付近の`initial_assignee`フィールドの処理を修正
    - `handleButtonClick`関数を実装（try-catchブロックでエラーをキャッチ）
    - 成功時にスナックバーで「保存しました」を表示
    - エラー時にスナックバーでエラーメッセージを表示
    - デバッグログを追加
    - _Requirements: 2.2, 2.3, 3.3_

  - [ ]* 5.2 エラーハンドリングのプロパティテストを作成
    - **Property 5: エラーハンドリング**
    - **Validates: Requirements 3.3**

- [x] 6. 「配信の有無」フィールドのエラーハンドリング改善
  - [x] 6.1 エラーハンドリングを実装
    - `BuyerDetailPage.tsx`の1933行目付近の`distribution_type`フィールドの処理を修正
    - `handleButtonClick`関数を実装（try-catchブロックでエラーをキャッチ）
    - 成功時にスナックバーで「保存しました」を表示
    - エラー時にスナックバーでエラーメッセージを表示
    - デバッグログを追加
    - _Requirements: 2.2, 2.3, 3.3_

- [x] 7. Checkpoint - 全ての変更をテスト
  - ローカル環境で全てのボタン形式フィールドの動作を確認
  - エラーハンドリングが正しく動作することを確認
  - 条件付き表示が正しく動作することを確認
  - 質問があればユーザーに確認

- [x] 8. 統合テストとデータ永続化の検証
  - [x] 8.1 フィールド表示とデータ保存の統合テストを実行
    - `inquiry_email_phone`を「不通」に変更
    - `three_calls_confirmed`が表示されることを確認
    - 「済」を選択してデータベースに保存
    - ページをリロードして「済」が表示されることを確認
    - _Requirements: 3.1, 3.2_

  - [ ]* 8.2 データ永続化のプロパティテストを作成
    - **Property 4: データ永続化のラウンドトリップ**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 8.3 他フィールドへの影響なしのプロパティテストを作成
    - **Property 6: 他フィールドへの影響なし**
    - **Validates: Requirements 4.1**

  - [ ]* 8.4 リアクティブな表示更新のプロパティテストを作成
    - **Property 7: リアクティブな表示更新**
    - **Validates: Requirements 4.3**

- [x] 9. 手動テストと視覚的確認
  - [x] 9.1 視覚的な強調表示を確認
    - `inquiry_email_phone`を「不通」に設定
    - `three_calls_confirmed`フィールドが赤い枠線で表示されることを確認
    - 必須マーク（*必須）が表示されることを確認
    - _Requirements: 1.4_

  - [x] 9.2 全てのボタンの動作を確認
    - `inquiry_email_phone`の各ボタン（「済」「未」「不通」）をクリック
    - `initial_assignee`の各ボタン（スタッフイニシャル）をクリック
    - `distribution_type`の各ボタン（「要」「不要」）をクリック
    - 全てのボタンが正しく反応することを確認
    - 成功メッセージが表示されることを確認
    - _Requirements: 2.2, 2.3_

  - [x] 9.3 選択肢の変更を確認
    - `inquiry_email_phone`に「過去のもの」ボタンが表示されないことを確認
    - 「済」「未」「不通」の3つのボタンのみが表示されることを確認
    - _Requirements: 2.1_

  - [x] 9.4 「内覧促進メール」フィールドのデザイン調整
    - `viewing_promotion_email`フィールドの派手な装飾を削除
    - `three_calls_confirmed`と同じシンプルなデザインに統一
    - ボタンサイズを小さく（`size="small"`）、色を控えめに（`color="primary"`）
    - 他のフィールドと調和したデザインになることを確認
    - _Requirements: 4.1, 4.2_

- [x] 10. Final checkpoint - 全てのテストが通過することを確認
  - 全てのテストが通過することを確認
  - エラーログを確認
  - 質問があればユーザーに確認

## Notes

- タスクに`*`が付いているものはオプション（プロパティベーステスト）で、コア機能の実装を優先する場合はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントで段階的な検証を実施
- プロパティテストは各プロパティごとに最低100回の反復実行を推奨
- 全てのボタン形式フィールドで統一されたエラーハンドリングパターンを使用
- `viewing_promotion_email`フィールドの実装を参考実装として活用
