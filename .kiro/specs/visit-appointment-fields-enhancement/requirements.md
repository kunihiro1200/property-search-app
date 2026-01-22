# 要件定義書

## はじめに

通話モードページの訪問予約セクションに「訪問部」「営担」「訪問査定取得者」の3つのフィールドを追加し、スプレッドシートと双方向で同期できるようにします。これにより、訪問予約の詳細情報をより正確に管理し、スプレッドシートとシステム間でデータの一貫性を保つことができます。

## 用語集

- **System**: 売主リスト管理システム
- **Call Mode Page**: 通話専用ページ（/sellers/:id/call）
- **Appointment Section**: 訪問予約セクション
- **Visit Department**: 訪問部（訪問を担当する部署）
- **Sales Representative**: 営担（営業担当者）
- **Visit Valuation Acquirer**: 訪問査定取得者（訪問査定を取得した担当者）
- **Visit Valuation Date**: 訪問査定日時（訪問査定の予定日時）
- **Logged-in User**: ログインユーザー（現在システムにログインしているユーザー）
- **Staff**: スタッフ（システムに登録されている従業員）
- **Spreadsheet**: Google スプレッドシート
- **Seller**: 売主

## 要件

### 要件 1

**ユーザーストーリー:** 営業担当者として、訪問予約セクションに訪問部、営担、訪問査定取得者の情報を入力したい。そうすることで、訪問に関する詳細な情報を一元管理できる。

#### 受入基準

1. WHEN 訪問予約セクションが表示される THEN THE System SHALL 訪問部フィールドを表示する
2. WHEN 訪問予約セクションが表示される THEN THE System SHALL 営担フィールドを表示する
3. WHEN 訪問予約セクションが表示される THEN THE System SHALL 訪問査定取得者フィールドを表示する
4. WHEN 訪問予約セクションが編集モードになる THEN THE System SHALL 3つのフィールドすべてを編集可能にする
5. WHEN ユーザーが保存ボタンをクリックする THEN THE System SHALL 3つのフィールドの値をデータベースに保存する

### 要件 2

**ユーザーストーリー:** 営業担当者として、訪問部と訪問査定取得者をドロップダウンから選択したい。そうすることで、入力ミスを防ぎ、一貫性のあるデータを登録できる。

#### 受入基準

1. WHEN 訪問部フィールドが編集モードで表示される THEN THE System SHALL スタッフ一覧をドロップダウンで表示する
2. WHEN 訪問査定取得者フィールドが編集モードで表示される THEN THE System SHALL スタッフ一覧をドロップダウンで表示する
3. WHEN 営担フィールドが編集モードで表示される THEN THE System SHALL スタッフ一覧をドロップダウンで表示する
4. WHEN ドロップダウンが表示される THEN THE System SHALL スタッフの名前を「姓 名」形式で表示する
5. WHEN ドロップダウンが表示される THEN THE System SHALL 空の選択肢を含める

### 要件 3

**ユーザーストーリー:** 営業担当者として、訪問予約情報を保存したときにスプレッドシートにも反映したい。そうすることで、スプレッドシートとシステムのデータを常に同期できる。

#### 受入基準

1. WHEN 訪問予約情報を保存する THEN THE System SHALL 訪問部をスプレッドシートの対応する列に書き込む
2. WHEN 訪問予約情報を保存する THEN THE System SHALL 営担をスプレッドシートの対応する列に書き込む
3. WHEN 訪問予約情報を保存する THEN THE System SHALL 訪問査定取得者をスプレッドシートの対応する列に書き込む
4. WHEN スプレッドシートへの書き込みが失敗する THEN THE System SHALL エラーメッセージを表示する
5. WHEN スプレッドシートへの書き込みが成功する THEN THE System SHALL 成功メッセージを表示する

### 要件 4

**ユーザーストーリー:** 営業担当者として、スプレッドシートから売主情報を読み込むときに訪問予約情報も取得したい。そうすることで、スプレッドシートに入力された情報をシステムで確認できる。

#### 受入基準

1. WHEN スプレッドシートから売主情報を同期する THEN THE System SHALL 訪問部の列からデータを読み取る
2. WHEN スプレッドシートから売主情報を同期する THEN THE System SHALL 営担の列からデータを読み取る
3. WHEN スプレッドシートから売主情報を同期する THEN THE System SHALL 訪問査定取得者の列からデータを読み取る
4. WHEN 読み取ったデータが空でない THEN THE System SHALL データベースに保存する
5. WHEN 読み取ったデータが空である THEN THE System SHALL NULL値として保存する

### 要件 5

**ユーザーストーリー:** 営業担当者として、訪問予約セクションで現在の値を確認したい。そうすることで、どの担当者が訪問を担当しているかを把握できる。

#### 受入基準

1. WHEN 訪問予約セクションが表示モードで表示される THEN THE System SHALL 訪問部の現在の値を表示する
2. WHEN 訪問予約セクションが表示モードで表示される THEN THE System SHALL 営担の現在の値を表示する
3. WHEN 訪問予約セクションが表示モードで表示される THEN THE System SHALL 訪問査定取得者の現在の値を表示する
4. WHEN フィールドの値が設定されていない THEN THE System SHALL 「未設定」と表示する
5. WHEN フィールドの値が設定されている THEN THE System SHALL スタッフの名前を「姓 名」形式で表示する

### 要件 6

**ユーザーストーリー:** システム管理者として、訪問予約情報のデータベーススキーマを拡張したい。そうすることで、新しいフィールドを永続化できる。

#### 受入基準

1. WHEN データベーススキーマを更新する THEN THE System SHALL sellers テーブルに visit_department 列を追加する
2. WHEN データベーススキーマを更新する THEN THE System SHALL sellers テーブルに visit_valuation_acquirer 列を追加する
3. WHEN 列を追加する THEN THE System SHALL 列のデータ型を TEXT に設定する
4. WHEN 列を追加する THEN THE System SHALL NULL 値を許可する
5. WHEN 既存のデータが存在する THEN THE System SHALL データの整合性を保つ

### 要件 7

**ユーザーストーリー:** 営業担当者として、訪問査定日時を入力したときに訪問査定取得者が自動的に設定されるようにしたい。そうすることで、手動で入力する手間を省き、入力ミスを防ぐことができる。

#### 受入基準

1. WHEN ユーザーが訪問査定日時フィールドに値を入力する THEN THE System SHALL 現在ログインしているユーザーのメールアドレスを取得する
2. WHEN 現在ログインしているユーザーのメールアドレスを取得する THEN THE System SHALL そのメールアドレスに対応するスタッフ情報を検索する
3. WHEN スタッフ情報が見つかる THEN THE System SHALL 訪問査定取得者フィールドにそのスタッフの名前を自動的に設定する
4. WHEN 訪問査定取得者フィールドが既に値を持っている THEN THE System SHALL 既存の値を上書きする
5. WHEN スタッフ情報が見つからない THEN THE System SHALL 訪問査定取得者フィールドを空のままにする
