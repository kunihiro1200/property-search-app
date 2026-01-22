# 実装タスクリスト: 公開物件一覧の画像表示修正

## 概要

公開物件一覧ページで物件カードに画像を表示するため、バックエンドAPIを修正します。

## タスク

- [x] 1. PropertyImageServiceに新規メソッドを追加
  - `getFirstImage(propertyId, storageLocation)`メソッドを実装
  - 最初の1枚の画像URLのみを返す
  - キャッシュ機能を実装（5分間）
  - エラーハンドリングを追加
  - _Requirements: 根本原因の分析 - 画像取得の仕組み_

- [x] 2. PropertyListingService.getPublicProperties()を修正
  - 物件データ取得後、各物件の画像を取得
  - `PropertyImageService.getFirstImage()`を呼び出し
  - レスポンスに`images`配列を追加
  - 並列処理で複数物件の画像を取得
  - タイムアウト対策を実装（5秒）
  - _Requirements: 解決策の選択肢 - オプション1_

- [x] 3. エラーハンドリングの実装
  - 画像取得エラー時も物件データは返却
  - エラーログを出力
  - 空の`images`配列を返す
  - _Requirements: エラーハンドリング_

- [x] 4. APIレスポンスのテスト
  - `/api/public/properties`エンドポイントをテスト
  - レスポンスに`images`配列が含まれることを確認
  - 画像URLの形式が正しいことを確認
  - エラー時の動作を確認
  - _Requirements: テスト戦略 - 統合テスト_

- [ ] 5. フロントエンドの動作確認
  - 公開物件一覧ページにアクセス
  - 物件カードに画像が表示されることを確認
  - 画像がない場合はプレースホルダーが表示されることを確認
  - _Requirements: テスト戦略 - E2Eテスト_

## 注意事項

- フロントエンドの変更は不要（既に`property.images[0]`を使用している）
- 既存の`image_url`フィールドは後方互換性のため残す
- パフォーマンスのため、一覧表示では最初の1枚のみを取得
- キャッシュを活用してGoogle Drive APIの呼び出しを削減
