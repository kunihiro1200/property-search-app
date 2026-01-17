# Implementation Plan: Remove Comments Column from Sellers Table

## Overview

sellersテーブルから`comments`カラムを削除するマイグレーションを実装します。このタスクリストは、マイグレーションスクリプトの作成、実行、検証、ロールバックスクリプトの作成を含みます。

## Tasks

- [x] 1. Forward Migrationスクリプトの作成
  - `backend/migrations/087_remove_comments_from_sellers.sql`を作成
  - `ALTER TABLE sellers DROP COLUMN IF EXISTS comments;`を実装
  - PostgRESTスキーマキャッシュリロードのNOTIFYを追加
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 2. Rollback Migrationスクリプトの作成
  - `backend/migrations/087_remove_comments_from_sellers_rollback.sql`を作成
  - `ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comments TEXT;`を実装
  - カラムコメントの復元を追加
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Migration実行スクリプトの作成
  - `backend/migrations/run-087-migration.ts`を作成
  - Supabaseクライアントを使用してマイグレーションSQLを実行
  - 実行ログを出力
  - エラーハンドリングを実装
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Verification スクリプトの作成
  - `backend/migrations/verify-087-migration.ts`を作成
  - sellersテーブルのスキーマをクエリ
  - commentsカラムが存在しないことを確認
  - 他のカラムが保持されていることを確認
  - _Requirements: 1.4, 2.4_

- [ ]* 4.1 Property test for schema verification
  - **Property 1: カラム削除の完全性**
  - **Validates: Requirements 1.1**
  - 任意のスキーマクエリに対して、commentsカラムが結果に含まれないことを確認

- [ ]* 4.2 Property test for data preservation
  - **Property 2: データ保全性**
  - **Validates: Requirements 1.2**
  - マイグレーション実行前後で、他のカラムのデータが変更されていないことを確認

- [x] 5. Checkpoint - マイグレーション実行前の確認
  - すべてのスクリプトが作成されていることを確認
  - ユーザーに実行準備が整ったことを報告

- [x] 6. マイグレーションの実行
  - `run-087-migration.ts`を実行
  - 実行ログを確認
  - エラーが発生しないことを確認
  - _Requirements: 1.1, 1.2, 2.2_

- [x] 7. マイグレーション後の検証
  - `verify-087-migration.ts`を実行
  - commentsカラムが削除されたことを確認
  - sellersテーブルのレコード数が変わっていないことを確認
  - _Requirements: 1.4, 2.4_

- [ ]* 7.1 Integration test for API endpoint
  - sellersエンドポイントをクエリ
  - commentsカラムが含まれていないことを確認
  - エラーが発生しないことを確認
  - _Requirements: 4.2, 4.3_

- [x] 8. Checkpoint - ロールバックテスト
  - ロールバックスクリプトをテスト環境で実行
  - commentsカラムが復元されることを確認
  - ユーザーに結果を報告

- [ ]* 8.1 Property test for rollback reversibility
  - **Property 3: ロールバックの可逆性**
  - **Validates: Requirements 3.2, 3.3**
  - ロールバック実行後、commentsカラムが正しいデータ型（TEXT）で復元されることを確認

- [x] 9. ドキュメントの更新
  - `DATABASE_SCHEMA_REFERENCE.md`を更新（commentsカラムを削除）
  - `spreadsheet-column-mapping.md`を確認（既にcommentsカラムは記載されていないことを確認）
  - _Requirements: 該当なし_

- [x] 10. Final checkpoint - 完了確認
  - すべてのタスクが完了していることを確認
  - マイグレーションが正常に実行されたことを確認
  - ユーザーに完了を報告

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 各タスクは要件への参照を含んでいます
- Checkpointsで段階的な検証を行います
- Property testsは自動テストとして実装可能ですが、オプションです
- マイグレーション実行前に、sellersテーブルのバックアップを取ることを推奨します

## Execution Order

1. スクリプト作成（Tasks 1-4）
2. 実行前確認（Task 5）
3. マイグレーション実行（Tasks 6-7）
4. ロールバックテスト（Task 8）
5. ドキュメント更新（Task 9）
6. 完了確認（Task 10）
