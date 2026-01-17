# Implementation Plan

## 1. バックエンド: カラムマッピングの更新

- [x] 1.1 column-mapping.jsonに反響詳細日時のマッピングを追加
  - `spreadsheetToDatabase` に `"反響詳細日時": "inquiry_detailed_datetime"` を追加
  - `typeConversions` に `"inquiry_detailed_datetime": "datetime"` を追加
  - _Requirements: 2.1, 2.2_

- [x] 1.2 SellerService.supabase.tsのdecryptSellerメソッドを更新
  - `inquiry_detailed_datetime` を `inquiryDetailedDatetime` としてマッピング
  - 既存の `inquiryDatetime` との整合性を確認
  - _Requirements: 3.1_

## 2. フロントエンド: 表示ロジックの実装

- [x] 2.1 SellersPage.tsxに反響日付表示ヘルパー関数を追加
  - `formatInquiryDate` 関数を作成
  - 反響詳細日時がある場合は日時形式（YYYY/MM/DD HH:mm）で表示
  - 反響日付のみの場合は日付形式（YYYY/MM/DD）で表示
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.3_

- [x] 2.2 テーブルの反響日付列を更新
  - 既存の `inquiryDate` 表示を新しいヘルパー関数に置き換え
  - _Requirements: 1.1, 1.2_

## 3. Checkpoint - 動作確認

- [x] 3. Ensure all tests pass, ask the user if questions arise.

- [x]* 3.1 Property test: 反響詳細日時優先表示


  - **Property 1: 反響詳細日時優先表示**
  - **Validates: Requirements 1.1, 3.3**



- [x]* 3.2 Property test: 日時フォーマット一貫性
  - **Property 3: 日時フォーマット一貫性**
  - **Validates: Requirements 1.3**
