# Requirements Document

## Introduction

本機能は、「業務依頼」スプレッドシート（案件管理）のデータをSupabaseに取り込み、売主管理システムと連携させるものです。業務依頼スプレッドシートは、媒介契約後の業務タスク（媒介契約書作成、サイト登録、売買契約書、決済書類など）を管理しており、GASによってマイドライブの「業務依頼」フォルダからデータが自動反映されます。

## Glossary

- **Work_Task_System**: 業務依頼データを管理するシステム
- **property_number**: 物件番号（売主番号と同一、sellersテーブルとのリンクキー）
- **mediation_contract**: 媒介契約関連の業務タスク
- **site_registration**: サイト登録関連の業務タスク
- **sales_contract**: 売買契約関連の業務タスク
- **settlement**: 決済関連の業務タスク

## Requirements

### Requirement 1

**User Story:** As a 業務担当者, I want to 業務依頼スプレッドシートのデータをSupabaseに同期する, so that 売主管理システムから業務進捗を確認できる

#### Acceptance Criteria

1. WHEN システムが業務依頼スプレッドシートに接続する THEN Work_Task_System SHALL スプレッドシートID「1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g」のシート「業務依頼」からデータを取得する
2. WHEN データを取得する THEN Work_Task_System SHALL 128カラムすべてをwork_tasksテーブルにマッピングする
3. WHEN 物件番号が存在する行を処理する THEN Work_Task_System SHALL 物件番号をproperty_numberカラムに格納し、sellersテーブルのseller_numberと関連付ける
4. WHEN 同期を実行する THEN Work_Task_System SHALL 既存レコードは更新し、新規レコードは挿入する（upsert処理）

### Requirement 2

**User Story:** As a システム管理者, I want to 業務依頼データのカラムマッピングを設定する, so that スプレッドシートとデータベース間のデータ変換が正確に行われる

#### Acceptance Criteria

1. WHEN カラムマッピングを設定する THEN Work_Task_System SHALL 日本語カラム名をスネークケースの英語カラム名に変換する
2. WHEN 日付型カラムを処理する THEN Work_Task_System SHALL 「締め日」「完了日」「予定日」「依頼日」を含むカラムをdate型として変換する
3. WHEN 数値型カラムを処理する THEN Work_Task_System SHALL 「仲介手数料」「売買価格」「口コミカウント」を含むカラムをnumber型として変換する
4. WHEN 空文字またはnull値を処理する THEN Work_Task_System SHALL データベースにnullとして格納する

### Requirement 3

**User Story:** As a 業務担当者, I want to 売主詳細画面から業務依頼情報を確認する, so that 媒介契約後の業務進捗を一元管理できる

#### Acceptance Criteria

1. WHEN 売主詳細画面を表示する THEN Work_Task_System SHALL 該当売主の業務依頼データを取得して表示する
2. WHEN 業務依頼データが存在しない THEN Work_Task_System SHALL 「業務依頼データなし」と表示する
3. WHEN 業務依頼データを表示する THEN Work_Task_System SHALL カテゴリ別（媒介契約、サイト登録、売買契約、決済）にグループ化して表示する

### Requirement 4

**User Story:** As a システム管理者, I want to 業務依頼データの同期状態を監視する, so that データの整合性を確保できる

#### Acceptance Criteria

1. WHEN 同期を実行する THEN Work_Task_System SHALL 同期開始時刻、終了時刻、処理件数をログに記録する
2. WHEN 同期エラーが発生する THEN Work_Task_System SHALL エラー内容と該当行番号をログに記録する
3. WHEN 同期が完了する THEN Work_Task_System SHALL 成功件数と失敗件数をサマリーとして出力する
