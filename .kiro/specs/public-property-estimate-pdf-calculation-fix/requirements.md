# Requirements Document

## Introduction

公開物件サイトの詳細画面にある「概算書」ボタンを押すと、1回目は金額が入っていないPDFが生成され、2回目で正しく金額が入るという問題があります。これは、スプレッドシートに物件番号を入力してから、計算式が完了する前にPDFを生成しているためです。本機能は、計算が完全に完了してからPDFを生成することで、初回から正しい金額が表示されるようにします。

## Glossary

- **System**: 公開物件サイトシステム
- **EstimatePdf**: 概算書PDF。物件の費用概算を示すPDFドキュメント
- **PropertyNumber**: 物件番号（例: AA10424）
- **SpreadsheetCalculation**: スプレッドシートの計算式。物件番号を入力すると自動的に費用を計算する
- **CalculationCompletion**: 計算完了。スプレッドシートの全ての計算式が実行され、結果が確定した状態
- **PdfGeneration**: PDF生成。スプレッドシートの内容をPDF形式でエクスポートする処理

## Requirements

### Requirement 1

**User Story:** ユーザーとして、概算書ボタンを初回クリック時から正しい金額が入ったPDFを取得したい。そうすることで、何度もボタンを押す必要がなくなる。

#### Acceptance Criteria

1. WHEN ユーザーが概算書ボタンをクリックする THEN the System SHALL スプレッドシートに物件番号を書き込む
2. WHEN 物件番号を書き込んだ後 THEN the System SHALL 計算式の完了を確認する
3. WHEN 計算が完了した後 THEN the System SHALL PDFを生成する
4. WHEN PDFを生成する THEN the System SHALL 金額が正しく計算された状態のPDFを返す

### Requirement 2

**User Story:** システム管理者として、計算完了を確実に検証したい。そうすることで、不完全なPDFが生成されることを防げる。

#### Acceptance Criteria

1. WHEN 計算完了を確認する THEN the System SHALL D11セル（金額セル）の値を読み取る
2. WHEN D11セルの値が空または0の場合 THEN the System SHALL 再度待機して確認する
3. WHEN 最大待機時間（10秒）を超えた場合 THEN the System SHALL エラーを返す
4. WHEN D11セルに有効な値（数値）が入っている場合 THEN the System SHALL 計算完了と判断する

### Requirement 3

**User Story:** 開発者として、計算完了の検証ロジックを設定可能にしたい。そうすることで、スプレッドシートの構造変更に柔軟に対応できる。

#### Acceptance Criteria

1. WHEN 計算完了を検証する THEN the System SHALL D11セルを検証セルとして使用する
2. WHEN 検証セルを変更する必要がある場合 THEN the System SHALL コード内の定数で簡単に変更できる
3. WHEN 待機時間を設定する THEN the System SHALL 環境変数で最大待機時間を制御できる
4. WHEN リトライ間隔を設定する THEN the System SHALL 環境変数でポーリング間隔を制御できる

### Requirement 4

**User Story:** ユーザーとして、PDF生成中の状態を把握したい。そうすることで、処理が進行中であることを理解できる。

#### Acceptance Criteria

1. WHEN PDF生成を開始する THEN the System SHALL ローディング状態を表示する
2. WHEN 計算待機中 THEN the System SHALL 「計算中...」というメッセージを表示する
3. WHEN PDF生成中 THEN the System SHALL 「生成中...」というメッセージを表示する
4. WHEN エラーが発生した場合 THEN the System SHALL 具体的なエラーメッセージを表示する

### Requirement 5

**User Story:** システム管理者として、PDF生成処理のログを確認したい。そうすることで、問題発生時のトラブルシューティングができる。

#### Acceptance Criteria

1. WHEN PDF生成を開始する THEN the System SHALL 開始ログを記録する
2. WHEN 計算完了を待機する THEN the System SHALL 待機状態と経過時間をログに記録する
3. WHEN 計算が完了する THEN the System SHALL 完了ログと所要時間を記録する
4. WHEN エラーが発生する THEN the System SHALL エラー詳細をログに記録する
