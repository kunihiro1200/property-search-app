# Implementation Plan: 買主詳細画面のGoogle Chat送信機能

## Overview

買主詳細画面に「担当への確認事項」フィールドを使ったGoogle Chat送信機能を追加します。この実装計画では、データベースマイグレーションから始まり、バックエンドサービス、APIエンドポイント、フロントエンドコンポーネントの順に実装を進めます。

## Tasks

- [x] 1. データベースマイグレーションとスキーマ変更
  - `buyers`テーブルに`confirmation_to_assignee`カラムを追加
  - マイグレーションファイルを作成: `backend/migrations/add_confirmation_to_assignee.sql`
  - マイグレーションを実行してカラムが正しく追加されることを確認
  - _Requirements: 6.1, 6.2_

- [x] 2. GoogleChatServiceの実装
  - [x] 2.1 GoogleChatServiceクラスを作成
    - ファイル: `backend/src/services/GoogleChatService.ts`
    - `sendMessage(webhookUrl: string, message: string)`メソッドを実装
    - axiosを使用してPOSTリクエストを送信
    - タイムアウト: 10秒
    - エラーハンドリング: ネットワークエラー、タイムアウト、4xx/5xxレスポンス
    - _Requirements: 4.1_
  
  - [ ]* 2.2 GoogleChatServiceのunit testsを作成
    - 正常系: 有効なWebhook URLへのメッセージ送信
    - 異常系: 無効なWebhook URL、ネットワークタイムアウト、APIエラー
    - _Requirements: 4.1, 5.2, 5.3_

- [x] 3. StaffManagementServiceの実装
  - [x] 3.1 StaffManagementServiceクラスを作成
    - ファイル: `backend/src/services/StaffManagementService.ts`
    - `getWebhookUrl(assigneeName: string)`メソッドを実装
    - GoogleSheetsClientを使用してスプレッドシートを読み取り
    - スプレッドシートID: `19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs`
    - シート名: `スタッフ`
    - カラムマッピング: A列（イニシャル）、C列（名前）、F列（Chat webhook）
    - キャッシュ機能: 60分間
    - 検索ロジック: イニシャルまたは名前で完全一致検索
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 3.2 StaffManagementServiceのunit testsを作成
    - 正常系: イニシャルで検索、名前で検索、キャッシュ機能
    - 異常系: 存在しない担当者、空のWebhook URL、スプレッドシートアクセスエラー
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1_

- [x] 4. APIエンドポイントの実装
  - [x] 4.1 POST /api/buyers/:buyer_number/send-confirmationエンドポイントを作成
    - ファイル: `backend/src/routes/buyers.ts`
    - リクエストボディ: `{ confirmationText: string }`
    - 処理フロー:
      1. buyer_numberで買主を取得
      2. property_numberが存在するか確認
      3. 紐づく物件を取得
      4. sales_assigneeが存在するか確認
      5. StaffManagementService.getWebhookUrl()でWebhook URLを取得
      6. メッセージをフォーマット
      7. GoogleChatService.sendMessage()でメッセージ送信
    - エラーハンドリング: 400, 404, 500エラー
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 4.2 APIエンドポイントのunit testsを作成
    - 正常系: メッセージ送信成功
    - 異常系: 買主が見つからない、property_numberが存在しない、sales_assigneeが存在しない、担当者が見つからない、Webhook URLが空、Google Chat APIエラー
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_

- [x] 5. Checkpoint - バックエンドテストの実行
  - 全てのunit testsが成功することを確認
  - エラーがある場合はユーザーに報告

- [x] 6. フロントエンドコンポーネントの実装
  - [x] 6.1 ConfirmationToAssigneeコンポーネントを作成
    - ファイル: `frontend/src/components/ConfirmationToAssignee.tsx`
    - Props: `buyer`, `propertyAssignee`, `onSendSuccess`
    - State: `confirmationText`, `isSending`, `error`, `successMessage`
    - UI構成:
      - テキストエリア（InlineEditableField使用）
      - 送信セクション（テキストが入力されている場合のみ表示）
      - 送信ボタン
      - 成功/エラーメッセージ
    - 送信処理: POST /api/buyers/:buyer_number/send-confirmation
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 4.3, 4.4, 4.5_
  
  - [ ]* 6.2 ConfirmationToAssigneeコンポーネントのunit testsを作成
    - 正常系: フィールド表示、送信セクション表示、送信成功、テキスト保持
    - 異常系: エラーメッセージ表示
    - _Requirements: 1.4, 2.1, 2.2, 2.3, 2.4, 4.3, 4.4, 4.5_

- [x] 7. BuyerDetailPageの変更
  - [x] 7.1 BUYER_FIELD_SECTIONSからconfirmation_to_assigneeを削除
    - ファイル: `frontend/src/pages/BuyerDetailPage.tsx`
    - 「その他」セクションから`confirmation_to_assignee`フィールドを削除
    - _Requirements: 1.1_
  
  - [x] 7.2 ConfirmationToAssigneeコンポーネントを配置
    - 「問合時ヒアリング」フィールドの下に配置
    - 表示条件: `linkedProperties.length > 0 && linkedProperties[0].sales_assignee`
    - `propertyAssignee`として`linkedProperties[0].sales_assignee`を渡す
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 7.3 BuyerDetailPageの統合テストを作成
    - コンポーネントが正しい位置に配置されていることを確認
    - 表示条件が正しく動作することを確認
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 8. Checkpoint - フロントエンドテストの実行
  - 全てのunit testsが成功することを確認
  - エラーがある場合はユーザーに報告

- [ ] 9. Property-Based Testsの実装
  - [ ]* 9.1 Property 1: Confirmation Field Display Conditionのテストを作成
    - **Property 1: Confirmation Field Display Condition**
    - **Validates: Requirements 1.2, 1.3**
    - fast-checkを使用してランダムな買主データと物件データを生成
    - property_numberとsales_assigneeの存在に応じてフィールドが表示/非表示になることを検証
  
  - [ ]* 9.2 Property 2: Send Section Display Conditionのテストを作成
    - **Property 2: Send Section Display Condition**
    - **Validates: Requirements 2.1, 2.4**
    - fast-checkを使用してランダムなテキストを生成
    - テキストの有無に応じて送信セクションが表示/非表示になることを検証
  
  - [ ]* 9.3 Property 3: Send Section Contentのテストを作成
    - **Property 3: Send Section Content**
    - **Validates: Requirements 2.2, 2.3**
    - fast-checkを使用してランダムな担当者名を生成
    - 送信セクションに送信ボタンと正しいフォーマットのラベルが含まれることを検証
  
  - [ ]* 9.4 Property 4: Staff Webhook Lookupのテストを作成
    - **Property 4: Staff Webhook Lookup**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - fast-checkを使用してランダムな担当者名（イニシャルまたは名前）を生成
    - スプレッドシート検索が正しく動作することを検証
  
  - [ ]* 9.5 Property 5: Message Formatのテストを作成
    - **Property 5: Message Format**
    - **Validates: Requirements 4.2**
    - fast-checkを使用してランダムな買主データを生成
    - メッセージが正しいフォーマットで作成されることを検証
  
  - [ ]* 9.6 Property 6: Message Sendingのテストを作成
    - **Property 6: Message Sending**
    - **Validates: Requirements 4.1**
    - fast-checkを使用してランダムなWebhook URLとメッセージを生成
    - Google Chat APIへのPOSTリクエストが正しく送信されることを検証
  
  - [ ]* 9.7 Property 7: Confirmation Field Persistenceのテストを作成
    - **Property 7: Confirmation Field Persistence**
    - **Validates: Requirements 4.5**
    - fast-checkを使用してランダムなテキストを生成
    - 送信後にテキストが保持されることを検証
  
  - [ ]* 9.8 Property 8: Error Retry Capabilityのテストを作成
    - **Property 8: Error Retry Capability**
    - **Validates: Requirements 5.4**
    - fast-checkを使用してランダムなエラーを生成
    - エラー後に送信ボタンが有効なままであることを検証
  
  - [ ]* 9.9 Property 9: Error Loggingのテストを作成
    - **Property 9: Error Logging**
    - **Validates: Requirements 5.5**
    - fast-checkを使用してランダムなエラーを生成
    - エラーログが記録されることを検証
  
  - [ ]* 9.10 Property 10: Database Field Persistenceのテストを作成
    - **Property 10: Database Field Persistence**
    - **Validates: Requirements 6.3**
    - fast-checkを使用してランダムなテキストを生成
    - データベースに正しく保存されることを検証
  
  - [ ]* 9.11 Property 11: Spreadsheet Syncのテストを作成
    - **Property 11: Spreadsheet Sync**
    - **Validates: Requirements 6.4**
    - fast-checkを使用してランダムなテキストを生成
    - スプレッドシートに同期されることを検証（同期が有効な場合）

- [ ] 10. 統合テストの実装
  - [ ]* 10.1 エンドツーエンドの統合テストを作成
    - 買主作成 → 物件作成 → 確認事項送信 → Google Chatメッセージ送信
    - 全てのコンポーネントが正しく連携することを検証
    - _Requirements: 全要件_

- [ ] 11. Final Checkpoint - 全テストの実行
  - 全てのunit tests、property tests、integration testsが成功することを確認
  - エラーがある場合はユーザーに報告
  - テストカバレッジが80%以上であることを確認

- [x] 12. ドキュメントの更新
  - README.mdに機能説明を追加
  - 環境変数の設定方法を追加
  - スタッフ管理スプレッドシートの設定方法を追加

## Notes

- タスクに`*`が付いているものはオプション（テスト関連）で、スキップ可能です
- 各タスクは前のタスクに依存しているため、順番に実行してください
- Checkpointタスクでは、必ずテストを実行してエラーがないことを確認してください
- Property-Based Testsは最小100回の反復実行を行います
- システム隔離ルールを遵守し、買主管理システムのファイルのみを変更してください

---

**最終更新日**: 2026年2月6日  
**作成者**: Kiro AI Assistant  
**レビュー状態**: 承認待ち
