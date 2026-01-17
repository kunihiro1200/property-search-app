# Implementation Plan

- [x] 1. データベーススキーマの更新


  - `sellers`テーブルに`exclusion_action`カラムを追加（VARCHAR(255), NULL許可）
  - マイグレーションスクリプトを作成
  - マイグレーションを実行して検証
  - _Requirements: 4.1_





- [x] 2. バックエンドAPIの更新


  - [ ] 2.1 Seller型定義に`exclusionAction`フィールドを追加
    - `backend/src/types/index.ts`を更新
    - _Requirements: 4.1_


  




  - [ ] 2.2 PUT /sellers/:id エンドポイントを更新
    - `exclusionAction`パラメータを受け取るように更新


    - データベースに保存する処理を追加
    - _Requirements: 4.1_
  
  - [x] 2.3 GET /sellers/:id エンドポイントを更新

    - レスポンスに`exclusionAction`を含める
    - _Requirements: 4.2_

- [ ] 3. フロントエンドの実装
  - [x] 3.1 Seller型定義に`exclusionAction`フィールドを追加


    - `frontend/src/types/index.ts`を更新
    - _Requirements: 4.1_
  


  - [ ] 3.2 CallModePageに除外アクションフィールドを追加
    - `exclusionAction` stateを追加
    - 除外アクションフィールドのUIコンポーネントを実装

    - 除外日フィールドの直下に配置
    - _Requirements: 1.1, 1.2_
  
  - [x] 3.3 除外アクション選択時の処理を実装



    - `handleExclusionActionChange`関数を実装
    - 除外日が設定されている場合、次電日を自動更新
    - 除外日が空の場合、次電日を更新しない
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 3.4 通話メモ入力欄の右隣に赤字表示を追加
    - 除外アクション選択時に赤字で表示
    - 除外アクション未選択時は非表示
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 3.5 ステータス更新処理に除外アクションを追加
    - `handleUpdateStatus`関数を更新
    - 除外アクションをAPIに送信
    - _Requirements: 4.1_
  
  - [ ] 3.6 データ読み込み時の処理を更新
    - `loadAllData`関数を更新
    - 除外アクションを復元
    - 赤字表示を復元
    - _Requirements: 4.2, 4.3_

- [ ] 4. 動作確認とテスト
  - 除外アクションフィールドが除外日フィールドの直下に表示されることを確認
  - 除外アクション選択時に次電日が自動更新されることを確認
  - 除外日が空の場合、次電日が更新されないことを確認
  - 赤字表示が正しく表示されることを確認
  - ステータス更新時に除外アクションが保存されることを確認
  - ページリロード時に除外アクションが復元されることを確認
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_
