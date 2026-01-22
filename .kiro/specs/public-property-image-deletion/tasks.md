# Implementation Plan: Public Property Image Deletion

## Overview

公開物件詳細ページの画像ギャラリーに画像削除機能を実装する。バックエンドのAPI・サービス層から実装を開始し、フロントエンドのUI実装、最後に統合テストを行う。

## Tasks

- [x] 1. データベースマイグレーション作成
  - [x] 1.1 削除ログテーブル（property_image_deletion_logs）のマイグレーションファイル作成
    - id, property_id, image_file_id, image_name, deleted_by, deleted_at, ip_address カラム
    - _Requirements: 4.3_

- [x] 2. バックエンドサービス層の実装
  - [x] 2.1 PropertyImageServiceにdeleteImageメソッドを追加
    - GoogleDriveService.deleteFileを呼び出し
    - キャッシュクリア処理
    - _Requirements: 3.1, 3.5_
  - [x] 2.2 PropertyImageServiceにvalidateImageBelongsToPropertyメソッドを追加
    - 物件のstorage_urlからフォルダIDを取得し、画像がそのフォルダに属するか検証
    - _Requirements: 4.4_
  - [ ]* 2.3 PropertyImageService削除機能のユニットテスト作成
    - **Property 5: Cache invalidation on deletion**
    - **Validates: Requirements 3.5**

- [x] 3. バックエンドAPIエンドポイントの実装
  - [x] 3.1 DELETE /api/properties/:propertyId/images/:imageId エンドポイント作成
    - 認証ミドルウェア適用
    - パラメータバリデーション
    - 削除ログ記録
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 3.2 認証要件のプロパティテスト作成
    - **Property 6: Authentication requirement**
    - **Validates: Requirements 4.1, 4.2**
  - [ ]* 3.3 削除ログ記録のプロパティテスト作成
    - **Property 7: Deletion logging**
    - **Validates: Requirements 4.3**

- [x] 4. Checkpoint - バックエンド実装確認
  - バックエンドの実装完了、テストはオプションのためスキップ

- [x] 5. フロントエンドコンポーネントの実装
  - [x] 5.1 DeleteConfirmDialogコンポーネント作成
    - 画像プレビュー表示
    - 削除・キャンセルボタン
    - 削除中のローディング状態
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 5.2 ImageDeleteButtonコンポーネント作成
    - ゴミ箱アイコン
    - 右上配置スタイル
    - _Requirements: 1.3, 1.4_
  - [ ]* 5.3 DeleteConfirmDialogのユニットテスト作成
    - **Property 2: Confirmation dialog behavior**
    - **Validates: Requirements 2.1, 2.2, 2.5**

- [x] 6. PropertyImageGalleryの拡張
  - [x] 6.1 PropertyImageGalleryにcanDeleteプロパティ追加
    - 認証状態に基づいて削除ボタン表示/非表示
    - _Requirements: 1.1, 1.2_
  - [x] 6.2 サムネイルに削除ボタン統合
    - ImageDeleteButtonコンポーネント配置
    - 削除確認ダイアログ連携
    - _Requirements: 1.1, 1.3, 1.4_
  - [x] 6.3 ライトボックス内に削除ボタン追加
    - 削除後の画像ナビゲーション処理
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 6.4 認証状態と削除ボタン表示のプロパティテスト作成
    - **Property 1: Delete button visibility based on authentication**
    - **Validates: Requirements 1.1, 1.2**

- [x] 7. 削除処理とUI更新の統合
  - [x] 7.1 削除API呼び出しとエラーハンドリング実装
    - 成功時: ギャラリーから画像削除、成功通知表示
    - 失敗時: エラーメッセージ表示
    - _Requirements: 3.2, 3.3, 3.4_
  - [ ]* 7.2 削除成功時のUI更新プロパティテスト作成
    - **Property 3: Successful deletion updates UI**
    - **Validates: Requirements 3.2, 3.3**
  - [ ]* 7.3 削除失敗時のエラー表示プロパティテスト作成
    - **Property 4: Failed deletion shows error**
    - **Validates: Requirements 3.4**

- [x] 8. PublicPropertyDetailPageの更新
  - [x] 8.1 認証状態の取得とPropertyImageGalleryへの受け渡し
    - useAuthStoreから認証状態取得
    - canDeleteプロパティ設定
    - _Requirements: 1.1, 1.2_

- [x] 9. Final checkpoint - 全機能テスト
  - 実装完了、オプションのテストはスキップ

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- 既存のGoogleDriveService.deleteFileメソッドを活用
- 認証はuseAuthStoreの状態を使用
