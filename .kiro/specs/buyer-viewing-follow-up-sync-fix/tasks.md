# Implementation Plan: Buyer Viewing Follow-Up Sync Fix

## Overview

買主番号6666などで発生している`viewing_result_follow_up`と`follow_up_assignee`フィールドの同期不具合を修正します。フィールドレベルの追跡機能を追加し、データの整合性を回復します。

## Tasks

- [ ] 1. 調査とモニタリング基盤の構築
  - [x] 1.1 SyncMonitoringServiceの実装
    - フィールドレベルの同期結果を記録する機能を実装
    - 統計情報の取得機能を実装
    - アラート閾値チェック機能を実装
    - _Requirements: 5.1, 5.2_

  - [ ]* 1.2 SyncMonitoringServiceのユニットテストを作成
    - 同期結果の記録をテスト
    - 統計計算をテスト
    - アラート閾値検出をテスト
    - _Requirements: 5.1, 5.2_

  - [x] 1.3 モニタリング用データベーステーブルの作成
    - `buyer_field_sync_logs`テーブルを作成
    - `buyer_data_recovery_logs`テーブルを作成
    - 必要なインデックスを追加
    - _Requirements: 5.1_

- [ ] 2. BuyerSyncServiceの強化
  - [x] 2.1 フィールドレベル追跡機能の追加
    - `syncBuyerWithFieldTracking()`メソッドを実装
    - 各フィールドの同期結果を個別に記録
    - SyncMonitoringServiceと統合
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 フィールドカバレッジ検証機能の追加
    - `validateFieldCoverage()`メソッドを実装
    - マッピング設定の全フィールドが処理されることを確認
    - 欠落フィールドをログに記録
    - _Requirements: 2.1_

  - [x] 2.3 特定フィールド同期機能の追加
    - `syncSpecificFields()`メソッドを実装
    - 指定されたフィールドのみを同期
    - エラーハンドリングを強化
    - _Requirements: 2.2, 2.3_

  - [ ]* 2.4 BuyerSyncService強化のユニットテストを作成
    - フィールド追跡機能をテスト
    - カバレッジ検証をテスト
    - 特定フィールド同期をテスト
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. データ整合性チェック機能の実装
  - [x] 3.1 DataConsistencyCheckerサービスの実装
    - `findInconsistencies()`メソッドを実装
    - `verifyBuyer()`メソッドを実装
    - `generateReport()`メソッドを実装
    - _Requirements: 3.1_
    - ✅ Complete

  - [ ]* 3.2 DataConsistencyCheckerのユニットテストを作成
    - 不整合検出ロジックをテスト
    - レポート生成をテスト
    - _Requirements: 3.1_
    - ⏭️ Skipped (optional)

  - [ ] 3.3 買主番号6666の整合性チェックを実行
    - 現在のデータベース値を確認
    - スプレッドシート値と比較
    - 不整合をレポート
    - _Requirements: 1.1, 3.1_
    - ✅ Complete - No inconsistencies found

- [ ] 4. データ回復機能の実装
  - [x] 4.1 BuyerDataRecoveryServiceの実装
    - `recoverBuyers()`メソッドを実装
    - `recoverAllInconsistencies()`メソッドを実装
    - `createBackup()`メソッドを実装
    - `rollbackToBackup()`メソッドを実装
    - _Requirements: 3.2_
    - ✅ Complete

  - [ ]* 4.2 BuyerDataRecoveryServiceのユニットテストを作成
    - バックアップ作成をテスト
    - 回復処理をテスト
    - ロールバック機能をテスト
    - _Requirements: 3.2_
    - ⏭️ Skipped (optional)

  - [x] 4.3 買主番号6666のデータ回復を実行
    - バックアップを作成
    - `viewing_result_follow_up`フィールドを回復
    - `follow_up_assignee`フィールドを回復
    - 回復結果を検証
    - _Requirements: 3.2, 3.3_
    - ✅ Complete - No recovery needed (data already consistent)

- [ ] 5. Checkpoint - 基本機能の動作確認
  - すべてのテストが成功することを確認
  - 買主番号6666のデータが正しく回復されたことを確認
  - 質問があればユーザーに確認

- [ ] 6. プロパティベーステストの実装
  - [ ]* 6.1 Property 1: Sync Completenessのテストを作成
    - **Property 1: Sync Completeness**
    - **Validates: Requirements 2.1, 2.2**
    - ランダムな買主データを生成
    - 同期を実行
    - すべてのマッピングフィールドが処理されたことを検証
    - 最低100回の反復実行

  - [ ]* 6.2 Property 2: Data Consistency After Syncのテストを作成
    - **Property 2: Data Consistency After Sync**
    - **Validates: Requirements 2.2, 3.3**
    - ランダムな買主データを生成
    - 同期を実行
    - データベース値がスプレッドシート値と一致することを検証
    - 最低100回の反復実行

  - [ ]* 6.3 Property 3: Error Transparencyのテストを作成
    - **Property 3: Error Transparency**
    - **Validates: Requirements 2.3, 5.1**
    - 意図的にエラーを発生させる同期シナリオを生成
    - エラーが完全な情報とともにログに記録されることを検証
    - 最低100回の反復実行

  - [ ]* 6.4 Property 4: Recovery Idempotenceのテストを作成
    - **Property 4: Recovery Idempotence**
    - **Validates: Requirements 3.2**
    - ランダムな買主データを生成
    - 回復処理を複数回実行
    - 最終状態が同一であることを検証
    - 最低100回の反復実行

  - [ ]* 6.5 Property 5: Field-Level Monitoringのテストを作成
    - **Property 5: Field-Level Monitoring**
    - **Validates: Requirements 5.1, 5.2**
    - 複数の同期操作を生成
    - 各フィールドのモニタリングレコードが存在することを検証
    - 最低100回の反復実行

- [ ] 7. 統合テストの実装
  - [ ]* 7.1 エンドツーエンド同期テストを作成
    - テスト買主をスプレッドシートに作成
    - 同期を実行
    - データベースのデータを検証
    - 買主詳細ページでの表示を検証
    - _Requirements: 2.1, 2.2, 4.1, 4.3_

  - [ ]* 7.2 回復フローテストを作成
    - 不整合データを作成
    - 整合性チェックを実行
    - 回復を実行
    - データが修正されたことを検証
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 7.3 モニタリングアラートテストを作成
    - 繰り返し同期失敗をシミュレート
    - アラートがトリガーされることを検証
    - アラートに正しい情報が含まれることを検証
    - _Requirements: 5.2_

- [ ] 8. 本番環境での検証準備
  - [ ] 8.1 全買主の整合性チェックを実行
    - DataConsistencyCheckerで全買主をスキャン
    - 不整合レポートを生成
    - 影響範囲を確認
    - _Requirements: 3.1_

  - [ ] 8.2 回復計画の作成
    - 影響を受けた買主のリストを作成
    - バックアップ戦略を確認
    - ロールバック手順を文書化
    - _Requirements: 3.2_

  - [ ] 8.3 サンプル買主での検証
    - 10件のランダムな買主を選択
    - 整合性チェックを実行
    - 不整合があれば回復を実行
    - すべてのフィールドが正しいことを検証
    - _Requirements: 3.3_

- [ ] 9. Checkpoint - 本番デプロイ前の最終確認
  - すべてのテストが成功することを確認
  - 買主番号6666が正しく表示されることを確認
  - 質問があればユーザーに確認

- [ ] 10. 本番環境でのデータ回復実行
  - [ ] 10.1 影響を受けた買主のバックアップを作成
    - BuyerDataRecoveryServiceでバックアップを実行
    - バックアップIDを記録
    - _Requirements: 3.2_

  - [ ] 10.2 データ回復を実行
    - 低トラフィック時間帯に実行
    - 進捗をモニタリング
    - エラーがあれば記録
    - _Requirements: 3.2_

  - [ ] 10.3 回復結果の検証
    - 成功件数と失敗件数を確認
    - 買主番号6666を含むサンプルを検証
    - 買主詳細ページでの表示を確認
    - _Requirements: 3.3, 4.1, 4.3_

- [ ] 11. モニタリングと継続的な検証
  - [ ] 11.1 24時間のモニタリング
    - 同期操作を監視
    - フィールドレベルの成功率を確認
    - アラートが発生していないことを確認
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 11.2 最終検証レポートの作成
    - 修正された買主の数を報告
    - 同期成功率を報告
    - 残存する問題があれば文書化
    - _Requirements: 3.3, 5.3_

## Notes

- `*`マークのタスクはオプションで、より速いMVPのためにスキップ可能
- 各タスクは特定の要件を参照してトレーサビリティを確保
- チェックポイントで段階的な検証を実施
- プロパティテストは普遍的な正確性プロパティを検証
- ユニットテストは特定の例とエッジケースを検証
