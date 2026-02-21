# Implementation Plan: 買主リスト論理削除機能

## Overview

買主リストの論理削除機能を実装します。スプレッドシートから削除された買主をデータベースでも論理削除（`deleted_at`フィールドを設定）し、誤削除時の復元を可能にします。既存の売主リストの論理削除実装をベースに、買主リスト向けにカスタマイズします。

## Tasks

- [x] 1. データベーススキーマの拡張
  - `buyers`テーブルに`deleted_at`カラムを追加
  - `buyer_deletion_audit`テーブルを作成
  - インデックスを作成してクエリパフォーマンスを最適化
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [-] 2. EnhancedAutoSyncServiceの拡張（削除検出）
  - [x] 2.1 `detectDeletedBuyers()`メソッドを実装
    - DBにあってスプレッドシートにない買主番号を検出
    - 全件比較方式で確実に削除を検出
    - _Requirements: 2.1_
  
  - [ ]* 2.2 Property test for `detectDeletedBuyers()`
    - **Property 7: 削除検出の正確性**
    - **Validates: Requirements 2.1**
  
  - [x] 2.3 `getAllActiveBuyerNumbers()`メソッドを実装
    - 削除済みを除外してアクティブな買主番号のみを取得
    - ページネーション対応で全件取得
    - _Requirements: 2.1_

- [ ] 3. EnhancedAutoSyncServiceの拡張（削除同期）
  - [x] 3.1 `validateBuyerDeletion()`メソッドを実装
    - アクティブな問い合わせをチェック
    - 最近のアクティビティをチェック
    - バリデーション結果を返す
    - _Requirements: 2.2_
  
  - [ ]* 3.2 Property test for `validateBuyerDeletion()`
    - **Property 8: バリデーションの一貫性**
    - **Validates: Requirements 2.2**
  
  - [x] 3.3 `executeBuyerSoftDelete()`メソッドを実装
    - 監査ログにバックアップを作成
    - `deleted_at`を設定してソフトデリート
    - トランザクション処理でデータ整合性を保証
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 3.4 Property test for `executeBuyerSoftDelete()`
    - **Property 1: 論理削除の一貫性**
    - **Property 4: 監査ログの完全性**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 3.5 `syncDeletedBuyers()`メソッドを実装
    - 削除された買主を一括同期
    - バリデーション → ソフトデリート → 監査ログ記録
    - エラーハンドリングと結果レポート
    - _Requirements: 2.2, 2.5_
  
  - [ ]* 3.6 Property test for `syncDeletedBuyers()`
    - **Property 5: スプレッドシート同期の一貫性（削除）**
    - **Validates: Requirements 2.2**

- [ ] 4. EnhancedAutoSyncServiceの拡張（復元機能）
  - [x] 4.1 `recoverDeletedBuyer()`メソッドを実装
    - 監査ログを確認
    - `deleted_at`をNULLに設定
    - 監査ログを更新
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 4.2 Property test for `recoverDeletedBuyer()`
    - **Property 3: 復元の完全性**
    - **Property 6: スプレッドシート復元の一貫性**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 5. BuyerServiceの拡張
  - [x] 5.1 `getAll()`メソッドを修正
    - デフォルトで削除済み買主を除外
    - `includeDeleted`パラメータを追加
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.2 `getByBuyerNumber()`メソッドを修正
    - デフォルトで削除済み買主を除外
    - `includeDeleted`パラメータを追加
    - _Requirements: 3.3_
  
  - [x] 5.3 `search()`メソッドを修正
    - デフォルトで削除済み買主を除外
    - _Requirements: 3.3_
  
  - [ ]* 5.4 Property test for BuyerService
    - **Property 2: 削除済み買主の除外**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 6. Checkpoint - 基本機能の動作確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. APIエンドポイントの実装
  - [x] 7.1 `GET /api/buyers`に`includeDeleted`パラメータを追加
    - クエリパラメータを処理
    - BuyerServiceに渡す
    - _Requirements: 7.1, 7.2_
  
  - [x] 7.2 `GET /api/buyers/:id`に`includeDeleted`パラメータを追加
    - 削除済み買主の場合は404を返す（デフォルト）
    - `includeDeleted=true`の場合は削除済みも返す
    - _Requirements: 7.3_
  
  - [x] 7.3 `DELETE /api/buyers/:id`エンドポイントを実装
    - 論理削除を実行
    - 成功時は削除日時を返す
    - _Requirements: 7.4_
  
  - [x] 7.4 `POST /api/buyers/:id/restore`エンドポイントを実装
    - 削除された買主を復元
    - 成功時は復元日時を返す
    - _Requirements: 7.5_
  
  - [ ]* 7.5 Integration tests for API endpoints
    - 削除・復元のエンドポイントをテスト
    - エラーケースをテスト
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. フロントエンド - BuyerListPageの拡張
  - [ ] 8.1 「削除済みを表示」チェックボックスを追加
    - 状態管理を実装
    - API呼び出し時に`includeDeleted`パラメータを追加
    - _Requirements: 4.1_
  
  - [ ] 8.2 削除済みバッジを表示
    - `deleted_at`が設定されている買主にバッジを表示
    - 視覚的に削除済みを識別可能にする
    - _Requirements: 4.2, 4.4_

- [ ] 9. フロントエンド - BuyerDetailPageの拡張
  - [ ] 9.1 削除済みバッジを表示
    - ページ上部に削除済みバッジを表示
    - 削除日時を表示
    - _Requirements: 4.3, 4.4_
  
  - [ ] 9.2 復元ボタンを実装
    - 削除済み買主の場合のみ表示
    - クリック時に復元APIを呼び出し
    - 成功時はページをリロード
    - _Requirements: 5.1, 5.2_

- [x] 10. 自動同期への統合
  - [x] 10.1 自動同期サービスに削除同期を追加
    - 5分ごとの自動同期で削除検出を実行
    - 削除された買主を自動的に同期
    - _Requirements: 2.5_
  
  - [x] 10.2 手動同期ボタンに削除同期を追加
    - 手動同期時も削除同期を実行
    - 同期結果に削除件数を含める
    - _Requirements: 2.5_

- [ ] 11. Checkpoint - 統合テスト
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. ドキュメントの作成
  - [ ] 12.1 論理削除パターンのドキュメントを作成
    - 汎用的な論理削除パターンを文書化
    - 将来的に売主・物件でも使えるように
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 12.2 APIドキュメントを更新
    - 新しいエンドポイントを追加
    - パラメータの説明を追加

- [ ] 13. Final checkpoint - 全体テスト
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 既存の売主リストの論理削除実装（`EnhancedAutoSyncService`）を参考にする
- `deleted_at`カラムは`TIMESTAMP WITH TIME ZONE`型でNULL許可
- 監査ログは`buyer_deletion_audit`テーブルに保存
- デフォルトで削除済み買主を除外し、`includeDeleted=true`で表示可能にする
- 復元機能は管理者のみが使用可能（将来的に権限チェックを追加）
- 自動同期は5分ごとに実行され、削除検出も含まれる
- Tasks marked with `*` are optional and can be skipped for faster MVP
