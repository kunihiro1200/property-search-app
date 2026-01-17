# 実装タスクリスト

- [x] 1. フロントエンドの型定義とUIコンポーネントを更新





  - frontend/src/types/index.tsから`motivation`関連の参照を削除し、`confidence`に統一
  - NewSellerPage.tsxの状態変数とUIラベルを`motivation`から`confidence`に変更
  - SellerDetailPage.tsxの状態変数とUIラベルを`motivation`から`confidence`に変更、選択肢を新しい確度レベルに更新
  - CallModePage.tsxのUIラベルを「売却意欲」から「確度」に変更
  - SellersPage.tsxの型定義を`motivation`から`confidence`に変更
  - _要件: 1.2, 1.4, 1.5_

- [x] 2. バックエンドのコードを更新


  - backend/src/types/index.tsから`motivation`関連の参照を削除
  - backend/src/routes/sellers.tsで`motivation`フィールドの参照を`confidence`に変更
  - backend/src/routes/followUps.tsのコメントを「売却意欲を更新」から「確度を更新」に変更
  - backend/src/services/SellerService.tsで`motivation`フィールドの参照を`confidence`に変更
  - backend/src/routes/summarize.tsの変数名とラベルを`motivation`から`confidence`に変更
  - _要件: 1.3_

- [x] 3. データベースインデックスの確認





  - migration 002のインデックスが`confidence`カラムを参照していることを確認
  - 必要に応じてインデックス名を更新
  - _要件: 1.1_

- [x] 4. TypeScriptコンパイルとビルドの確認


  - フロントエンドとバックエンドのTypeScriptコンパイルが成功することを確認
  - ビルドエラーがないことを確認
  - _要件: 1.2, 1.3, 1.4_

- [x] 5. 動作確認



  - 売主作成フローで確度フィールドが正しく保存されることを確認
  - 売主詳細ページで確度フィールドが正しく表示されることを確認
  - 売主更新フローで確度フィールドが正しく更新されることを確認
  - UIラベルが全て「確度」と表示されることを確認
  - _要件: 1.5, 2.1, 2.2_
