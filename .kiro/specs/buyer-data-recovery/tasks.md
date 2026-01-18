# Implementation Plan: 買主データ復旧システム

## Overview

買主リストデータベースからデータが完全に消失したため、スプレッドシートから全データを安全に復元します。既存の`BuyerSyncService`と`BuyerColumnMapper`を活用し、段階的に復元機能を実装します。

## Tasks

- [x] 1. データ検証サービスの実装
  - BuyerDataValidatorクラスを作成
  - 必須フィールド検証（買主番号）
  - メールアドレス形式検証
  - 電話番号形式検証
  - 重複検出ロジック
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 1.1 データ検証のProperty-Based Tests
  - **Property 2: 必須フィールド検証**
  - **Validates: Requirements 3.1**
  - ランダムな無効データ（買主番号が空）を生成してテスト
  - _Requirements: 3.1_

- [ ]* 1.2 重複検出のProperty-Based Tests
  - **Property 3: 重複排除**
  - **Validates: Requirements 3.4**
  - 重複を含むランダムデータを生成してテスト
  - _Requirements: 3.4_

- [x] 2. 復旧ロガーの実装
  - RecoveryLoggerクラスを作成
  - 復旧開始ログ記録
  - 進捗ログ記録
  - 復旧完了ログ記録
  - 履歴取得機能
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. バックアップ機能の実装
  - 既存データのバックアップ作成
  - バックアップテーブルの作成
  - バックアップIDの生成
  - バックアップメタデータの保存
  - _Requirements: 4.1, 7.1_

- [ ]* 3.1 バックアップ往復のProperty-Based Tests
  - **Property 8: バックアップとリストアの往復**
  - **Validates: Requirements 7.2, 7.3**
  - ランダムデータでバックアップ→リストアをテスト
  - _Requirements: 7.2, 7.3_

- [x] 4. 復元サービスのコア実装
  - BuyerDataRecoveryServiceクラスを作成
  - スプレッドシートからのデータ読み取り
  - BuyerColumnMapperを使用したマッピング
  - バッチ処理ロジック（100件ずつ）
  - エラーハンドリングとリトライ
  - _Requirements: 2.1, 2.2, 2.3, 4.2, 4.3_

- [ ]* 4.1 データ完全性のProperty-Based Tests
  - **Property 1: データ完全性保持**
  - **Validates: Requirements 2.3, 4.5**
  - ランダムな有効データを生成して復元→検証
  - _Requirements: 2.3, 4.5_

- [ ]* 4.2 エラーハンドリングのProperty-Based Tests
  - **Property 4: エラーハンドリング**
  - **Validates: Requirements 3.5, 5.3**
  - 有効・無効が混在するランダムデータでテスト
  - _Requirements: 3.5, 5.3_

- [ ]* 4.3 バッチ処理冪等性のProperty-Based Tests
  - **Property 5: バッチ処理の冪等性**
  - **Validates: Requirements 4.2**
  - 同じバッチを複数回実行してテスト
  - _Requirements: 4.2_

- [ ] 5. 進捗レポート機能の実装
  - 進捗コールバックの実装
  - 進捗率の計算
  - 推定残り時間の計算
  - リアルタイム進捗表示
  - _Requirements: 5.2_

- [ ]* 5.1 進捗レポート精度のProperty-Based Tests
  - **Property 6: 進捗レポート精度**
  - **Validates: Requirements 5.2**
  - 進捗率が単調増加することを検証
  - _Requirements: 5.2_

- [ ] 6. データ整合性検証機能の実装
  - 復元後のレコード数確認
  - サンプルデータの比較検証
  - 関連データ（物件との紐付け）確認
  - 暗号化データの確認
  - 整合性レポート生成
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 6.1 データ整合性のProperty-Based Tests
  - **Property 7: データ整合性検証**
  - **Validates: Requirements 4.5, 6.1**
  - 復元後のレコード数がスプレッドシートと一致することを検証
  - _Requirements: 4.5, 6.1_

- [ ] 7. リストア機能の実装
  - バックアップからのリストア
  - トランザクション管理
  - ロールバック機能
  - リストア検証
  - _Requirements: 7.2, 7.3, 7.4_

- [ ] 8. ドライラン機能の実装
  - 実際の挿入を行わない検証モード
  - 検証結果のレポート生成
  - 問題点の洗い出し
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. CLIインターフェースの実装
  - コマンドライン引数のパース
  - `--dry-run`: ドライラン実行
  - `--create-backup`: バックアップ作成
  - `--recover`: 実際の復元実行
  - `--verify`: 検証のみ実行
  - `--restore <backup-id>`: バックアップからリストア
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 10. エラーレポート機能の実装
  - エラーの分類（検証、DB、スプレッドシート、システム）
  - 詳細なエラーメッセージ
  - エラーログのファイル出力
  - エラーサマリーの生成
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 11. 統合テストの実装
  - 完全復元フローのテスト
  - エラーリカバリーのテスト
  - 大量データ処理のテスト（10,000件以上）
  - メモリ使用量の監視
  - _Requirements: すべて_

- [x] 12. ドキュメントの作成
  - 実行手順書
  - トラブルシューティングガイド
  - エラーコード一覧
  - 復旧プロセスのフローチャート
  - _Requirements: 5.4, 5.5_

- [ ] 13. 最終検証と実行
  - ドライランで全データ検証
  - バックアップ作成
  - 本番環境での復元実行
  - 復元後の整合性確認
  - 結果レポートの生成
  - _Requirements: すべて_

## Notes

- タスクに`*`が付いているものはオプション（Property-Based Tests）で、コア機能の実装を優先する場合はスキップ可能
- 各タスクは既存の`BuyerSyncService`と`BuyerColumnMapper`を活用
- バッチサイズは100件（メモリ効率とパフォーマンスのバランス）
- Property-Based Testsは各プロパティを最低100回反復
- 実行前に必ずドライランで検証を実施
- バックアップは必須（ロールバック可能にするため）
