# 要件定義書

## はじめに

通話モードページに追客ログの履歴テーブルを表示する機能を実装します。現在、追客ログテーブルを表示しようとするとSQL構文エラーが発生しているため、この問題を解決し、営業担当者が過去の追客履歴を一覧で確認できるようにします。

## 用語集

- **System**: 売主リスト管理システム
- **Call Mode Page**: 通話専用ページ（/sellers/:id/call）
- **Follow-Up Log**: 追客ログ（電話、メール、SMS等の追客活動の記録）
- **Activity**: 活動履歴（追客ログを含む）
- **Employee**: システムを利用する営業担当者
- **Seller**: 売主

## 要件

### 要件 1

**ユーザーストーリー:** 営業担当者として、通話モードページで過去の追客ログを一覧表示したい。そうすることで、過去の追客活動を素早く確認しながら電話できる。

#### 受入基準

1. WHEN 通話モードページが表示される THEN THE System SHALL 追客ログの履歴テーブルを表示する
2. WHEN 追客ログテーブルが表示される THEN THE System SHALL 日時、担当者、種別、内容を列として表示する
3. WHEN 追客ログテーブルが表示される THEN THE System SHALL 最新の追客ログを上位に表示する
4. WHEN 追客ログテーブルが表示される THEN THE System SHALL 最大20件の追客ログを表示する
5. WHEN 追客ログデータが存在しない THEN THE System SHALL 「追客ログがありません」というメッセージを表示する

### 要件 2

**ユーザーストーリー:** 営業担当者として、追客ログの種別を一目で識別したい。そうすることで、どのような追客活動が行われたかを素早く把握できる。

#### 受入基準

1. WHEN 追客ログの種別が「電話」である THEN THE System SHALL 電話アイコンを表示する
2. WHEN 追客ログの種別が「メール」である THEN THE System SHALL メールアイコンを表示する
3. WHEN 追客ログの種別が「SMS」である THEN THE System SHALL SMSアイコンを表示する
4. WHEN 追客ログの種別が「訪問」である THEN THE System SHALL 訪問アイコンを表示する
5. WHEN 追客ログの種別が不明である THEN THE System SHALL デフォルトアイコンを表示する

### 要件 3

**ユーザーストーリー:** 営業担当者として、追客ログの担当者を表示名で確認したい。そうすることで、誰が追客活動を行ったかを一目で把握できる。

#### 受入基準

1. WHEN 追客ログに担当者情報が含まれる THEN THE System SHALL 担当者の表示名を表示する
2. WHEN 担当者のメールアドレスが "tomoko.kunihiro@ifoo-oita.com" である THEN THE System SHALL 表示名として "K" を表示する
3. WHEN 担当者情報が取得できない THEN THE System SHALL "不明" と表示する
4. WHEN 複数の担当者が追客活動を行っている THEN THE System SHALL それぞれの担当者の表示名を正しく表示する

### 要件 4

**ユーザーストーリー:** システム管理者として、追客ログデータを効率的に取得したい。そうすることで、ページの読み込み速度を維持できる。

#### 受入基準

1. WHEN 追客ログデータを取得する THEN THE System SHALL activities テーブルから売主IDに紐づくデータを取得する
2. WHEN 追客ログデータを取得する THEN THE System SHALL employees テーブルと JOIN して担当者情報を取得する
3. WHEN 追客ログデータを取得する THEN THE System SHALL 作成日時の降順でソートする
4. WHEN 追客ログデータを取得する THEN THE System SHALL LIMIT句を使用して最大20件に制限する
5. WHEN SQLクエリを実行する THEN THE System SHALL 構文エラーが発生しないようにする

### 要件 5

**ユーザーストーリー:** 開発者として、追客ログテーブルのSQL構文エラーを修正したい。そうすることで、テーブルが正しく表示されるようにする。

#### 受入基準

1. WHEN SQLクエリを構築する THEN THE System SHALL 予約語や特殊文字を適切にエスケープする
2. WHEN SQLクエリを構築する THEN THE System SHALL カラム名を正しく指定する
3. WHEN SQLクエリを構築する THEN THE System SHALL JOIN句を正しく記述する
4. WHEN SQLクエリを実行する THEN THE System SHALL "Unexpected token" エラーが発生しない
5. WHEN SQLクエリを実行する THEN THE System SHALL 期待されるデータが正しく返される

### 要件 6

**ユーザーストーリー:** 営業担当者として、追客ログの内容を読みやすい形式で表示したい。そうすることで、過去の追客内容を素早く理解できる。

#### 受入基準

1. WHEN 追客ログの内容が長い THEN THE System SHALL 最初の100文字のみを表示する
2. WHEN 追客ログの内容が省略される THEN THE System SHALL "..." を末尾に追加する
3. WHEN 追客ログの内容に改行が含まれる THEN THE System SHALL 改行を空白に置き換える
4. WHEN 追客ログの日時が表示される THEN THE System SHALL "YYYY/MM/DD HH:mm" 形式で表示する
5. WHEN 追客ログテーブルが表示される THEN THE System SHALL 各行を交互に色分けして表示する

### 要件 7

**ユーザーストーリー:** 営業担当者として、追客ログテーブルをスクロールして過去のログを確認したい。そうすることで、必要な情報を見つけやすくなる。

#### 受入基準

1. WHEN 追客ログが20件以上ある THEN THE System SHALL テーブルをスクロール可能にする
2. WHEN テーブルをスクロールする THEN THE System SHALL ヘッダー行を固定する
3. WHEN テーブルの高さが画面を超える THEN THE System SHALL 最大高さを設定してスクロールバーを表示する
4. WHEN テーブルが表示される THEN THE System SHALL レスポンシブデザインを適用する
5. WHEN モバイルデバイスで表示される THEN THE System SHALL 横スクロールを有効にする
