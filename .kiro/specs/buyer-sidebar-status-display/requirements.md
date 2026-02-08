# Requirements Document

## Introduction

買主リストのサイドバーに「カテゴリ > ステータス表示」機能を実装します。この機能は、AppSheetで使用されているIFSロジックと同一の優先順位で買主のステータスを算出し、サイドバーに表示します。これにより、ユーザーは買主の現在の状態を一目で把握でき、適切なアクションを取ることができます。

## Glossary

- **System**: 買主管理システム（Buyer Management System）
- **Sidebar**: 買主リスト画面の左側に表示されるナビゲーション領域
- **Status**: 買主の現在の状態を示す文字列（例: "査定アンケート回答あり"、"内覧日前日"など）
- **IFS Logic**: AppSheetで使用されている条件分岐ロジック（IF-ELSE-IF構造）
- **Priority**: ステータス判定の優先順位（上から順に評価し、最初に一致した条件を採用）
- **Buyer**: 買主（物件への問い合わせを行った顧客）
- **Property**: 物件
- **Viewing**: 内覧
- **Follow_Up_Assignee**: 後続担当者
- **Next_Call_Date**: 次電日（次回電話連絡予定日）
- **Latest_Status**: 最新状況
- **Inquiry_Confidence**: 問合時確度
- **Reception_Date**: 受付日
- **Latest_Viewing_Date**: 内覧日（最新）
- **Broker_Inquiry**: 業者問合せ
- **Email**: メールアドレス
- **Pinrich**: ピンリッチ（不動産情報サービス）
- **Viewing_Promotion_Email**: 内覧促進メール
- **Three_Calls_Confirmed**: 3回架電確認済み
- **Inquiry_Email_Phone**: 【問合メール】電話対応
- **Inquiry_Email_Reply**: 【問合メール】メール返信
- **Viewing_Result_Follow_Up**: 内覧結果・後続対応
- **Valuation_Survey**: 査定アンケート
- **Valuation_Survey_Confirmed**: 査定アンケート確認
- **Broker_Survey**: 業者向けアンケート
- **Day_Of_Week**: 曜日
- **Notification_Sender**: 通知送信者
- **Viewing_Unconfirmed**: 内覧未確定
- **Post_Viewing_Seller_Contact**: 内覧後売主連絡
- **Viewing_Type_General**: 内覧形態_一般媒介
- **Email_Confirmation**: メアド確認
- **Email_Confirmation_Assignee**: メアド確認メール担当
- **Past_Buyer_List**: 過去買主リスト
- **Viewing_Promotion_Not_Needed**: 内覧促進メール不要

## Requirements

### Requirement 1: ステータス算出ロジックの実装

**User Story:** As a システム管理者, I want AppSheetのIFSロジックと同一のステータス算出ロジックを実装する, so that 買主の状態を正確に把握できる

#### Acceptance Criteria

1. THE System SHALL AppSheetのIFSロジックと同一の条件判定順序でステータスを算出する
2. WHEN 複数の条件に一致する場合, THE System SHALL 最初に一致した条件のステータスを採用する
3. WHEN どの条件にも一致しない場合, THE System SHALL 空文字列を返す
4. THE System SHALL 全27個の条件判定を正確に実装する
5. THE System SHALL データベースのカラム名とAppSheetのカラム名のマッピングを正確に行う

### Requirement 2: 日付計算の実装

**User Story:** As a システム管理者, I want 日付ベースの条件判定を正確に行う, so that 「内覧日前日」などのステータスを正しく表示できる

#### Acceptance Criteria

1. WHEN 曜日が木曜日で内覧日が2日後の場合, THE System SHALL 「内覧日前日」ステータスを返す
2. WHEN 曜日が木曜日以外で内覧日が1日後の場合, THE System SHALL 「内覧日前日」ステータスを返す
3. WHEN 内覧日が過去の日付の場合, THE System SHALL 「内覧後未入力」系のステータスを判定する
4. WHEN 次電日が当日以前の場合, THE System SHALL 「⑯当日TEL」ステータスを返す
5. WHEN 受付日が特定の範囲内の場合, THE System SHALL 「内覧促進メール」系のステータスを判定する

### Requirement 3: 担当者別ステータスの実装

**User Story:** As a システム管理者, I want 後続担当者ごとに異なるステータスを表示する, so that 担当者別のタスクを明確にできる

#### Acceptance Criteria

1. WHEN 後続担当がY/W/U/生/K/久/I/Rのいずれかの場合, THE System SHALL 「担当(X)」形式のステータスを返す
2. WHEN 後続担当がY/久/U/R/K/I/生で次電日が空欄の場合, THE System SHALL 「担当(X)次電日空欄」ステータスを返す
3. WHEN 後続担当がY/生/U/久/K/I/Rで内覧後未入力の場合, THE System SHALL 「X_内覧後未入力」ステータスを返す
4. THE System SHALL 担当者イニシャルの大文字小文字を正確に判定する

### Requirement 4: 複合条件の実装

**User Story:** As a システム管理者, I want AND/OR条件を正確に評価する, so that 複雑な条件判定を正しく行える

#### Acceptance Criteria

1. WHEN AND条件の場合, THE System SHALL 全ての条件が真の場合のみ真と判定する
2. WHEN OR条件の場合, THE System SHALL いずれかの条件が真の場合に真と判定する
3. WHEN ISBLANK条件の場合, THE System SHALL NULL、空文字列、undefinedを空と判定する
4. WHEN ISNOTBLANK条件の場合, THE System SHALL 値が存在する場合に真と判定する
5. WHEN CONTAINS条件の場合, THE System SHALL 部分一致で判定する

### Requirement 5: サイドバーUIの実装

**User Story:** As a ユーザー, I want サイドバーにステータスを表示する, so that 買主の状態を一目で把握できる

#### Acceptance Criteria

1. THE System SHALL 既存のサイドバーカテゴリーを完全に置き換える
2. THE System SHALL サイドバーに「カテゴリ」セクションを表示する
3. WHEN ステータスが空文字列でない場合, THE System SHALL ステータスを表示する
4. WHEN ステータスが空文字列の場合, THE System SHALL 「該当なし」と表示する
5. THE System SHALL ステータスごとに異なる色分けを行う
6. THE System SHALL ステータスをクリック可能にし、該当する買主をフィルタリングする
7. THE System SHALL 既存のカテゴリー機能を削除する

### Requirement 6: パフォーマンスの最適化

**User Story:** As a システム管理者, I want ステータス算出を高速に行う, so that ユーザー体験を損なわない

#### Acceptance Criteria

1. THE System SHALL ステータス算出をバックエンドで行う
2. THE System SHALL 算出結果をキャッシュする
3. WHEN 買主データが更新された場合, THE System SHALL キャッシュを無効化する
4. THE System SHALL 1000件の買主データを5秒以内に処理する
5. THE System SHALL ステータス算出のエラーをログに記録する

### Requirement 7: データベーススキーマの対応

**User Story:** As a システム管理者, I want 既存のデータベーススキーマを使用する, so that データ移行なしで機能を実装できる

#### Acceptance Criteria

1. THE System SHALL buyersテーブルの既存カラムを使用する
2. THE System SHALL 新しいカラムを追加しない
3. THE System SHALL AppSheetのカラム名とデータベースのカラム名のマッピングを定義する
4. THE System SHALL マッピング定義を設定ファイルで管理する
5. THE System SHALL マッピングエラーをログに記録する

### Requirement 8: エラーハンドリング

**User Story:** As a システム管理者, I want エラーを適切に処理する, so that システムが安定して動作する

#### Acceptance Criteria

1. WHEN データベース接続エラーが発生した場合, THE System SHALL エラーメッセージを表示する
2. WHEN ステータス算出でエラーが発生した場合, THE System SHALL デフォルトステータスを返す
3. WHEN 必須フィールドが欠損している場合, THE System SHALL エラーをログに記録する
4. THE System SHALL エラー発生時もシステムを継続動作させる
5. THE System SHALL エラー詳細を開発者向けログに記録する

### Requirement 9: テスト容易性

**User Story:** As a 開発者, I want ステータス算出ロジックをテストしやすくする, so that 品質を保証できる

#### Acceptance Criteria

1. THE System SHALL ステータス算出ロジックを独立した関数として実装する
2. THE System SHALL 各条件判定を個別にテスト可能にする
3. THE System SHALL テストデータを簡単に作成できるようにする
4. THE System SHALL モックデータでテストを実行できるようにする
5. THE System SHALL 全ての条件分岐をカバーするテストケースを作成する

### Requirement 10: ドキュメント化

**User Story:** As a 開発者, I want ステータス算出ロジックをドキュメント化する, so that 保守性を高める

#### Acceptance Criteria

1. THE System SHALL 各ステータスの意味をコメントで説明する
2. THE System SHALL 条件判定の優先順位をドキュメント化する
3. THE System SHALL AppSheetのIFSロジックとの対応関係を明記する
4. THE System SHALL データベースカラムとAppSheetカラムのマッピングをドキュメント化する
5. THE System SHALL 変更履歴を記録する
