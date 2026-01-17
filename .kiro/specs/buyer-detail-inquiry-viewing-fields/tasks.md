# Implementation Plan: 買主詳細ページ - 問合せ・内覧情報フィールド追加

## Overview

買主詳細ページの問合せ・内覧情報セクションに新しいフィールドを追加し、物件詳細カードを常時オープン表示に変更します。フロントエンドのみの変更で実装します。

## Tasks

- [x] 1. データベーススキーマの確認と準備
  - buyersテーブルにlatest_statusカラムが存在するか確認
  - buyersテーブルにviewing_result_follow_upカラムが存在するか確認
  - 必要に応じてマイグレーションSQLを準備
  - _Requirements: 6.3_

- [x] 2. TypeScript型定義の更新
  - [x] 2.1 Buyer interfaceにlatest_statusフィールドを追加
    - frontend/src/types/index.tsを更新
    - _Requirements: 1.1_
  
  - [x] 2.2 Buyer interfaceにviewing_result_follow_upフィールドを追加
    - frontend/src/types/index.tsを更新
    - _Requirements: 2.1_

- [x] 3. PropertyInfoCardコンポーネントの改修
  - [x] 3.1 AccordionをPaperコンポーネントに置き換え
    - frontend/src/components/PropertyInfoCard.tsxを修正
    - Accordionのimportを削除
    - Paperコンポーネントをimport
    - 折りたたみボタンを削除
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 3.2 PropertyInfoCard置き換えのプロパティテスト
    - **Property 3: Accordionの完全削除**
    - **Validates: Requirements 3.1, 3.2**
  
  - [x] 3.3 PropertyInfoCardにbuyerプロップを追加
    - PropertyInfoCardPropsインターフェースを更新
    - buyerプロップを受け取るように変更
    - _Requirements: 5.3_
  
  - [x] 3.4 伝達事項フィールドの表示ロジック実装
    - pre_viewing_notesの表示を追加
    - viewing_notesの表示を追加
    - 価格情報の下に配置
    - 両方nullの場合は非表示
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 3.5 伝達事項配置のプロパティテスト
    - **Property 5: 伝達事項フィールドの配置**
    - **Validates: Requirements 5.3**
  
  - [ ]* 3.6 Null値処理のプロパティテスト
    - **Property 7: Null値の安全な処理**
    - **Validates: Requirements 7.3**

- [x] 4. BuyerDetailPageコンポーネントの改修
  - [x] 4.1 FIELD_SECTIONSから「物件詳細」セクションを削除
    - frontend/src/pages/BuyerDetailPage.tsxを修正
    - FIELD_SECTIONS配列から該当セクションを削除
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 4.2 物件詳細単一表示のプロパティテスト
    - **Property 4: 物件詳細の単一表示**
    - **Validates: Requirements 4.1, 4.2**
  
  - [x] 4.3 問合せ・内覧情報セクションにlatest_statusフィールドを追加
    - FIELD_SECTIONSの問合せ・内覧情報セクションを更新
    - latest_statusフィールドを追加
    - 適切なラベルとスタイリングを設定
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 4.4 最新状況フィールド表示のプロパティテスト
    - **Property 1: 最新状況フィールドの表示**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 4.5 問合せ・内覧情報セクションにviewing_result_follow_upフィールドを追加
    - FIELD_SECTIONSの問合せ・内覧情報セクションを更新
    - viewing_result_follow_upフィールドを追加
    - viewing_dateが存在する場合のみ表示する条件を実装
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 4.6 内覧結果フィールド条件表示のプロパティテスト
    - **Property 2: 内覧結果フィールドの条件付き表示**
    - **Validates: Requirements 2.2, 2.3**
  
  - [x] 4.7 PropertyInfoCardにbuyerプロップを渡す
    - PropertyInfoCardコンポーネント呼び出し時にbuyerを渡す
    - _Requirements: 5.4_

- [x] 5. スタイリングとレスポンシブ対応
  - [x] 5.1 PropertyInfoCardのスタイリング調整
    - 常時オープン表示に適したスタイリング
    - 伝達事項セクションのスタイリング
    - _Requirements: 3.4, 8.1_
  
  - [x] 5.2 レスポンシブデザインの確認と調整
    - 小画面での表示確認
    - レイアウト崩れの修正
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 5.3 レスポンシブレイアウトのプロパティテスト
    - **Property 8: レスポンシブレイアウトの維持**
    - **Validates: Requirements 8.1, 8.2, 8.3**

- [x] 6. データ整合性の確認
  - [ ]* 6.1 データ保持完全性のプロパティテスト
    - **Property 6: データ保持の完全性**
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ]* 6.2 既存機能への影響確認テスト
    - 既存のbuyerデータ表示機能が正常に動作することを確認
    - _Requirements: 7.2_

- [x] 7. 統合テストと手動確認
  - [x] 7.1 買主詳細ページ全体の統合テスト
    - 全フィールドが正しく表示されることを確認
    - 条件付き表示が正しく動作することを確認
    - _Requirements: 6.1, 6.2_
  
  - [x] 7.2 手動UIテスト
    - 実際のブラウザで表示確認
    - 各フィールドの表示・非表示を確認
    - レスポンシブ動作を確認
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 8. Checkpoint - すべてのテストが通過することを確認
  - すべてのテストが通過することを確認し、問題があればユーザーに報告

## Notes

- `*`マークのタスクはオプションで、より速いMVPのためにスキップ可能
- 各タスクは特定の要件を参照してトレーサビリティを確保
- チェックポイントで段階的な検証を実施
- プロパティテストは普遍的な正確性プロパティを検証
- ユニットテストは特定の例とエッジケースを検証
