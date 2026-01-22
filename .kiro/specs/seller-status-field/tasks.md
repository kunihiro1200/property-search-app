# Implementation Plan

- [ ] 1. データベーススキーマの更新
  - `properties`テーブルに`seller_status`カラムを追加するマイグレーションファイルを作成
  - マイグレーションを実行してデータベーススキーマを更新
  - ロールバックスクリプトも作成
  - _Requirements: 2.1, 2.2_

- [ ] 2. バックエンド型定義の更新
  - `backend/src/types/index.ts`の`PropertyInfo`インターフェースに`sellerStatus`フィールドを追加
  - 売主状況の選択肢を定義する定数`SELLER_STATUS_OPTIONS`を追加
  - `SellerStatusOption`型を定義
  - _Requirements: 4.3, 4.4_

- [ ] 3. バックエンドバリデーションの実装
  - `backend/src/services/SellerService.ts`に売主状況のバリデーション関数を追加
  - 有効な売主状況の値のみを受け入れるようにする
  - 無効な値の場合はエラーを返す
  - _Requirements: 4.1, 4.2_

- [ ]* 3.1 バックエンドバリデーションのプロパティテストを作成
  - **Property 1: Valid status values only**
  - **Validates: Requirements 4.1**

- [ ] 4. バックエンドAPIの更新
  - `GET /sellers/:id`エンドポイントのレスポンスに`property.sellerStatus`を含める
  - `PUT /properties/:id`エンドポイントで`sellerStatus`を受け取り、データベースを更新
  - _Requirements: 2.1, 2.3, 2.4_

- [ ]* 4.1 APIのプロパティテストを作成
  - **Property 2: Status persistence**
  - **Validates: Requirements 2.1, 2.3**

- [ ]* 4.2 APIのプロパティテストを作成
  - **Property 3: Status display consistency**
  - **Validates: Requirements 2.4**

- [ ] 5. フロントエンド型定義の更新
  - `frontend/src/types/index.ts`の`PropertyInfo`インターフェースに`sellerStatus`フィールドを追加
  - 売主状況の選択肢を定義する定数`SELLER_STATUS_OPTIONS`を追加
  - _Requirements: 4.3, 4.4_

- [ ] 6. 売主詳細ページのUI更新
  - `frontend/src/pages/SellerDetailPage.tsx`の物件情報セクションに売主状況のドロップダウンを追加
  - 編集モードで売主状況を選択できるようにする
  - 保存時に売主状況をAPIに送信
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4_

- [ ]* 6.1 売主詳細ページのプロパティテストを作成
  - **Property 4: Empty status handling**
  - **Validates: Requirements 1.5, 3.4**

- [ ] 7. 新規売主登録ページのUI更新
  - `frontend/src/pages/NewSellerPage.tsx`の物件情報セクションに売主状況のドロップダウンを追加
  - 新規登録時に売主状況を設定できるようにする
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 8. 売主リストページのUI更新（オプション）
  - `frontend/src/pages/SellersPage.tsx`のテーブルに売主状況のカラムを追加
  - 売主リストで売主状況を表示
  - _Requirements: 3.1_

- [ ] 9. チェックポイント - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、問題があればユーザーに質問する
