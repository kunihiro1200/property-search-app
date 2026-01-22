# Implementation Plan: 概算書PDF計算完了待機機能

## Overview

公開物件サイトの概算書PDF生成機能において、スプレッドシートの計算完了を確実に待機してからPDFを生成するように改善します。D11セル（金額セル）の値をポーリングして計算完了を検証する方式に変更します。

## Tasks

- [x] 1. PropertyServiceに計算完了待機メソッドを実装
  - `waitForCalculationCompletion()`メソッドを追加
  - D11セルの値を500msごとにポーリング
  - 最大10秒（20回試行）まで待機
  - タイムアウト時はエラーをスロー
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. 値の検証メソッドを実装
  - `isValidCalculatedValue()`メソッドを追加
  - 数値であることを確認
  - 0より大きいことを確認
  - 空でないことを確認
  - _Requirements: 2.4_

- [x] 3. generateEstimatePdf()メソッドを更新
  - 固定2秒待機を削除
  - `waitForCalculationCompletion()`を呼び出し
  - エラーハンドリングを追加
  - ログ出力を充実
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 4. 環境変数のサポートを追加（オプション）
  - `ESTIMATE_PDF_MAX_WAIT_TIME`（最大待機時間）
  - `ESTIMATE_PDF_RETRY_INTERVAL`（リトライ間隔）
  - `ESTIMATE_PDF_VALIDATION_CELL`（検証セル）
  - _Requirements: 3.3, 3.4_

- [x] 5. Checkpoint - 動作確認
  - バックエンドのビルドが成功することを確認
  - TypeScriptのコンパイルエラーがないことを確認
  - ユーザーに確認を求める

- [ ]* 6. ユニットテストを作成
  - `isValidCalculatedValue()`のテスト
  - 有効な数値、0、負の数、空文字列、null/undefinedのケース
  - _Requirements: 2.4_

- [ ]* 7. 統合テストを作成
  - `waitForCalculationCompletion()`のテスト
  - 即座に値がある場合、2回目で値が入る場合、タイムアウトの場合
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 8. 手動テストとUI確認
  - 公開物件サイトで概算書ボタンをクリック
  - 初回クリックで正しい金額が表示されることを確認
  - 2回目のクリックでも正しい金額が表示されることを確認
  - タイムアウトエラーが適切に表示されることを確認
  - _Requirements: 1.4, 4.1, 4.2, 4.3, 4.4_

- [ ] 9. ログ出力の確認
  - 計算待機中のログが適切に出力されることを確認
  - エラー時のログが詳細に記録されることを確認
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Final checkpoint - 本番環境デプロイ前確認
  - すべてのテストが成功していることを確認
  - ログが適切に出力されることを確認
  - ユーザーに最終確認を求める

## Notes

- タスク4（環境変数のサポート）はオプションです。初期実装では定数で十分です。
- タスク6、7（ユニットテスト、統合テスト）はオプションですが、推奨されます。
- 各タスクは要件（Requirements）を参照しており、トレーサビリティを確保しています。
- Checkpointタスクでユーザーに確認を求め、問題があれば修正します。
