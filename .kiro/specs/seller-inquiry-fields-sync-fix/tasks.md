# Implementation Plan: 売主反響フィールド同期修正

## Overview

売主リストの反響年、反響日付、サイトフィールドの同期を修正し、フロントエンドで正しく表示されるようにします。

## Tasks

- [x] 1. バックエンド: column-mapping.jsonの更新
  - [x] 1.1 反響年のマッピングを追加
    - `spreadsheetToDatabase`に`"反響年": "inquiry_year"`を追加
    - `databaseToSpreadsheet`に`"inquiry_year": "反響年"`を追加
    - _Requirements: 1.1_

  - [x] 1.2 サイトのマッピングを修正
    - `spreadsheetToDatabase`の`"サイト": "site"`を`"サイト": "inquiry_site"`に変更
    - `databaseToSpreadsheet`の`"site": "サイト"`を`"inquiry_site": "サイト"`に変更
    - _Requirements: 1.2_

- [x] 2. バックエンド: SellerServiceの更新
  - [x] 2.1 decryptSellerメソッドでinquiry_siteを正しくマッピング
    - `site: seller.site`を`inquirySite: seller.inquiry_site`に変更
    - 後方互換性のため`site: seller.inquiry_site`も追加
    - _Requirements: 4.1, 4.2_

- [x] 3. フロントエンド: SellersPageの更新
  - [x] 3.1 反響年カラムを追加
    - テーブルに反響年カラムを追加
    - `seller.inquiryYear`を表示
    - 空の場合は'-'を表示
    - _Requirements: 2.1_

  - [x] 3.2 サイトカラムを追加または更新
    - テーブルにサイトカラムを追加（存在しない場合）
    - `seller.inquirySite || seller.site`を表示
    - 空の場合は'-'を表示
    - _Requirements: 2.2_

- [x] 4. フロントエンド: SellerDetailPageの更新
  - [x] 4.1 反響情報セクションに反響年を追加
    - 反響年フィールドを表示
    - `seller.inquiryYear`を表示
    - 空の場合は'-'を表示
    - _Requirements: 2.3_

  - [x] 4.2 反響情報セクションにサイトを追加または更新
    - サイトフィールドを表示（存在しない場合は追加）
    - `seller.inquirySite || seller.site`を表示
    - 空の場合は'-'を表示
    - _Requirements: 2.4_

- [ ] 5. データベース: マイグレーションの実行
  - [ ] 5.1 マイグレーション007と009を実行
    - Supabase Dashboardにアクセス
    - SQL Editorで`007_phase1_seller_enhancements.sql`を実行
    - SQL Editorで`009_full_seller_fields_expansion.sql`を実行
    - `npx ts-node verify-inquiry-fields-added.ts`で確認
    - _Requirements: 1.1, 1.2_
    - **⚠️ 重要**: このタスクを完了しないと、inquiry_yearとinquiry_siteカラムがデータベースに存在しないため、データの保存・取得ができません

- [ ] 6. Checkpoint - 動作確認
  - スプレッドシートで反響年とサイトを変更
  - 同期を実行（自動同期を待つか手動で実行）
  - データベースの値を確認
  - フロントエンドの一覧・詳細画面で表示を確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 7. テスト: ColumnMapperのユニットテスト
  - [ ]* 7.1 反響年マッピングのテスト
    - 「反響年」カラムがinquiry_yearにマッピングされることを確認
    - 空の値がnullになることを確認
    - _Requirements: 1.1_

  - [ ]* 7.2 サイトマッピングのテスト
    - 「サイト」カラムがinquiry_siteにマッピングされることを確認
    - 空の値がnullになることを確認
    - _Requirements: 1.2_

- [ ]* 8. テスト: SellerServiceのユニットテスト
  - [ ]* 8.1 decryptSellerのテスト
    - inquiry_yearが正しく変換されることを確認
    - inquiry_siteが正しく変換されることを確認
    - 後方互換性のためsiteも設定されることを確認
    - _Requirements: 4.1, 4.2_

- [ ]* 9. テスト: プロパティベーステスト
  - [ ]* 9.1 Property 1: 反響年マッピング
    - **Property 1: 反響年マッピング**
    - **Validates: Requirements 1.1**

  - [ ]* 9.2 Property 2: サイトマッピング
    - **Property 2: サイトマッピング**
    - **Validates: Requirements 1.2**

  - [ ]* 9.3 Property 3: 反響年同期
    - **Property 3: 反響年同期**
    - **Validates: Requirements 3.1**

  - [ ]* 9.4 Property 4: サイト同期
    - **Property 4: サイト同期**
    - **Validates: Requirements 3.2**

- [ ]* 10. テスト: 統合テスト
  - [ ]* 10.1 End-to-End同期テスト
    - スプレッドシートのデータを変更
    - 同期を実行
    - データベースの値を確認
    - APIレスポンスを確認
    - フロントエンドの表示を確認
    - _Requirements: 3.1, 3.2, 3.3_

## Notes

- タスク1と2はバックエンドの修正で、データベーススキーマの変更は不要
- タスク3と4はフロントエンドの表示追加
- `*`マークのタスクはオプション（テスト関連）
- 既存のデータは次回の自動同期時に自動的に更新される
- 後方互換性を維持するため、`site`フィールドも残す
