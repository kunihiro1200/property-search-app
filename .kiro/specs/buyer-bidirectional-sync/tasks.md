# Implementation Plan: Buyer Bidirectional Sync

## Overview

買主データの双方向同期機能を実装する。DBへの変更をスプレッドシートに書き戻す機能を追加し、ブラウザ上での編集がスプレッドシートにも反映されるようにする。

## Tasks

- [x] 1. データベーススキーマの拡張
  - [x] 1.1 pending_sync_changes テーブルを作成するマイグレーションを作成
    - テーブル定義: id, buyer_number, field_name, old_value, new_value, attempted_at, retry_count, last_error, status
    - インデックス: status, buyer_number
    - _Requirements: 5.2_
  - [x] 1.2 audit_logs テーブルに sync_status カラムを追加
    - sync_status: synced, pending, failed
    - _Requirements: 4.3, 4.4_

- [x] 2. BuyerColumnMapper の拡張
  - [x] 2.1 getColumnLetter メソッドを追加
    - DBフィールド名からスプレッドシートの列文字（A, B, C...）を取得
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 getColumnIndex メソッドを追加
    - DBフィールド名からスプレッドシートの列インデックス（0始まり）を取得
    - _Requirements: 2.1, 2.2_
  - [ ]* 2.3 Property test for column mapping correctness
    - **Property 4: Column Mapping Correctness**
    - **Validates: Requirements 2.1, 2.2**

- [x] 3. BuyerWriteService の実装
  - [x] 3.1 findRowByBuyerNumber メソッドを実装
    - スプレッドシートから買主番号で行番号を検索
    - _Requirements: 1.4_
  - [x] 3.2 updateField メソッドを実装
    - 単一フィールドをスプレッドシートに書き込み
    - _Requirements: 1.1, 1.5_
  - [x] 3.3 updateFields メソッドを実装
    - 複数フィールドを一括でスプレッドシートに書き込み
    - _Requirements: 7.2_
  - [ ]* 3.4 Property test for spreadsheet write correctness
    - **Property 1: Spreadsheet Write Correctness**
    - **Validates: Requirements 1.1, 1.4, 1.5**
  - [ ]* 3.5 Property test for batch updates
    - **Property 11: Batch Updates**
    - **Validates: Requirements 7.2**

- [x] 4. ConflictResolver の実装
  - [x] 4.1 checkConflict メソッドを実装
    - スプレッドシートの現在値と期待値を比較
    - last_synced_at を使用して競合を検出
    - _Requirements: 3.1, 3.4_
  - [x] 4.2 forceOverwrite メソッドを実装
    - 競合を無視して強制上書き
    - _Requirements: 6.5_
  - [ ]* 4.3 Property test for conflict detection
    - **Property 5: Conflict Detection**
    - **Validates: Requirements 3.1, 3.4**
  - [ ]* 4.4 Property test for conflict reporting
    - **Property 6: Conflict Reporting**
    - **Validates: Requirements 3.2**

- [x] 5. RetryHandler の実装
  - [x] 5.1 executeWithRetry メソッドを実装
    - 最大3回のリトライ
    - 指数バックオフ（1秒、2秒、4秒）
    - _Requirements: 5.1_
  - [x] 5.2 queueFailedChange メソッドを実装
    - 失敗した変更を pending_sync_changes テーブルに保存
    - _Requirements: 5.2_
  - [x] 5.3 processQueue メソッドを実装
    - キューに溜まった変更を処理
    - _Requirements: 5.3_
  - [ ]* 5.4 Property test for retry and recovery
    - **Property 9: Retry and Recovery**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. BuyerService の拡張
  - [x] 7.1 updateWithSync メソッドを追加
    - DB更新後にスプレッドシート同期を実行
    - 同期失敗時は pending_sync としてマーク
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 7.2 audit_logs に sync_status を記録
    - 成功時: synced
    - 失敗時: pending
    - _Requirements: 4.3, 4.4_
  - [ ]* 7.3 Property test for timestamp update
    - **Property 2: Timestamp Update After Sync**
    - **Validates: Requirements 1.2**
  - [ ]* 7.4 Property test for sync status tracking
    - **Property 8: Sync Status Tracking**
    - **Validates: Requirements 4.3, 4.4**

- [x] 8. API エンドポイントの更新
  - [x] 8.1 PUT /api/buyers/:id エンドポイントを更新
    - updateWithSync を使用するように変更
    - force パラメータのサポート追加
    - _Requirements: 6.1, 6.5_
  - [x] 8.2 レスポンス形式を更新
    - syncStatus フィールドを追加
    - conflict 情報を含める
    - _Requirements: 6.3, 6.4_
  - [ ]* 8.3 Property test for API endpoint behavior
    - **Property 10: API Endpoint Behavior**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 9. エラーハンドリングの実装
  - [x] 9.1 エラー種別の定義
    - NetworkError, AuthenticationError, ConflictError, ValidationError, RateLimitError
    - _Requirements: 1.3_
  - [x] 9.2 エラーレスポンス形式の実装
    - code, message, details, syncStatus, conflict
    - _Requirements: 1.3, 3.2_
  - [ ]* 9.3 Property test for error handling
    - **Property 3: Error Handling**
    - **Validates: Requirements 1.3**

- [x] 10. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. フロントエンドの更新
  - [x] 11.1 api.ts に syncStatus 対応を追加
    - レスポンスから syncStatus を取得
    - _Requirements: 6.3_
  - [x] 11.2 BuyerDetailPage に同期ステータス表示を追加
    - pending sync の場合は警告表示
    - _Requirements: 5.4_
  - [x] 11.3 競合時のダイアログを実装
    - 上書きまたはキャンセルの選択
    - _Requirements: 3.3_

- [x] 12. 監査ログの完全性確認
  - [ ]* 12.1 Property test for audit logging completeness
    - **Property 7: Audit Logging Completeness**
    - **Validates: Requirements 4.1**

- [x] 13. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Google Sheets API の書き込み権限が必要（現在は読み取り専用）
- サービスアカウントのスコープを `spreadsheets` に変更する必要あり
