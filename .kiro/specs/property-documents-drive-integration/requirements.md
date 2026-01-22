# Requirements Document

## Introduction

本機能は、通話モードページのヘッダーに「画像」フィールドを追加し、物件に関連するPDFドキュメント（ゼンリン地図、謄本等）をGoogle Driveの「業務依頼」フォルダに格納・管理する機能を提供する。売主番号に基づいてGoogle Drive上の「業務依頼」フォルダ内に売主番号フォルダを直接作成し、ドキュメントのアップロード・閲覧を可能にする。

## Glossary

- **通話モードページ (Call Mode Page)**: 売主との通話中に使用する専用ページ。売主情報、物件情報、通話履歴などを一画面で確認・操作できる
- **売主番号 (Seller Number)**: 売主を一意に識別する番号（例: AA12345）
- **業務依頼フォルダ (Business Request Folder)**: Google Drive上の親フォルダ。売主番号フォルダを直接格納する
- **売主ドキュメントフォルダ (Seller Document Folder)**: 売主番号をフォルダ名とするGoogle Drive上のフォルダ。「業務依頼」フォルダ直下に作成される
- **ゼンリン (Zenrin)**: 住宅地図サービス。物件の位置情報を示すPDF
- **謄本 (Tohon)**: 不動産登記簿謄本。物件の権利関係を示す公的書類
- **Google Drive API**: Googleが提供するクラウドストレージサービスのAPI

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to 通話モードのヘッダーから売主関連ドキュメントにアクセスする, so that 通話中に必要な資料をすぐに確認できる

#### Acceptance Criteria

1. WHEN ユーザーが通話モードページを開く THEN システム SHALL Email送信ボタンの左側に「画像」ボタンを表示する
2. WHEN 「画像」ボタンがクリックされる THEN システム SHALL 売主ドキュメント管理モーダルを表示する
3. WHEN 売主ドキュメント管理モーダルが表示される THEN システム SHALL Google Drive上の該当売主フォルダ内のファイル一覧を表示する
4. WHEN ファイル一覧が表示される THEN システム SHALL 各ファイルの名前、サイズ、更新日時を表示する

### Requirement 2

**User Story:** As a 営業担当者, I want to 売主番号に基づいてGoogle Driveにフォルダを自動作成する, so that ドキュメントを整理して保存できる

#### Acceptance Criteria

1. WHEN 「画像」ボタンがクリックされ、該当売主番号のフォルダが存在しない THEN システム SHALL 「業務依頼」フォルダ直下に売主番号をフォルダ名とするフォルダを自動作成する
2. WHEN フォルダ作成が成功する THEN システム SHALL 作成されたフォルダのIDをデータベースに保存する
3. WHEN フォルダ作成中にエラーが発生する THEN システム SHALL ユーザーにエラーメッセージを表示し、再試行オプションを提供する
4. WHEN 該当売主番号のフォルダが既に存在する THEN システム SHALL 既存のフォルダを使用し、新規作成をスキップする

### Requirement 3

**User Story:** As a 営業担当者, I want to PDFファイルをGoogle Driveにアップロードする, so that 売主関連ドキュメントを保存できる

#### Acceptance Criteria

1. WHEN ユーザーがファイルアップロードボタンをクリックする THEN システム SHALL ファイル選択ダイアログを表示する
2. WHEN ユーザーがPDFファイルを選択する THEN システム SHALL ファイルを売主ドキュメントフォルダにアップロードする
3. WHEN アップロードが進行中 THEN システム SHALL プログレスバーでアップロード進捗を表示する
4. WHEN アップロードが完了する THEN システム SHALL ファイル一覧を更新し、成功メッセージを表示する
5. WHEN アップロード中にエラーが発生する THEN システム SHALL エラーメッセージを表示し、再試行オプションを提供する

### Requirement 4

**User Story:** As a 営業担当者, I want to アップロードされたドキュメントを閲覧する, so that 通話中に必要な情報を確認できる

#### Acceptance Criteria

1. WHEN ユーザーがファイル一覧のファイル名をクリックする THEN システム SHALL 新しいタブでGoogle Driveのプレビューを開く
2. WHEN ファイルのダウンロードボタンがクリックされる THEN システム SHALL ファイルをローカルにダウンロードする
3. WHEN ファイルの削除ボタンがクリックされる THEN システム SHALL 確認ダイアログを表示する
4. WHEN 削除が確認される THEN システム SHALL Google Driveからファイルを削除し、一覧を更新する

### Requirement 5

**User Story:** As a システム管理者, I want to Google Drive APIとの認証を管理する, so that セキュアにファイル操作ができる

#### Acceptance Criteria

1. WHEN システムがGoogle Drive APIにアクセスする THEN システム SHALL 既存のGoogle OAuth認証を使用する
2. WHEN Google Drive APIのスコープが不足している THEN システム SHALL 追加のスコープ承認を要求する
3. WHEN 認証トークンが期限切れになる THEN システム SHALL リフレッシュトークンを使用して自動更新する
4. WHEN 認証エラーが発生する THEN システム SHALL ユーザーに再認証を促すメッセージを表示する

### Requirement 6

**User Story:** As a 営業担当者, I want to 売主フォルダへのクイックアクセスリンクを取得する, so that Google Driveで直接フォルダを開ける

#### Acceptance Criteria

1. WHEN 売主ドキュメント管理モーダルが表示される THEN システム SHALL 「Google Driveで開く」リンクを表示する
2. WHEN 「Google Driveで開く」リンクがクリックされる THEN システム SHALL 新しいタブでGoogle Driveの該当フォルダを開く
