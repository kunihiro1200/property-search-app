# 要件定義書

## はじめに

追客電話のログ機能を強化し、電話をかけた担当者の情報を表示できるようにします。現在は追客日時のみが記録・表示されていますが、誰が電話したかも一目で分かるようにすることで、チーム内での情報共有と追客活動の可視化を向上させます。

## 用語集

- **System**: 売主リスト管理システム
- **Employee**: システムを利用する社員
- **Activity**: 追客活動（電話、メール、SMS等）の記録
- **Call Log**: 電話による追客活動の記録
- **Display Name**: 社員のメールアドレスから生成される表示用の短縮名（例：tomoko.kunihiro@ifoo-oita.com → K）

## 要件

### 要件 1

**ユーザーストーリー:** 営業担当者として、追客電話の履歴を見たときに、誰がいつ電話したかを一目で把握したい。そうすることで、チーム内での追客状況を効率的に共有できる。

#### 受入基準

1. WHEN 追客電話の活動ログが表示される THEN THE System SHALL 電話をかけた担当者の表示名と日時を含めて表示する
2. WHEN 担当者のメールアドレスが "tomoko.kunihiro@ifoo-oita.com" である THEN THE System SHALL 表示名として "K" を生成する
3. WHEN 追客電話ログが表示される THEN THE System SHALL "K 2025/12/1 14:30" のような形式で表示する
4. WHEN 複数の担当者が同じ売主に電話している THEN THE System SHALL それぞれの担当者の表示名を正しく表示する
5. WHEN 担当者情報が取得できない場合 THEN THE System SHALL デフォルトの表示名または日時のみを表示する

### 要件 2

**ユーザーストーリー:** システム管理者として、社員のメールアドレスから一貫性のある表示名を生成したい。そうすることで、UIが統一され、ユーザーが混乱しない。

#### 受入基準

1. WHEN 社員のメールアドレスが提供される THEN THE System SHALL メールアドレスの名前部分から表示名を生成する
2. WHEN メールアドレスの形式が "firstname.lastname@domain.com" である THEN THE System SHALL 姓（lastname）の最初の文字を大文字にして表示名とする
3. WHEN メールアドレスの形式が "name@domain.com" である THEN THE System SHALL 名前の最初の文字を大文字にして表示名とする
4. WHEN 同じメールアドレスに対して複数回表示名生成が呼ばれる THEN THE System SHALL 同じ表示名を返す
5. WHEN メールアドレスが無効または空である THEN THE System SHALL デフォルトの表示名（例："?"）を返す

### 要件 3

**ユーザーストーリー:** 開発者として、既存のデータベーススキーマを変更せずに機能を実装したい。そうすることで、マイグレーションのリスクを最小限に抑えられる。

#### 受入基準

1. WHEN 追客電話ログを取得する THEN THE System SHALL 既存の activities テーブルと employees テーブルを JOIN して担当者情報を取得する
2. WHEN 活動ログに employee_id が含まれている THEN THE System SHALL その ID を使用して担当者情報を取得する
3. WHEN データベースクエリが実行される THEN THE System SHALL 既存のテーブル構造を変更せずに必要な情報を取得する
4. WHEN 複数の活動ログを取得する THEN THE System SHALL 効率的な JOIN クエリを使用してパフォーマンスを維持する

### 要件 4

**ユーザーストーリー:** フロントエンド開発者として、バックエンドから担当者情報を含む活動ログを受け取りたい。そうすることで、フロントエンドで簡単に表示できる。

#### 受入基準

1. WHEN フロントエンドが活動ログ API を呼び出す THEN THE System SHALL 各活動ログに担当者情報を含めて返す
2. WHEN 活動ログのレスポンスが返される THEN THE System SHALL employee オブジェクトに id、email、name フィールドを含める
3. WHEN API レスポンスが構築される THEN THE System SHALL キャメルケース形式で JSON を返す
4. WHEN 担当者情報が見つからない THEN THE System SHALL employee フィールドを null として返す
5. WHEN 複数の活動ログが返される THEN THE System SHALL すべてのログに一貫した形式で担当者情報を含める
