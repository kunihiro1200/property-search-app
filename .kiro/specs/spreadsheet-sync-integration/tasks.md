# Implementation Plan

- [x] 1. Google Sheets API セットアップと認証



  - Google Cloud Consoleでプロジェクトを作成
  - Google Sheets APIを有効化
  - サービスアカウントを作成してJSONキーをダウンロード
  - スプレッドシートにサービスアカウントを編集者として追加
  - 環境変数を設定（GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, etc.）


  - _Requirements: 2.1, 2.4_

- [x] 2. GoogleSheetsClient実装

  - googleapis npmパッケージをインストール
  - GoogleSheetsClientクラスを作成
  - 認証メソッドを実装（サービスアカウント認証）
  - 読み取りメソッドを実装（readAll, readRange）
  - 書き込みメソッドを実装（appendRow, updateRow, deleteRow）
  - バッチ更新メソッドを実装（batchUpdate）
  - _Requirements: 2.1, 2.4, 3.1_

- [ ]* 2.1 Write unit tests for GoogleSheetsClient
  - Test authentication logic
  - Test read operations with mocked API responses


  - Test write operations with mocked API responses
  - Test error handling for network failures
  - _Requirements: 2.1, 2.2, 2.3_


- [x] 3. ColumnMapper実装


  - ColumnMapperクラスを作成
  - スプレッドシート → Supabaseマッピングを実装（mapToDatabase）
  - Supabase → スプレッドシートマッピングを実装（mapToSheet）
  - バリデーションロジックを実装（validate）
  - カラムマッピング設定ファイルを作成（JSON形式）
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 3.1 Write property test for column mapping reversibility
  - **Property 7: Column Mapping Reversibility**
  - **Validates: Requirements 7.2**
  - Generate random seller data
  - Map to spreadsheet format and back
  - Verify all required fields are preserved
  - _Requirements: 7.2_

- [x]* 3.2 Write unit tests for ColumnMapper



  - Test mapToDatabase with various input formats
  - Test mapToSheet with various seller data
  - Test validation logic for invalid data
  - Test data type conversions (string to number, date formatting)
  - _Requirements: 7.2, 7.3, 7.4_





- [ ] 4. 初回データ移行スクリプト実装
  - MigrationServiceクラスを作成
  - スプレッドシートから全データを読み取る機能を実装
  - バッチ処理ロジックを実装（100件ずつ）
  - Supabaseへのデータ挿入を実装
  - 重複チェックロジックを実装（seller_numberで判定）
  - 移行結果レポート機能を実装
  - ドライラン機能を実装（実際には挿入しない）
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ]* 4.1 Write property test for migration completeness
  - **Property 4: Migration Completeness**
  - **Validates: Requirements 1.1, 1.3**
  - Generate random spreadsheet data
  - Run migration
  - Verify success + failure count equals total rows
  - _Requirements: 1.1, 1.3_

- [ ]* 4.2 Write unit tests for migration logic
  - Test batch processing with various batch sizes
  - Test duplicate detection and handling
  - Test error handling during migration
  - Test dry-run mode
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 5. SpreadsheetSyncService実装
  - SpreadsheetSyncServiceクラスを作成
  - syncToSpreadsheet メソッドを実装（単一レコード同期）
  - syncBatchToSpreadsheet メソッドを実装（バッチ同期）
  - スプレッドシートの行を検索する機能を実装（seller_numberで検索）
  - 新規行追加ロジックを実装
  - 既存行更新ロジックを実装
  - 削除ロジックを実装（論理削除または物理削除）
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 5.1 Write property test for data consistency after sync
  - **Property 1: Data Consistency After Sync**
  - **Validates: Requirements 3.1, 3.2**
  - Generate random seller data
  - Sync to spreadsheet
  - Read back from spreadsheet
  - Verify data matches
  - _Requirements: 3.1, 3.2_

- [ ]* 5.2 Write property test for sync idempotency
  - **Property 3: Sync Idempotency**
  - **Validates: Requirements 3.1**
  - Generate random seller data
  - Sync multiple times
  - Verify no duplicate rows created
  - _Requirements: 3.1_

- [ ]* 5.3 Write unit tests for SpreadsheetSyncService
  - Test single record sync
  - Test batch sync
  - Test row search logic
  - Test create, update, delete operations
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. SyncQueue実装
  - SyncQueueクラスを作成
  - キューイングロジックを実装（enqueue）
  - 順次処理ロジックを実装（process）
  - リトライロジックを実装（exponential backoff）
  - キューステータス取得を実装（getQueueStatus）
  - 永続化機能を実装（Redisまたはデータベース）
  - _Requirements: 3.5, 8.2_

- [ ]* 6.1 Write unit tests for SyncQueue
  - Test enqueue and dequeue operations
  - Test sequential processing
  - Test retry logic with exponential backoff
  - Test queue status reporting
  - _Requirements: 3.5, 8.2_

- [x] 7. エラーハンドリングとロギング実装
  - ErrorLogテーブルをSupabaseに作成（マイグレーション）
  - エラーロギング機能を実装
  - リトライ戦略を実装（RetryConfig）
  - ネットワークエラーハンドリングを実装
  - バリデーションエラーハンドリングを実装
  - レート制限エラーハンドリングを実装
  - _Requirements: 1.2, 3.4, 6.2_

- [ ]* 7.1 Write property test for error recovery
  - **Property 5: Error Recovery**
  - **Validates: Requirements 1.2, 3.4**
  - Simulate sync failures
  - Verify Supabase data remains unchanged
  - Verify errors are logged
  - _Requirements: 1.2, 3.4_

- [ ]* 7.2 Write unit tests for error handling
  - Test network error retry logic
  - Test validation error handling
  - Test rate limit error handling
  - Test error logging
  - _Requirements: 1.2, 3.4, 6.2_

- [x] 8. SellerService統合
  - 既存のSellerServiceを更新
  - 売主作成後に同期をトリガー（create後）
  - 売主更新後に同期をトリガー（update後）
  - 売主削除後に同期をトリガー（delete後）
  - 非同期処理を実装（ユーザーをブロックしない）
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ]* 8.1 Write integration tests for SellerService sync
  - Test seller creation triggers sync
  - Test seller update triggers sync
  - Test seller deletion triggers sync
  - Test async processing doesn't block user
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 9. EmailIntegrationService実装
  - EmailIntegrationServiceクラスを作成
  - 統合APIエンドポイントを作成（POST /api/integration/inquiry-email）
  - メールデータのバリデーションを実装
  - 売主番号生成ロジックを実装（既存のSellerNumberServiceを使用）
  - Supabaseへの売主作成を実装
  - スプレッドシートへの同期を実装
  - エラーハンドリングを実装
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 9.1 Write property test for seller number uniqueness
  - **Property 2: Seller Number Uniqueness**
  - **Validates: Requirements 4.2**
  - Generate multiple sellers
  - Verify all seller numbers are unique
  - Verify sequential pattern (AA1, AA2, ...)
  - _Requirements: 4.2_

- [ ]* 9.2 Write unit tests for EmailIntegrationService
  - Test inquiry email handling
  - Test seller number generation
  - Test data validation
  - Test error handling for invalid data



  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 10. 既存メールシステムとの統合
  - 既存メールシステムのコードを確認
  - 統合ポイントを特定
  - 既存システムから統合APIを呼び出すコードを追加
  - 統合テストを実施
  - エラーハンドリングとリトライを実装
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x]* 10.1 Write integration tests for email system integration



  - Test end-to-end flow from email to Supabase and spreadsheet
  - Test error handling and retry logic
  - Test invalid data handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11. レート制限とパフォーマンス最適化
  - レート制限ロジックを実装（100リクエスト/100秒）
  - バッチ処理の最適化（batchUpdateを使用）
  - 接続プーリングを実装
  - キャッシング機能を実装（カラムヘッダー、認証トークン）
  - パフォーマンステストを実施
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ]* 11.1 Write property test for rate limit compliance
  - **Property 8: Rate Limit Compliance**
  - **Validates: Requirements 8.5**
  - Simulate high-volume sync operations
  - Verify API requests stay under 100 per 100 seconds
  - _Requirements: 8.5_

- [ ]* 11.2 Write property test for batch processing consistency
  - **Property 6: Batch Processing Consistency**
  - **Validates: Requirements 8.1**
  - Generate random seller data
  - Process in batches vs individually
  - Verify same final result
  - _Requirements: 8.1_

- [ ]* 11.3 Write performance tests
  - Test migration of 10,000 rows completes in under 5 minutes
  - Test single record sync completes in under 2 seconds
  - Test batch sync (100 records) completes in under 10 seconds
  - _Requirements: 8.3_

- [x] 12. 同期ステータス監視機能実装
  - SyncLogテーブルをSupabaseに作成（マイグレーション）
  - 同期ログ記録機能を実装
  - 同期ステータス取得APIを実装（GET /api/sync/status）
  - 同期履歴取得APIを実装（GET /api/sync/history）
  - エラーログ取得APIを実装（GET /api/sync/errors）
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 12.1 Write unit tests for sync monitoring
  - Test sync log recording
  - Test status retrieval
  - Test history retrieval
  - Test error log retrieval
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 13. 手動同期機能実装
  - 手動同期APIエンドポイントを作成（POST /api/sync/manual）
  - 全データ同期機能を実装
  - 差分同期機能を実装
  - 進行状況レポート機能を実装（WebSocketまたはSSE）
  - 同時実行制御を実装（既に実行中の場合は拒否）
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 13.1 Write unit tests for manual sync
  - Test full sync trigger
  - Test incremental sync trigger
  - Test progress reporting
  - Test concurrent execution prevention
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 14. ロールバック機能実装
  - スナップショット作成機能を実装
  - ロールバックAPIエンドポイントを作成（POST /api/sync/rollback）
  - スナップショットからのデータ復元を実装
  - ロールバック操作のログ記録を実装
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 14.1 Write unit tests for rollback functionality
  - Test snapshot creation
  - Test data restoration from snapshot
  - Test rollback logging
  - Test error handling when snapshot doesn't exist
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 15. フロントエンド統合
  - 同期ステータス表示コンポーネントを作成
  - 手動同期トリガーボタンを追加
  - 同期履歴表示ページを作成
  - エラーログ表示機能を追加
  - リアルタイム進行状況表示を実装
  - _Requirements: 6.3, 9.2, 9.3_

- [ ]* 15.1 Write UI tests for sync features
  - Test sync status display
  - Test manual sync trigger
  - Test sync history display
  - Test error log display
  - _Requirements: 6.3, 9.2, 9.3_

- [x] 16. 初回データ移行実行
  - テスト環境でドライラン実行
  - 移行結果を確認
  - 本番環境で移行実行
  - データの整合性を確認
  - 移行レポートを作成
  - _Requirements: 1.1, 1.3_

- [x] 17. Checkpoint - すべてのテストが通ることを確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. ドキュメント作成
  - セットアップガイドを作成（Google Sheets API設定手順）
  - 運用マニュアルを作成（手動同期、エラー対応）
  - トラブルシューティングガイドを作成
  - APIドキュメントを作成
  - _Requirements: All_

- [x] 19. 本番環境デプロイ
  - 環境変数を本番環境に設定
  - バックエンドをデプロイ
  - フロントエンドをデプロイ
  - 動作確認テストを実施
  - 監視とアラートを設定
  - _Requirements: All_
