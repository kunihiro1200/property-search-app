# Implementation Plan: 問合せ履歴チェックボックスGmail送信機能

## Overview

買主詳細ページの問合せ履歴テーブルでチェックボックスを使って物件を選択し、物件選択モーダルをスキップして直接Gmail作成画面を開く機能を実装します。

## Tasks

- [x] 1. BuyerGmailSendButtonコンポーネントの変更
  - selectedPropertyIds propsを追加
  - PropertySelectionModal関連のコードを削除（import、state、ハンドラー）
  - handleClickロジックを変更（選択数チェック→直接テンプレート選択）
  - 選択数表示UIを追加
  - エラーメッセージ表示を追加（選択物件なしの場合）
  - _Requirements: 1.4, 1.5, 3.1, 3.2, 6.1_

- [ ]* 1.1 BuyerGmailSendButtonのユニットテストを作成
  - selectedPropertyIds.size === 0の場合、ボタンが無効化されることをテスト
  - selectedPropertyIds.size > 0の場合、ボタンが有効化されることをテスト
  - クリック時にPropertySelectionModalが表示されないことをテスト
  - クリック時にTemplateSelectionModalが表示されることをテスト
  - 選択数が正しく表示されることをテスト
  - _Requirements: 1.4, 1.5, 3.1, 3.2_

- [ ]* 1.2 Property Test: Gmail送信ボタンの有効/無効状態
  - **Property 2: Gmail送信ボタンの有効/無効状態**
  - **Validates: Requirements 1.4, 1.5**

- [ ] 2. バックエンドAPIの拡張
  - [x] 2.1 複数物件対応のテンプレートマージエンドポイントを作成
    - `/api/email-templates/:id/merge-multiple`エンドポイントを実装
    - 複数物件IDsを受け取る
    - 各物件のデータを並列取得
    - フォーマットされたメール本文を生成（複数物件の情報を含む）
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 2.2 テンプレートマージAPIのユニットテストを作成
    - 複数物件のデータが正しくマージされることをテスト
    - 物件データ欠損時のエラーハンドリングをテスト
    - フォーマットされた本文に全物件情報が含まれることをテスト
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.3_

  - [ ]* 2.3 Property Test: 複数物件情報のメール本文挿入
    - **Property 4: 複数物件情報のメール本文挿入**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 3. BuyerEmailCompositionModalの更新
  - propertyId → propertyIds（配列）に変更
  - 複数物件の情報を表示するUIを追加
  - mergedContentに複数物件データが含まれることを前提とした処理に変更
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 3.1 BuyerEmailCompositionModalのユニットテストを作成
  - 複数物件のデータが正しく表示されることをテスト
  - メール本文に全物件の情報が含まれることをテスト
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. 買主詳細ページの統合
  - [x] 4.1 BuyerDetailPageでselectedPropertyIds stateを管理
    - useState<Set<string>>を追加
    - InquiryHistoryTableにselectedPropertyIdsとonSelectionChangeを渡す
    - BuyerGmailSendButtonにselectedPropertyIdsを渡す
    - _Requirements: 2.1, 2.2_

  - [ ]* 4.2 Property Test: チェックボックス選択状態の一貫性
    - **Property 1: チェックボックス選択状態の一貫性**
    - **Validates: Requirements 1.2, 2.1, 2.2**

- [x] 5. PropertySelectionModalの削除
  - PropertySelectionModal.tsxファイルを削除
  - すべてのimportを削除
  - 関連するstateとハンドラーを削除
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Checkpoint - 基本機能の動作確認
  - すべてのテストがパスすることを確認
  - ユーザーが質問する場合は対応

- [x] 7. エラーハンドリングの実装
  - 選択物件なしエラーの表示
  - API通信エラーの表示
  - 物件データ欠損エラーの表示
  - Gmail API送信エラーの表示
  - すべてのエラーをログに記録
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 7.1 エラーハンドリングのユニットテストを作成
  - 各エラーケースで適切なメッセージが表示されることをテスト
  - エラーログが記録されることをテスト
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 7.2 Property Test: エラーハンドリングの完全性
  - **Property 6: エラーハンドリングの完全性**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 8. 統合テストとエンドツーエンドテスト
  - [x] 8.1 エンドツーエンドフローのテスト
    - チェックボックス選択→Gmail送信→テンプレート選択→メール作成の一連のフローをテスト
    - 複数物件選択時のフローをテスト
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 8.2 Property Test: 物件選択モーダルのスキップ
    - **Property 3: 物件選択モーダルのスキップ**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 8.3 既存機能の互換性テスト
    - テンプレート選択機能が正常に動作することをテスト
    - 送信者選択機能が正常に動作することをテスト
    - Gmail API統合が正常に動作することをテスト
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 8.4 Property Test: テンプレート選択機能の保持
    - **Property 5: テンプレート選択機能の保持**
    - **Validates: Requirements 5.1, 5.3**

- [x] 9. Final Checkpoint - すべてのテストがパスすることを確認
  - すべてのテストがパスすることを確認
  - ユーザーが質問する場合は対応

## Notes

- タスクに`*`が付いているものはオプションで、コア機能の実装を優先する場合はスキップ可能
- 各タスクは具体的な要件を参照しており、トレーサビリティを確保
- チェックポイントで段階的に検証を行い、問題を早期に発見
- プロパティテストは各プロパティごとに最低100回の反復テストを実行
- ユニットテストとプロパティテストは相補的で、両方が包括的なカバレッジを提供
