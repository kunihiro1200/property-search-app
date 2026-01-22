# Implementation Plan

## Property Documents Drive Integration

- [x] 1. データベーススキーマとマイグレーション




  - [ ] 1.1 seller_drive_foldersテーブルのマイグレーションファイルを作成
    - seller_id, seller_number, drive_folder_idカラムを含む
    - 適切なインデックスとユニーク制約を設定
    - _Requirements: 2.2_
  - [x]* 1.2 Property 3のプロパティテストを作成




    - **Property 3: フォルダID永続化**
    - **Validates: Requirements 2.2**



- [ ] 2. Google Drive認証の拡張
  - [ ] 2.1 GoogleAuthServiceにDrive APIスコープを追加
    - 既存のCALENDAR_SCOPESにDRIVE_SCOPESを追加




    - `https://www.googleapis.com/auth/drive.file`スコープを使用
    - _Requirements: 5.1, 5.2_

  - [ ] 2.2 環境変数にGOOGLE_DRIVE_PARENT_FOLDER_IDを追加
    - .env.exampleを更新
    - _Requirements: 2.1_
  - [ ]* 2.3 Property 8のプロパティテストを作成
    - **Property 8: トークン自動更新**
    - **Validates: Requirements 5.3**


- [ ] 3. GoogleDriveServiceの実装
  - [ ] 3.1 GoogleDriveServiceクラスの基本構造を作成
    - Google Drive APIクライアントの初期化
    - 認証済みクライアント取得メソッド
    - _Requirements: 5.1_
  - [x] 3.2 フォルダ検索・作成メソッドを実装

    - findFolderByName: 親フォルダ内でフォルダ名検索
    - createFolder: 新規フォルダ作成
    - getOrCreateSellerFolder: 売主フォルダ取得または作成
    - _Requirements: 2.1, 2.4_
  - [ ]* 3.3 Property 2のプロパティテストを作成
    - **Property 2: フォルダ作成の冪等性**

    - **Validates: Requirements 2.1, 2.4**
  - [ ] 3.4 ファイル一覧取得メソッドを実装
    - listFiles: フォルダ内のファイル一覧取得
    - ファイル名、サイズ、更新日時、リンクを含む
    - _Requirements: 1.3, 1.4_

  - [ ]* 3.5 Property 1のプロパティテストを作成
    - **Property 1: ファイル一覧表示の完全性**
    - **Validates: Requirements 1.4**
  - [ ] 3.6 ファイルアップロードメソッドを実装
    - uploadFile: ファイルをGoogle Driveにアップロード
    - PDFファイルのMIMEタイプ処理
    - _Requirements: 3.2_
  - [ ]* 3.7 Property 4のプロパティテストを作成
    - **Property 4: アップロード後のファイル存在確認**

    - **Validates: Requirements 3.2, 3.4**
  - [ ] 3.8 ファイル削除メソッドを実装
    - deleteFile: Google Driveからファイル削除




    - _Requirements: 4.4_
  - [x]* 3.9 Property 7のプロパティテストを作成

    - **Property 7: 削除後のファイル不在確認**
    - **Validates: Requirements 4.4**
  - [x] 3.10 URL生成メソッドを実装

    - getPreviewUrl: プレビューURL生成
    - getDownloadUrl: ダウンロードURL生成
    - getFolderUrl: フォルダURL生成

    - _Requirements: 4.1, 4.2, 6.2_
  - [x]* 3.11 Property 5, 6, 9のプロパティテストを作成

    - **Property 5: プレビューURL生成の正確性**
    - **Property 6: ダウンロードURL生成の正確性**

    - **Property 9: フォルダURL生成の正確性**

    - **Validates: Requirements 4.1, 4.2, 6.2**

- [ ] 4. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.





- [ ] 5. APIルートの実装
  - [ ] 5.1 driveRoutes.tsを作成
    - Express Routerの設定

    - 認証ミドルウェアの適用
    - _Requirements: 5.1_
  - [ ] 5.2 GET /api/drive/folders/:sellerNumber エンドポイントを実装
    - フォルダ情報取得（自動作成含む）

    - ファイル一覧を含むレスポンス
    - _Requirements: 1.3, 2.1, 2.4_
  - [ ] 5.3 POST /api/drive/folders/:sellerNumber/files エンドポイントを実装
    - multipart/form-dataでファイル受信

    - multerミドルウェアの設定
    - _Requirements: 3.2_
  - [x] 5.4 DELETE /api/drive/files/:fileId エンドポイントを実装

    - ファイル削除処理
    - _Requirements: 4.4_

  - [ ] 5.5 エラーハンドリングを実装
    - 認証エラー、スコープ不足、API エラーの処理
    - _Requirements: 2.3, 3.5, 5.4_
  - [ ] 5.6 index.tsにルートを登録
    - /api/driveパスでルートを追加

    - _Requirements: 5.1_

- [ ] 6. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.




- [ ] 7. フロントエンドコンポーネントの実装
  - [ ] 7.1 DocumentModalコンポーネントを作成
    - モーダルの基本構造
    - ファイル一覧表示
    - アップロードボタン
    - Google Driveで開くリンク
    - _Requirements: 1.2, 1.3, 1.4, 6.1_
  - [ ] 7.2 ファイルアップロード機能を実装
    - ファイル選択ダイアログ
    - アップロード進捗表示
    - 成功/エラーメッセージ
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [ ] 7.3 ファイル操作機能を実装
    - プレビューリンク（新しいタブで開く）
    - ダウンロードボタン
    - 削除ボタンと確認ダイアログ
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 7.4 CallModePage.tsxに「画像」ボタンを追加
    - Email送信ボタンの左側に配置
    - DocumentModalの表示制御
    - _Requirements: 1.1, 1.2_
  - [ ] 7.5 api.tsにDrive API呼び出しを追加
    - getSellerFolder
    - uploadFile
    - deleteFile
    - _Requirements: 1.3, 3.2, 4.4_

- [ ] 8. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 統合とテスト
  - [ ]* 9.1 統合テストを作成
    - フォルダ作成からファイル操作までの一連のフロー
    - _Requirements: 1.1-6.2_
  - [ ] 9.2 手動テストとデバッグ
    - 実際のGoogle Driveとの連携確認
    - UIの動作確認
    - _Requirements: 1.1-6.2_

- [ ] 10. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
