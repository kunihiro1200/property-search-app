# Implementation Plan: Buyer Detail Gmail Template Selection

## Overview

買主詳細ページのGmail送信機能を改善し、問合せ件数に関わらずメール送信を可能にする。テンプレート選択、物件選択、プレースホルダー置換、送信履歴記録の機能を実装する。

## Tasks

- [x] 1. データベーススキーマの拡張
  - email_historyテーブルにtemplate_idとtemplate_nameカラムを追加
  - マイグレーションファイルを作成
  - _Requirements: 6.4_

- [ ] 2. メールテンプレートの定義と管理
  - [x] 2.1 EmailTemplateインターフェースとデータ型を定義
    - TypeScript型定義を作成
    - プレースホルダーの型定義を含める
    - _Requirements: 2.2, 2.5_

  - [x] 2.2 初期テンプレートデータを作成
    - 問合せ返信テンプレート
    - 内覧案内テンプレート
    - フォローアップテンプレート
    - _Requirements: 2.2_

  - [ ]* 2.3 テンプレート管理のユニットテストを作成
    - テンプレート取得のテスト
    - プレースホルダー検証のテスト
    - _Requirements: 2.2_

- [ ] 3. バックエンドサービスの実装
  - [x] 3.1 EmailTemplateServiceを実装
    - getTemplates()メソッド
    - getTemplateById()メソッド
    - mergePlaceholders()メソッド
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 3.2 プレースホルダー置換のプロパティテストを作成
    - **Property 5: Placeholder replacement completeness**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 3.3 EmailHistoryServiceを拡張
    - recordEmailSent()にtemplate情報を追加
    - getEmailHistory()でtemplate情報を取得
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 3.4 メール履歴記録のプロパティテストを作成
    - **Property 6: Email history recording**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

  - [x] 3.4 GmailSendServiceを拡張
    - テンプレートIDを含むメール送信
    - バリデーション強化
    - _Requirements: 7.1, 7.2_

- [ ] 4. フロントエンドコンポーネントの実装
  - [x] 4.1 GmailSendButtonコンポーネントを更新
    - 問合せ件数に基づく表示ロジック
    - クリックハンドラーの実装
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 4.2 ボタン表示のプロパティテストを作成
    - **Property 1: Button visibility consistency**
    - **Validates: Requirements 1.1**

  - [x] 4.3 TemplateSelectionModalコンポーネントを作成
    - テンプレート一覧表示
    - テンプレートプレビュー
    - 選択とキャンセル機能
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 4.4 テンプレート選択のプロパティテストを作成
    - **Property 2: Template selection completeness**
    - **Validates: Requirements 2.2, 2.5**

  - [x] 4.5 PropertySelectionModalコンポーネントを作成
    - 物件一覧表示
    - デフォルト選択ロジック
    - 選択とキャンセル機能
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.6 物件選択のプロパティテストを作成
    - **Property 4: Multiple inquiry default selection**
    - **Validates: Requirements 4.3**

  - [x] 4.7 EmailCompositionFormコンポーネントを更新
    - マージされたテンプレートコンテンツの表示
    - 送信前のプレビュー
    - 送信とキャンセル機能
    - _Requirements: 5.3_

- [ ] 5. メールフロー統合
  - [x] 5.1 単一問合せフローを実装
    - 自動物件選択ロジック
    - テンプレート選択 → 作成フォーム
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 5.2 単一問合せのプロパティテストを作成
    - **Property 3: Single inquiry auto-selection**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 5.3 複数問合せフローを実装
    - 物件選択 → テンプレート選択 → 作成フォーム
    - デフォルト物件選択ロジック
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.4 テンプレートと物件データのマージ処理
    - プレースホルダー置換ロジック
    - フォールバック値の処理
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. エラーハンドリングとフィードバック
  - [x] 6.1 ローディング状態の実装
    - テンプレート読み込み中の表示
    - メール送信中の表示
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 エラーメッセージとリトライ機能
    - テンプレート読み込みエラー
    - メール送信エラー
    - リトライボタンの実装
    - _Requirements: 7.3, 7.5_

  - [ ]* 6.3 エラーハンドリングのプロパティテストを作成
    - **Property 7: Error feedback provision**
    - **Validates: Requirements 7.3, 7.5**

  - [x] 6.4 成功通知の実装
    - メール送信成功メッセージ
    - 履歴への反映確認
    - _Requirements: 7.4_

  - [x] 6.5 UI状態管理の実装
    - 選択中の物件の明示
    - ボタンの無効化/有効化
    - _Requirements: 7.6_

- [ ] 7. Checkpoint - 基本機能の動作確認
  - すべてのテストがパスすることを確認
  - 単一問合せと複数問合せの両方のフローをテスト
  - ユーザーに質問があれば確認

- [ ] 8. 統合テストとE2Eテスト
  - [ ]* 8.1 フルフローの統合テストを作成
    - ボタンクリック → テンプレート選択 → 送信 → 履歴記録
    - 単一問合せフロー
    - 複数問合せフロー

  - [ ]* 8.2 Gmail API統合テストを作成
    - 実際のメール送信テスト（テスト環境）
    - エラーハンドリングのテスト

- [ ] 9. UIの最終調整
  - [ ] 9.1 レスポンシブデザインの確認
    - モバイル表示の調整
    - タブレット表示の調整

  - [ ] 9.2 アクセシビリティの確認
    - キーボードナビゲーション
    - スクリーンリーダー対応

  - [ ] 9.3 ユーザビリティの改善
    - ボタン配置の最適化
    - モーダルのアニメーション
    - フィードバックの視認性

- [ ] 10. Final checkpoint - 全機能の動作確認
  - すべてのテストがパスすることを確認
  - 実際のユーザーフローで動作確認
  - ユーザーに最終確認

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
