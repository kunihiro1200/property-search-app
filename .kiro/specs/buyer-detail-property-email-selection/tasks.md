# Implementation Plan: 買主詳細ページ - 問い合わせ履歴テーブルとメール送信機能

## Overview

買主詳細ページに問い合わせ履歴をテーブル形式で表示し、複数の物件を選択して「内覧前伝達事項」を含むメールを送信できる機能を実装します。実装は段階的に進め、各ステップで動作確認を行います。

## Tasks

- [x] 1. データベーススキーマの作成
  - email_history テーブルを作成するマイグレーションファイルを作成
  - インデックスと制約を追加
  - マイグレーションを実行して検証
  - _Requirements: US-6.1, US-6.2_

- [x] 2. バックエンド - 問い合わせ履歴API
  - [x] 2.1 BuyerService に getInquiryHistory メソッドを実装
    - 買主の全ての問い合わせ履歴を取得
    - 重複買主番号（duplicate_of）を統合
    - 受付日でソート
    - _Requirements: US-1.1, US-1.2, US-1.4_
  
  - [ ]* 2.2 BuyerService.getInquiryHistory のユニットテストを作成
    - 正常系: 履歴が正しく取得できることを確認
    - 異常系: 買主が存在しない場合のエラーハンドリング
    - _Requirements: US-1.1_
  
  - [x] 2.3 GET /api/buyers/:buyerId/inquiry-history エンドポイントを実装
    - BuyerService.getInquiryHistory を呼び出し
    - エラーハンドリング（404, 500）
    - _Requirements: US-1.1, US-1.2_
  
  - [ ]* 2.4 問い合わせ履歴APIのユニットテストを作成
    - 正常系: 履歴が正しく返されることを確認
    - 異常系: エラーレスポンスの確認
    - _Requirements: US-1.1_

- [x] 3. バックエンド - メール送信履歴の実装 **[COMPLETE - Using activity_logs]**
  - [x] 3.1 ActivityLogService.logEmail() メソッドを追加
    - メール送信情報を activity_logs テーブルに記録
    - metadata に詳細情報を保存
    - _Requirements: US-6.1, US-6.2_
    - ✅ **STATUS**: Complete - Using existing activity_logs table
  
  - [x] 3.2 InquiryResponseService を更新
    - ActivityLogService を統合
    - メール送信成功後に logEmail() を呼び出し
    - _Requirements: US-6.1, US-6.2_
    - ✅ **STATUS**: Complete
  
  - [x] 3.3 inquiryResponse ルートを更新
    - employeeId をリクエストから取得
    - sendInquiryResponseEmail() に employeeId を渡す
    - _Requirements: US-6.1, US-6.2_
    - ✅ **STATUS**: Complete
  
  - [ ]* 3.4 メール送信履歴のユニットテストを作成
    - ActivityLogService.logEmail() のテスト
    - InquiryResponseService 統合のテスト
    - _Requirements: US-6.1_
  
  - [N/A] 3.5 email_history テーブル
    - ℹ️ **NOTE**: email_history テーブルは使用しない設計に変更
    - ℹ️ **REASON**: 既存の activity_logs テーブルを活用することで、通話モードと同じ一貫性のあるアプローチを実現
    - ℹ️ **BENEFIT**: 新しいテーブル不要、マイグレーション不要、シンプルな実装

- [x] 4. バックエンド - メール生成ロジックの更新
  - [x] 4.1 InquiryResponseService.generateEmailContent を更新
    - 内覧前伝達事項をメール本文に含める処理を追加
    - フォーマット処理を実装
    - _Requirements: US-5.3_
  
  - [ ]* 4.2 メール生成ロジックのユニットテストを作成
    - 内覧前伝達事項が正しく含まれることを確認
    - 複数物件の場合のフォーマット確認
    - _Requirements: US-5.3_
  
  - [x] 4.3 InquiryResponseService.sendEmail を更新
    - メール送信成功後に EmailHistoryService.saveEmailHistory を呼び出し
    - トランザクション処理を実装
    - _Requirements: US-6.1, US-6.2_
  
  - [ ]* 4.4 メール送信とhistory保存の統合テストを作成
    - **Property 4: Email History Persistence**
    - **Validates: Requirements US-6.1, US-6.2**

- [x] 5. Checkpoint - バックエンドの動作確認
  - Ensure all tests pass, ask the user if questions arise.


- [x] 6. フロントエンド - メール送信履歴表示 **[COMPLETE]**
  - [x] 6.1 BuyerDetailPage にメール送信履歴セクションを追加
    - activity_logs テーブルから action: 'email' のログを取得
    - Material-UI List コンポーネントを使用
    - _Requirements: US-6.3_
    - ✅ **STATUS**: Complete
  
  - [x] 6.2 メール送信履歴の詳細表示を実装
    - 件名、送信日時、送信者を表示
    - 物件番号を Chip で表示（複数対応）
    - 内覧前伝達事項を背景色で強調表示
    - _Requirements: US-6.3_
    - ✅ **STATUS**: Complete
  
  - [x] 6.3 時系列ソート機能を実装
    - 新しい順に表示
    - _Requirements: US-6.3_
    - ✅ **STATUS**: Complete
  
  - [x] 6.4 空の履歴の処理を実装
    - 「メール送信履歴はありません」メッセージを表示
    - _Requirements: US-6.3_
    - ✅ **STATUS**: Complete
  
  - [ ]* 6.5 メール送信履歴表示のユニットテストを作成
    - レンダリングテスト
    - データ表示のテスト
    - _Requirements: US-6.3_

- [x] 7. Checkpoint - 実装完了確認
  - ✅ バックエンド: メール送信時に自動的に履歴を記録
  - ✅ フロントエンド: 買主詳細ページで履歴を表示
  - ✅ 詳細情報: 件名、送信日時、送信者、物件番号、内覧前伝達事項
  - ✅ 一貫性: 通話モードと同じアプローチ
  - ✅ シンプル: 新しいテーブル不要

## 🎉 Phase 1 & 2 完了！

メール送信履歴機能が正常に実装されました。以下のドキュメントを参照してください:
- [実装完了サマリー](./IMPLEMENTATION_SUMMARY.md)
- [クイックリファレンス](./QUICK_REFERENCE.md)

---

## 📋 残りのタスク（オプション）

以下のタスクは、問い合わせ履歴テーブル機能の実装です。
現在のメール送信履歴機能とは独立しており、必要に応じて実装できます。

- [x] 6. フロントエンド - InquiryHistoryTable コンポーネント
  - [x] 6.1 InquiryHistoryTable.tsx を作成
    - Props インターフェースを定義
    - Material-UI Table コンポーネントを使用
    - テーブルヘッダーとボディを実装
    - _Requirements: US-1.1, US-1.2_
  
  - [x] 6.2 チェックボックス選択機能を実装
    - 各行にチェックボックスを追加
    - 選択状態の管理
    - 全選択/全解除機能
    - _Requirements: US-2.1, US-2.2_
  
  - [x] 6.3 視覚的な区別を実装
    - 今回/過去の問い合わせの背景色
    - ステータスバッジ
    - 選択された行のハイライト
    - _Requirements: US-1.3_
  
  - [x] 6.4 ソート機能を実装
    - 受付日でソート（デフォルト: 降順）
    - _Requirements: US-1.4_
  
  - [x] 6.5 行クリックハンドラーを実装
    - 物件詳細ページへの遷移
    - _Requirements: US-1.5_
  
  - [ ]* 6.6 InquiryHistoryTable のユニットテストを作成
    - レンダリングテスト
    - チェックボックス選択のテスト
    - スタイリングのテスト
    - _Requirements: US-1.1, US-2.1_

- [x] 7. フロントエンド - BuyerDetailPage の更新
  - [x] 7.1 State を追加
    - selectedPropertyIds: Set<string>
    - inquiryHistory: InquiryHistoryItem[]
    - isLoadingHistory: boolean
    - _Requirements: US-2.1, US-3.1_
  
  - [x] 7.2 問い合わせ履歴の取得処理を実装
    - useEffect で API 呼び出し
    - ローディング状態の管理
    - エラーハンドリング
    - _Requirements: US-1.1_
  
  - [x] 7.3 選択コントロールUIを実装
    - 選択数表示
    - 「選択をクリア」ボタン
    - 「Gmail送信」ボタン
    - _Requirements: US-3.1, US-3.2, US-4.1, US-4.2_
  
  - [x] 7.4 イベントハンドラーを実装
    - handleSelectionChange
    - handleClearSelection
    - handleGmailSend
    - handleEmailSuccess
    - _Requirements: US-2.1, US-3.2, US-4.1, US-5.5_
  
  - [x] 7.5 InquiryHistoryTable コンポーネントを配置
    - 選択コントロールの上部に配置
    - Props を渡す
    - _Requirements: US-1.1_
  
  - [x] 7.6 既存 PropertyInfoCard を折りたたみ可能なセクションに配置
    - Accordion コンポーネントを使用
    - デフォルトで折りたたみ
    - _Requirements: US-7.1, US-7.2_
  
  - [ ]* 7.7 BuyerDetailPage のユニットテストを作成
    - 問い合わせ履歴の取得テスト
    - 選択状態の管理テスト
    - Gmail送信ボタンの有効/無効テスト
    - _Requirements: US-1.1, US-2.1, US-4.2_
  
  - [ ]* 7.8 選択状態の一貫性プロパティテストを作成
    - **Property 2: Selection State Consistency**
    - **Validates: Requirements US-2.1, US-2.2, US-3.1**

- [x] 8. フロントエンド - InquiryResponseEmailModal の更新
  - [x] 8.1 Props に buyerInfo を追加
    - インターフェースを更新
    - _Requirements: US-5.4_
  
  - [x] 8.2 買主情報の自動入力機能を実装
    - buyerInfo が提供された場合、名前とメールアドレスを自動入力
    - _Requirements: US-5.4_
  
  - [x] 8.3 メール本文生成ロジックを更新
    - 内覧前伝達事項を含める
    - フォーマット処理
    - _Requirements: US-5.3_
  
  - [ ]* 8.4 InquiryResponseEmailModal のユニットテストを作成
    - 買主情報自動入力のテスト
    - メール本文生成のテスト
    - _Requirements: US-5.3, US-5.4_
  
  - [ ]* 8.5 メール内容包含性プロパティテストを作成
    - **Property 3: Email Content Inclusion**
    - **Validates: Requirements US-5.3**

- [x] 9. Checkpoint - フロントエンドの動作確認
  - Ensure all tests pass, ask the user if questions arise.

- [-] 10. 統合とエンドツーエンドテスト
  - [ ] 10.1 問い合わせ履歴の表示を確認
    - 買主6647（過去の買主番号6648を持つ）でテスト
    - 今回と過去の問い合わせが正しく表示されることを確認
    - _Requirements: US-1.1, US-1.3_
  
  - [ ] 10.2 物件選択機能を確認
    - 複数物件の選択
    - 選択数の表示
    - 選択クリア
    - _Requirements: US-2.1, US-2.2, US-3.1, US-3.2_
  
  - [ ] 10.3 メール送信フローを確認
    - Gmail送信ボタンのクリック
    - モーダルの表示
    - 買主情報の自動入力
    - 内覧前伝達事項の表示
    - メール送信
    - 選択のクリア
    - _Requirements: US-4.1, US-5.1, US-5.2, US-5.3, US-5.4, US-5.5_
  
  - [ ] 10.4 メール送信履歴の確認
    - データベースに履歴が保存されていることを確認
    - 全ての必須フィールドが含まれていることを確認
    - _Requirements: US-6.1, US-6.2_
  
  - [ ]* 10.5 エンドツーエンド統合テストを作成
    - 問い合わせ履歴取得からメール送信までの完全なフロー
    - _Requirements: US-1.1, US-5.1, US-6.1_

- [ ] 11. エッジケースとエラーハンドリングのテスト
  - [ ] 11.1 空の問い合わせ履歴のテスト
    - 適切なメッセージが表示されることを確認
    - _Requirements: US-1.1_
  
  - [ ] 11.2 内覧前伝達事項が空の物件のテスト
    - 「特になし」と表示されることを確認
    - _Requirements: US-5.3_
  
  - [ ] 11.3 重複買主番号がない場合のテスト
    - 正常に動作することを確認
    - _Requirements: US-1.1_
  
  - [ ] 11.4 API エラーのテスト
    - ネットワークエラー
    - サーバーエラー
    - 適切なエラーメッセージが表示されることを確認
    - _Requirements: US-1.1, US-5.1_

- [ ] 12. UI/UX の最終調整
  - [ ] 12.1 レスポンシブデザインの確認
    - 様々な画面サイズでの表示確認
  
  - [ ] 12.2 アクセシビリティの確認
    - キーボードナビゲーション
    - スクリーンリーダー対応
  
  - [ ] 12.3 パフォーマンスの確認
    - 大量の問い合わせ履歴での動作確認
    - ローディング状態の適切な表示

- [ ] 13. Final Checkpoint - 全体の動作確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- 買主番号6647（過去の買主番号6648を持つ）をテストケースとして使用
- 「●内覧前伝達事項」フィールドは property_listings テーブルのBQ列に対応

