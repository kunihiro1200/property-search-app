# Requirements Document

## Introduction

公開物件サイトの詳細画面にある「概算書」ボタンをクリックしても、概算書PDFが表示されなくなりました。テスト環境では正常に動作していましたが、本番環境（Vercel）にデプロイ後、404エラーが発生しています。エラーメッセージは「税務署の住所に失敗しました」と表示され、ブラウザコンソールには `POST /api/public/properties/:propertyNumber/estimate-pdf` が404エラーとなっています。本番環境でのAPIルーティング設定を修正する必要があります。

## Glossary

- **System**: 公開物件サイトシステム
- **EstimatePdf**: 概算書PDF。物件の費用概算を示すPDFドキュメント
- **PropertyNumber**: 物件番号（例: AA10424）
- **PdfGeneration**: PDF生成。スプレッドシートの内容をPDF形式でエクスポートする処理
- **EstimateButton**: 概算書ボタン。公開物件詳細画面にあるPDF生成ボタン
- **GoogleSheetsApi**: Google Sheets API。スプレッドシートへのアクセスと操作を行うAPI
- **PdfExportUrl**: PDFエクスポートURL。Google SheetsからPDFをエクスポートするためのURL
- **VercelDeployment**: Vercelデプロイメント。本番環境のホスティングプラットフォーム
- **ApiRouting**: APIルーティング。HTTPリクエストを適切なエンドポイントに振り分ける仕組み
- **404Error**: 404エラー。リクエストされたリソースが見つからないことを示すHTTPステータスコード

## Requirements

### Requirement 1

**User Story:** ユーザーとして、概算書ボタンをクリックした時にPDFが正常に表示されることを期待する。そうすることで、物件の費用概算を確認できる。

#### Acceptance Criteria

1. WHEN ユーザーが概算書ボタンをクリックする THEN the System SHALL PDF生成処理を開始する
2. WHEN PDF生成処理が成功する THEN the System SHALL PDFを新しいタブで開く
3. WHEN PDF生成処理が失敗する THEN the System SHALL 具体的なエラーメッセージを表示する
4. WHEN PDFが生成される THEN the System SHALL 正しい物件番号のPDFを返す

### Requirement 2

**User Story:** システム管理者として、本番環境でAPIエンドポイントが正しくルーティングされることを確認したい。そうすることで、404エラーを解消できる。

#### Acceptance Criteria

1. WHEN 本番環境でPDF生成APIにアクセスする THEN the System SHALL 正しいエンドポイントにルーティングする
2. WHEN `/api/public/properties/:propertyNumber/estimate-pdf` にPOSTリクエストを送信する THEN the System SHALL 404エラーを返さない
3. WHEN Vercelの設定ファイルを確認する THEN the System SHALL APIルートが正しく設定されている
4. WHEN バックエンドAPIサーバーが起動している THEN the System SHALL 概算書エンドポイントが利用可能である

### Requirement 3

**User Story:** システム管理者として、PDF生成の失敗原因を特定したい。そうすることで、迅速に問題を解決できる。

#### Acceptance Criteria

1. WHEN PDF生成処理を実行する THEN the System SHALL 各ステップのログを記録する
2. WHEN APIエンドポイントが見つからない THEN the System SHALL 404エラーの詳細をログに記録する
3. WHEN Google Sheets APIへのアクセスが失敗する THEN the System SHALL 認証エラーの詳細をログに記録する
4. WHEN スプレッドシートへの書き込みが失敗する THEN the System SHALL 書き込みエラーの詳細をログに記録する

### Requirement 4

**User Story:** 開発者として、Google Sheets APIの認証が正しく機能していることを確認したい。そうすることで、認証関連の問題を排除できる。

### Requirement 4

**User Story:** 開発者として、Google Sheets APIの認証が正しく機能していることを確認したい。そうすることで、認証関連の問題を排除できる。

#### Acceptance Criteria

1. WHEN PDF生成処理を開始する THEN the System SHALL サービスアカウントキーファイルを読み込む
2. WHEN サービスアカウントキーファイルが存在しない THEN the System SHALL エラーをスローする
3. WHEN Google Sheets APIに認証する THEN the System SHALL 正しいスコープを使用する
4. WHEN 認証が成功する THEN the System SHALL 認証成功ログを記録する

### Requirement 5

**User Story:** 開発者として、スプレッドシートへのアクセス権限が正しく設定されていることを確認したい。そうすることで、権限関連の問題を排除できる。

### Requirement 5

**User Story:** 開発者として、スプレッドシートへのアクセス権限が正しく設定されていることを確認したい。そうすることで、権限関連の問題を排除できる。

#### Acceptance Criteria

1. WHEN スプレッドシートにアクセスする THEN the System SHALL 正しいスプレッドシートIDを使用する
2. WHEN スプレッドシートが存在しない THEN the System SHALL エラーをスローする
3. WHEN サービスアカウントに権限がない THEN the System SHALL 権限エラーをスローする
4. WHEN スプレッドシートへのアクセスが成功する THEN the System SHALL アクセス成功ログを記録する

### Requirement 6

**User Story:** 開発者として、PDFエクスポートURLが正しく生成されていることを確認したい。そうすることで、URL生成関連の問題を排除できる。

### Requirement 6

**User Story:** 開発者として、PDFエクスポートURLが正しく生成されていることを確認したい。そうすることで、URL生成関連の問題を排除できる。

#### Acceptance Criteria

1. WHEN PDFエクスポートURLを生成する THEN the System SHALL 正しいスプレッドシートIDを含める
2. WHEN PDFエクスポートURLを生成する THEN the System SHALL 正しいシートIDを含める
3. WHEN PDFエクスポートURLを生成する THEN the System SHALL PDF形式のパラメータを含める
4. WHEN PDFエクスポートURLを生成する THEN the System SHALL 生成されたURLをログに記録する

### Requirement 7

**User Story:** ユーザーとして、PDF生成中の状態を把握したい。そうすることで、処理が進行中であることを理解できる。

#### Acceptance Criteria

1. WHEN PDF生成を開始する THEN the System SHALL ローディング状態を表示する
2. WHEN PDF生成中 THEN the System SHALL ボタンを無効化する
3. WHEN PDF生成が完了する THEN the System SHALL ローディング状態を解除する
4. WHEN エラーが発生する THEN the System SHALL エラーメッセージをアラートで表示する

