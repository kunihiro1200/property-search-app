# Implementation Plan

- [x] 1. 問合せ元選択肢の定数ファイルを作成


  - `frontend/src/utils/buyerInquirySourceOptions.ts`を作成
  - InquirySourceOption型を定義
  - 38個の選択肢をカテゴリ別に定義
  - ヘルパー関数を実装
  - _Requirements: 4.1, 4.2, 4.3_



- [x] 2. BuyerDetailPageにAutocompleteコンポーネントを統合


  - Material-UIのAutocompleteをインポート
  - inquiry_sourceフィールドの編集モード時の表示をAutocompleteに変更
  - カテゴリ別グループ化のrenderGroup実装

  - 選択値の変更ハンドラーを実装
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 3.1, 3.2_



- [ ] 3. 表示モードとプレースホルダーの実装
  - 表示モード時のテキスト表示を確認



  - 空値の場合のプレースホルダー表示を実装
  - _Requirements: 1.4, 1.5_

- [ ] 4. 動作確認とテスト
  - ドロップダウンで全38選択肢が表示されることを確認
  - カテゴリ別グループ化が正しく動作することを確認
  - 検索機能が日本語で動作することを確認
  - 選択→保存→表示のフローを確認
  - 既存データの表示を確認
  - _Requirements: 1.2, 2.3, 3.3_
