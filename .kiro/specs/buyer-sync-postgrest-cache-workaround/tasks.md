# Implementation Plan: Buyer Sync PostgREST Cache Workaround

## Overview

PostgRESTのスキーマキャッシュ問題により`last_synced_at`と`updated_at`カラムが認識されない問題を回避するため、全件同期方式を最適化し、詳細な監視機能を追加します。

## Tasks

- [x] 1. データベースマイグレーションの作成
  - `sync_logs`テーブルを作成するマイグレーションファイルを作成
  - インデックスを追加
  - _Requirements: 5.1, 5.2_

- [ ]* 1.1 マイグレーションのテストを作成
  - マイグレーション実行後のテーブル構造を検証
  - _Requirements: 5.1_

- [x] 2. SyncLoggerサービスの実装
  - [x] 2.1 SyncLoggerクラスの基本構造を作成
    - `logSyncStart()`, `logSyncComplete()`, `getRecentSyncs()`メソッドを実装
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 2.2 SyncLoggerのユニットテストを作成
    - 各メソッドの正常系・異常系をテスト
    - _Requirements: 5.1, 5.2_

- [x] 3. BuyerSyncServiceの拡張
  - [x] 3.1 進捗レポート機能を追加
    - `reportProgress()`メソッドを実装
    - `syncAllWithProgress()`メソッドを実装
    - _Requirements: 2.4, 5.1_

  - [x] 3.2 成功率計算機能を追加
    - `calculateSuccessRate()`メソッドを実装
    - `SyncResult`インターフェースに`successRate`フィールドを追加
    - _Requirements: 5.3_

  - [x] 3.3 バッチサイズを50に調整
    - `BATCH_SIZE`定数を100から50に変更
    - _Requirements: 2.1_

  - [x] 3.4 SyncLoggerとの統合
    - `syncAll()`メソッドの開始時と終了時にログを記録
    - _Requirements: 5.1, 5.2_

  - [ ]* 3.5 BuyerSyncServiceの拡張機能のユニットテストを作成
    - 進捗レポート機能のテスト
    - 成功率計算のテスト
    - _Requirements: 2.4, 5.3_

- [x] 4. BuyerVerificationServiceの実装
  - [x] 4.1 BuyerVerificationServiceクラスを作成
    - `verifyBuyer()`メソッドを実装
    - `compareFields()`メソッドを実装
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.2 買主6648の検証スクリプトを作成
    - コマンドラインから実行可能なスクリプト
    - _Requirements: 6.4, 6.5_

  - [ ]* 4.3 BuyerVerificationServiceのユニットテストを作成
    - フィールド比較ロジックのテスト
    - _Requirements: 6.2_

- [ ] 5. Property-Based Testsの実装
  - [ ]* 5.1 Property 1のテストを作成
    - **Property 1: 全件同期の完全性**
    - **Validates: Requirements 1.1, 1.5**

  - [ ]* 5.2 Property 2のテストを作成
    - **Property 2: Upsertの冪等性**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 5.3 Property 3のテストを作成
    - **Property 3: created_atの不変性**
    - **Validates: Requirements 3.3**

  - [ ]* 5.4 Property 4のテストを作成
    - **Property 4: エラー分離**
    - **Validates: Requirements 4.2, 4.3**

  - [ ]* 5.5 Property 5のテストを作成
    - **Property 5: 同期統計の正確性**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 5.6 Property 6のテストを作成
    - **Property 6: 買主番号の一意性**
    - **Validates: Requirements 3.1**

  - [ ]* 5.7 Property 7のテストを作成
    - **Property 7: 成功率の計算**
    - **Validates: Requirements 5.3**

  - [ ]* 5.8 Property 8のテストを作成
    - **Property 8: 買主6648の同期**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 6. Checkpoint - すべてのテストが通ることを確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. エラーハンドリングの強化
  - [x] 7.1 エラーカテゴリの定義
    - `SyncErrorType`列挙型を作成
    - _Requirements: 4.1_

  - [x] 7.2 エラーログの詳細化
    - `SyncError`インターフェースに`errorType`と`timestamp`を追加
    - _Requirements: 4.1, 4.4_

  - [ ]* 7.3 エラーハンドリングのユニットテストを作成
    - 各エラータイプの処理をテスト
    - _Requirements: 4.1_

- [ ] 8. 統合テストの作成
  - [ ]* 8.1 End-to-End同期テストを作成
    - 実際のGoogle Sheetsデータを使用
    - _Requirements: 1.1, 3.1_

  - [ ]* 8.2 買主6648検証テストを作成
    - 買主6648が正しく同期されることを確認
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 8.3 エラーリカバリーテストを作成
    - 一部エラーでも他の買主が同期されることを確認
    - _Requirements: 4.2, 4.3_

- [x] 9. ドキュメントの作成
  - [x] 9.1 READMEを更新
    - `backend/src/services/README.md`に同期方式の説明を追加
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 トラブルシューティングガイドを作成
    - `backend/BUYER_SYNC_TROUBLESHOOTING.md`を作成
    - _Requirements: 8.4, 8.5_

  - [x] 9.3 APIドキュメントを更新
    - 新しいメソッドとインターフェースを文書化
    - _Requirements: 8.3_

- [-] 10. 本番環境での検証
  - [x] 10.1 マイグレーションを実行
    - `sync_logs`テーブルを作成
    - _Requirements: 5.1_

  - [ ] 10.2 全件同期を実行
    - 新しい実装で全買主を同期
    - _Requirements: 1.1, 1.4_

  - [ ] 10.3 買主6648を検証
    - 検証スクリプトを実行して確認
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ] 10.4 同期統計を確認
    - 成功率、処理時間、エラー数を確認
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 11. Final checkpoint - すべてのテストが通り、本番環境で動作することを確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- 既存の`BuyerSyncService`を拡張するため、破壊的変更はありません
- `last_synced_at`と`updated_at`カラムは保持されますが、フィルタリングには使用されません
