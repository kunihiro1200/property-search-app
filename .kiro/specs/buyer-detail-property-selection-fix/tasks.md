# Implementation Plan: Buyer Detail Property Selection Fix

## Overview

買主詳細ページのGmail送信機能を改善し、問合せ履歴のチェックボックスで選択した物件を直接使用することで、二重選択の問題を解消する。

## Tasks

- [ ] 1. 問合せ履歴チェックボックスの実装
  - [ ] 1.1 InquiryHistoryTableコンポーネントの更新
    - 各行にチェックボックスを追加
    - 選択状態の管理
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.2 全選択/全解除機能の実装
    - ヘッダーに全選択チェックボックスを追加
    - _Requirements: 1.3_

  - [ ] 1.3 選択状態の視覚的フィードバック
    - 選択された行のハイライト
    - _Requirements: 1.2_

  - [ ]* 1.4 チェックボックス選択のユニットテストを作成
    - 単一選択のテスト
    - 複数選択のテスト
    - 全選択/全解除のテスト
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Gmail送信ボタンの制御
  - [ ] 2.1 選択状態に基づくボタンの有効/無効化
    - 選択なし: ボタン無効化
    - 選択あり: ボタン有効化
    - _Requirements: 1.4, 1.5_

  - [ ] 2.2 選択数の表示
    - ボタンまたは近くに選択数を表示
    - _Requirements: 1.5_

  - [ ]* 2.3 ボタン制御のユニットテストを作成
    - 選択なしの場合のテスト
    - 選択ありの場合のテスト
    - _Requirements: 1.4, 1.5_

- [ ] 3. Email Composition Modalの更新
  - [ ] 3.1 選択された物件の受け取り
    - propsに selectedProperties を追加
    - _Requirements: 2.1, 2.2_

  - [ ] 3.2 物件情報の表示
    - 選択された物件のリストを読み取り専用で表示
    - 物件番号と住所を表示
    - _Requirements: 2.4, 2.5_

  - [ ] 3.3 Property Selection Modalの削除
    - 物件選択モーダルのコードを削除
    - 関連するimportとstateを削除
    - _Requirements: 2.3, 6.1, 6.2_

  - [ ]* 3.4 Email Composition Modalのユニットテストを作成
    - 単一物件の表示テスト
    - 複数物件の表示テスト
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [ ] 4. 単一物件の場合の簡略化
  - [ ] 4.1 単一物件の自動選択
    - 問合せ履歴が1件の場合、自動的に選択状態にする
    - _Requirements: 3.1, 3.3_

  - [ ] 4.2 チェックボックスの表示制御
    - 単一物件の場合、チェックボックスを非表示または無効化
    - _Requirements: 3.2_

  - [ ] 4.3 単一物件の情報表示
    - Email Composition Modalで物件情報を表示
    - _Requirements: 3.4_

  - [ ]* 4.4 単一物件処理のユニットテストを作成
    - 自動選択のテスト
    - チェックボックス表示のテスト
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. 複数物件メール送信の処理
  - [ ] 5.1 メールテンプレートの更新
    - 複数物件情報のマージ処理
    - プレースホルダーの対応
    - _Requirements: 4.3, 4.5_

  - [ ] 5.2 メール本文のフォーマット
    - 複数物件の情報を整理して表示
    - _Requirements: 4.4_

  - [ ] 5.3 メール履歴の記録
    - 各物件に対して個別の履歴レコードを作成
    - _Requirements: 4.1_

  - [ ] 5.4 複数物件情報の表示
    - Email Composition Modalで全物件の情報を表示
    - _Requirements: 4.2_

  - [ ]* 5.5 複数物件処理のユニットテストを作成
    - テンプレートマージのテスト
    - 履歴記録のテスト
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6. 物件選択の変更と確認
  - [ ] 6.1 選択サマリーの表示
    - Email Composition Modalの上部に選択物件のサマリーを表示
    - _Requirements: 5.1, 5.5_

  - [ ] 6.2 選択変更ボタンの実装
    - 「選択を変更」ボタンを追加
    - モーダルを閉じて問合せ履歴に戻る
    - _Requirements: 5.2_

  - [ ] 6.3 選択状態の保持
    - モーダルを閉じても選択状態を保持
    - _Requirements: 5.3_

  - [ ] 6.4 選択変更の反映
    - モーダルを再度開いたときに変更を反映
    - _Requirements: 5.4_

  - [ ]* 6.5 選択変更のユニットテストを作成
    - サマリー表示のテスト
    - 選択変更フローのテスト
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. 物件詳細ページからの遷移対応
  - [ ] 7.1 物件詳細ページからの遷移時の処理
    - URLパラメータまたはstateで物件IDを受け取る
    - 該当物件のチェックボックスを自動的にチェック
    - _Requirements: 6.3_

  - [ ]* 7.2 遷移処理のユニットテストを作成
    - 物件IDの受け取りテスト
    - 自動チェックのテスト
    - _Requirements: 6.3_

- [ ] 8. エラーハンドリングとバリデーション
  - [ ] 8.1 選択なしエラーの処理
    - 選択なしでGmail送信ボタンをクリックした場合のエラーメッセージ
    - _Requirements: 7.1_

  - [ ] 8.2 選択状態の検証
    - 不整合な選択状態の検証と修正
    - _Requirements: 7.2_

  - [ ] 8.3 物件データ読み込みエラーの処理
    - 物件データの読み込み失敗時のエラー表示
    - _Requirements: 7.3_

  - [ ] 8.4 送信成功時の処理
    - 選択状態のクリア
    - 成功通知の表示
    - _Requirements: 7.4_

  - [ ] 8.5 送信失敗時の処理
    - 選択状態の保持
    - リトライの許可
    - _Requirements: 7.5_

  - [ ]* 8.6 エラーハンドリングのユニットテストを作成
    - 各エラーケースのテスト
    - エラーメッセージの表示テスト
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 9. Checkpoint - 機能テストとレビュー
  - すべてのテストが通ることを確認
  - 手動テストを実施
  - ユーザーに質問があれば確認

- [ ] 10. 統合テストとE2Eテスト
  - [ ]* 10.1 フルフローの統合テストを作成
    - チェックボックス選択 → Gmail送信 → メール作成 → 送信
    - 単一物件フロー
    - 複数物件フロー

  - [ ]* 10.2 物件詳細ページからの遷移テスト
    - 物件詳細ページ → 買主詳細ページ → 自動チェック → メール送信

- [ ] 11. Final checkpoint - 全機能の動作確認
  - すべてのテストがパスすることを確認
  - 実際のユーザーフローで動作確認
  - ユーザーに最終確認

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
