# Implementation Plan: 公開物件サイト画像表示パフォーマンス最適化

## Overview

`PropertyImageService`のサブフォルダ検索処理を最適化し、初回アクセス時の画像表示時間を5秒から2秒以下に短縮する。既存機能は完全に維持する。

## Tasks

- [x] 1. 環境変数の追加と設定
  - `.env.example`に新しい環境変数を追加
    - `FOLDER_ID_CACHE_TTL_MINUTES=60`
    - `SUBFOLDER_SEARCH_TIMEOUT_SECONDS=2`
    - `MAX_SUBFOLDERS_TO_SEARCH=3`
  - 本番環境の`.env`ファイルに環境変数を追加
  - _Requirements: 1.3, 3.3_

- [x] 2. PropertyImageServiceのコンストラクタ拡張
  - [x] 2.1 新しいパラメータを追加
    - `folderIdCacheTTLMinutes`（デフォルト: 60）
    - `searchTimeoutSeconds`（デフォルト: 2）
    - `maxSubfoldersToSearch`（デフォルト: 3）
    - _Requirements: 1.3, 3.3, 3.5_
  
  - [ ]* 2.2 コンストラクタのユニットテストを追加
    - デフォルト値が正しく設定されることを確認
    - カスタム値が正しく設定されることを確認
    - _Requirements: 1.3_

- [x] 3. キャッシュTTLの延長
  - [x] 3.1 `cacheFolderId`メソッドを修正
    - `folderIdCacheTTL`を使用するように変更（5分 → 1時間）
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 3.2 キャッシュTTLのプロパティテストを追加
    - **Property 1: キャッシュの一貫性**
    - **Validates: Requirements 1.1, 1.2**
    - 有効期限内は同じ結果を返すことを確認
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 3.3 キャッシュ有効期限のプロパティテストを追加
    - **Property 6: キャッシュ有効期限の保証**
    - **Validates: Requirements 1.4**
    - 有効期限切れ時に再検索が実行されることを確認
    - _Requirements: 1.4_

- [x] 4. タイムアウト機能の実装
  - [x] 4.1 `withTimeout`ヘルパー関数を追加
    - `Promise.race()`を使用してタイムアウトを実装
    - タイムアウト時はフォールバック値を返す
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 4.2 タイムアウトのプロパティテストを追加
    - **Property 3: タイムアウトの保証**
    - **Validates: Requirements 3.4**
    - タイムアウト時に親フォルダIDが返されることを確認
    - _Requirements: 3.4_

- [x] 5. サブフォルダ検索の並列処理化
  - [x] 5.1 `searchPublicFolderInSubfolders`メソッドを修正
    - サブフォルダ数を`maxSubfoldersToSearch`で制限
    - 各サブフォルダの検索を並列実行（`Promise.all`）
    - `Promise.race()`で最初に見つかった結果を使用
    - `withTimeout()`でタイムアウトを適用
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 5.2 並列処理のユニットテストを追加
    - 複数のサブフォルダが並列で検索されることを確認
    - 最初に見つかった結果が返されることを確認
    - _Requirements: 3.1_
  
  - [ ]* 5.3 早期終了のプロパティテストを追加
    - **Property 4: 早期終了の保証**
    - **Validates: Requirements 3.2**
    - 「athome公開」が見つかったら「atbb公開」の検索がスキップされることを確認
    - _Requirements: 3.2_
  
  - [ ]* 5.4 サブフォルダ数制限のプロパティテストを追加
    - **Property 5: サブフォルダ数制限の保証**
    - **Validates: Requirements 3.5**
    - 検索されたサブフォルダ数が制限内であることを確認
    - _Requirements: 3.5_

- [ ] 6. 検索順序の維持確認
  - [ ]* 6.1 検索順序のプロパティテストを追加
    - **Property 2: 検索順序の維持**
    - **Validates: Requirements 0.1, 0.2, 0.3**
    - 検索順序が正しいことを確認（athome公開 → atbb公開 → 親フォルダ）
    - _Requirements: 0.1, 0.2, 0.3_

- [x] 7. ログ出力の追加
  - [x] 7.1 パフォーマンスログを追加
    - 検索開始時刻と完了時刻を記録
    - 検索時間を計算してログ出力
    - キャッシュヒット/ミスをログ出力
    - タイムアウト発生時に警告ログを出力
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. サービス初期化の更新
  - [x] 8.1 環境変数から設定を読み込む
    - `FOLDER_ID_CACHE_TTL_MINUTES`を読み込み
    - `SUBFOLDER_SEARCH_TIMEOUT_SECONDS`を読み込み
    - `MAX_SUBFOLDERS_TO_SEARCH`を読み込み
    - デフォルト値を設定
    - _Requirements: 1.3, 3.3_
  
  - [x] 8.2 PropertyImageServiceのインスタンス化を更新
    - 新しいパラメータを渡す
    - _Requirements: 1.3_

- [ ] 9. Checkpoint - テストの実行
  - すべてのユニットテストとプロパティテストを実行
  - テストが全て通ることを確認
  - ユーザーに質問があれば確認

- [ ] 10. 統合テスト
  - [ ]* 10.1 エンドツーエンドテストを追加
    - 実際の物件IDで画像取得をテスト
    - 初回アクセスと2回目アクセスの時間を計測
    - 目標時間内に表示されることを確認
    - _Requirements: 全体_
  
  - [ ]* 10.2 パフォーマンステストを追加
    - 複数の物件で画像取得時間を計測
    - 平均時間が目標値以下であることを確認
    - _Requirements: 全体_

- [ ] 11. ドキュメントの更新
  - [ ] 11.1 README.mdを更新
    - 新しい環境変数を記載
    - パフォーマンス改善について記載
    - _Requirements: 全体_

- [ ] 12. Final Checkpoint - デプロイ前確認
  - すべてのテストが通ることを確認
  - ログ出力が正しいことを確認
  - 環境変数が設定されていることを確認
  - ユーザーに最終確認

## Notes

- タスクに`*`が付いているものはオプション（テスト関連）
- 各タスクは前のタスクに依存しているため、順番に実行すること
- Checkpointタスクでは必ずテストを実行し、問題があれば修正すること
- 既存機能は完全に維持すること（サブフォルダ検索の順序、フォールバック戦略など）
