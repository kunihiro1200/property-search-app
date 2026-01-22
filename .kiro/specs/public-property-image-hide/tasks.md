# Implementation Plan: Public Property Image Hide

## Overview

property_listingsテーブルにhidden_imagesカラムを追加し、画像の非表示/復元機能を実装する。

## Tasks

- [x] 1. データベースマイグレーション
  - [x] 1.1 hidden_imagesカラムを追加するマイグレーションファイルを作成
    - `backend/migrations/076_add_hidden_images_column.sql`を作成
    - TEXT[]型でデフォルト値は空配列
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 マイグレーション実行スクリプトを作成
    - `backend/migrations/run-076-migration.ts`を作成
    - _Requirements: 1.1_

- [x] 2. バックエンドAPI実装
  - [x] 2.1 PropertyListingServiceに非表示/復元メソッドを追加
    - `hideImage(propertyId, fileId)` メソッド
    - `restoreImage(propertyId, fileId)` メソッド
    - `getHiddenImages(propertyId)` メソッド
    - _Requirements: 2.1, 2.3, 4.1_

  - [x] 2.2 APIエンドポイントを追加
    - POST `/api/property-listings/:id/hide-image`
    - POST `/api/property-listings/:id/restore-image`
    - _Requirements: 2.1, 2.2, 4.1, 4.2_
  - [ ]* 2.3 ユニットテストを作成
    - hideImage, restoreImageのテスト
    - 重複防止のテスト
    - _Requirements: 2.3_

- [x] 3. 画像フィルタリング実装
  - [x] 3.1 公開APIで非表示画像をフィルタリング
    - publicProperties.tsのGET /properties/:id/imagesエンドポイントで実装済み
    - hidden_imagesに含まれる画像を除外
    - includeHidden=trueパラメータで非表示画像も含めて取得可能
    - _Requirements: 3.1, 3.2_
  - [ ]* 3.2 フィルタリングのプロパティテストを作成
    - **Property 2: フィルタリングの一貫性**
    - **Validates: Requirements 3.1, 3.2**

- [x] 4. フロントエンド実装
  - [x] 4.1 PropertyImageGalleryコンポーネントを修正
    - 非表示ボタンの追加（管理者モード）
    - 非表示画像の視覚的表示（グレーアウト）
    - 復元ボタンの追加
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 4.2 API呼び出し関数を追加
    - hidePropertyImage関数
    - restorePropertyImage関数
    - _Requirements: 2.1, 4.1_

- [x] 5. Checkpoint - 動作確認
  - すべてのテストが通ることを確認
  - 手動テストで非表示/復元が正しく動作することを確認
  - 質問があればユーザーに確認

## Notes

- タスクに`*`マークがあるものはオプション（テスト関連）
- Google Drive APIの権限問題を回避するため、実際の削除は行わない
- 非表示画像はDBのフラグで管理し、いつでも復元可能
