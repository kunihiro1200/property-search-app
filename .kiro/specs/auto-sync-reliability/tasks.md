# Implementation Plan

- [x] 1. データベーススキーマの拡張




  - [x] 1.1 sync_healthテーブルを作成するマイグレーションを作成

    - last_sync_time, last_sync_success, pending_missing_sellers, consecutive_failures, is_healthy カラムを含む




    - _Requirements: 3.1, 3.2_
  - [x] 1.2 sync_logsテーブルにmissing_sellers_detected, triggered_by, health_statusカラムを追加




    - _Requirements: 2.4, 4.4_

- [x] 2. EnhancedAutoSyncServiceの実装
  - [x] 2.1 detectMissingSellers関数を実装

    - スプレッドシートの全売主番号を取得
    - DBの全売主番号を取得
    - 差分（スプレッドシートにあってDBにないもの）を返す
    - _Requirements: 1.1, 1.3_
  - [ ]* 2.2 Property 1のプロパティテストを作成
    - **Property 1: Missing seller detection completeness**
    - **Validates: Requirements 1.1, 1.3**



  - [x] 2.3 syncMissingSellers関数を実装
    - 検出された不足売主を順次同期

    - 各売主の同期結果を記録
    - _Requirements: 1.2, 5.1, 5.2, 5.3, 5.4_
  - [x]* 2.4 Property 5のプロパティテストを作成




    - **Property 5: Data mapping completeness**
    - **Validates: Requirements 5.1, 5.3**
  - [ ]* 2.5 Property 6のプロパティテストを作成
    - **Property 6: Encryption correctness**

    - **Validates: Requirements 5.4**
  - [x] 2.6 runFullSync関数を実装

    - detectMissingSellersとsyncMissingSellersを組み合わせて実行
    - 同期結果をSyncResultとして返す




    - _Requirements: 1.1, 1.2, 2.4_


- [x] 3. SyncLogServiceの実装
  - [x] 3.1 logSync関数を実装
    - 同期結果をsync_logsテーブルに記録
    - _Requirements: 2.4_
  - [x]* 3.2 Property 3のプロパティテストを作成

    - **Property 3: Sync log completeness**
    - **Validates: Requirements 2.4**




  - [x] 3.3 getHistory関数を実装
    - 最新100件の同期履歴を取得

    - _Requirements: 4.3, 4.4_
  - [x] 3.4 getLastSuccessfulSync関数を実装
    - 最後に成功した同期を取得

    - _Requirements: 3.2_






- [x] 4. SyncHealthCheckerの実装
  - [x] 4.1 getHealthStatus関数を実装
    - 現在の健全性状態を取得

    - _Requirements: 3.1, 3.4_
  - [x] 4.2 checkAndUpdateHealth関数を実装




    - 最後の成功同期からの経過時間をチェック
    - 3倍の間隔を超えていたらunhealthyに設定




    - _Requirements: 3.2, 3.3_


  - [x]* 4.3 Property 4のプロパティテストを作成


    - **Property 4: Health status accuracy**
    - **Validates: Requirements 3.2**

- [ ] 5. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. PeriodicSyncManagerの改善
  - [x] 6.1 デフォルト有効化ロジックを実装
    - AUTO_SYNC_ENABLED未設定時はデフォルトで有効
    - 明示的にfalseの場合のみ無効
    - _Requirements: 6.1, 6.3_
  - [x] 6.2 エラーハンドリングを強化
    - 同期エラー時もスケジュールを継続
    - エラーをログに記録
    - _Requirements: 2.3_
  - [x] 6.3 同期完了後にヘルスチェックを更新
    - _Requirements: 3.1_

- [x] 7. APIエンドポイントの実装
  - [x] 7.1 GET /api/sync/status エンドポイントを実装
    - 同期状態、健全性、設定を返す
    - _Requirements: 3.1, 3.4_
  - [x] 7.2 POST /api/sync/trigger エンドポイントを実装
    - 手動同期をトリガー
    - 同期結果を返す
    - _Requirements: 4.1, 4.2_
  - [x] 7.3 GET /api/sync/history エンドポイントを実装
    - 同期履歴を返す
    - _Requirements: 4.3, 4.4_

- [x] 8. サーバー起動時の自動同期開始を修正
  - [x] 8.1 index.tsの自動同期開始ロジックを修正
    - デフォルト有効化を適用
    - 初期化エラー時のリトライロジックを追加
    - _Requirements: 2.1, 2.2_




- [x] 9. 現在の不足データを同期
  - [x] 9.1 手動で一度フル同期を実行するスクリプトを作成
    - 現在スプレッドシートにあってDBにないデータを同期
    - _Requirements: 1.1, 1.2_

- [ ] 10. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
