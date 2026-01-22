# Implementation Plan

- [x] 1. NewBuyerPageの問合せ元フィールドを修正


  - `frontend/src/pages/NewBuyerPage.tsx`を修正
  - `Autocomplete`コンポーネントと`INQUIRY_SOURCE_OPTIONS`をインポート
  - 問合せ元フィールドを`Select`から`Autocomplete`に変更
  - カテゴリ別グループ化を実装
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3_





- [ ] 2. 動作確認とテスト
  - 物件詳細ページから買主新規登録画面を開いて選択肢を確認
  - 買主リストページから買主新規登録画面を開いて選択肢を確認
  - 両方の画面で同じ選択肢が表示されることを確認
  - カテゴリ別グループ化が正しく機能することを確認
  - 選択した値が正しく保存されることを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
