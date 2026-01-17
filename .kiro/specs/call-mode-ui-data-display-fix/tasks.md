# Implementation Plan

- [x] 1. カラムマッピング設定の修正


  - `backend/src/config/column-mapping.json`を修正
  - `inquiry_site` → `site`に変更
  - _Requirements: 2.1, 2.2, 8.1_



- [x] 2. ColumnMapperの拡張










  - `PropertyData`インターフェースを追加
  - `extractPropertyData()`メソッドを実装


  - 物件情報をスプレッドシート行から抽出



  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.2_

- [x] 3. MigrationServiceの修正
  - `processBatch()`メソッドを修正
  - 売主情報を`sellers`テーブルに保存
  - 物件情報を`properties`テーブルに保存
  - トランザクション処理を実装（エラー時にロールバック）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - **Note**: Already implemented in MigrationService.ts

- [x] 4. データ検証スクリプトの作成
  - `backend/src/scripts/verify-call-mode-data.ts`を作成
  - 全売主のデータを取得
  - 物件情報、サイト情報、ステータス情報の存在を確認
  - 不足しているデータをレポート
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - **Note**: Modified to check `site` field instead of `inquiry_site`

- [x] 5. データ検証スクリプトの実行
  - データ検証スクリプトを実行
  - 不足しているデータを特定
  - レポートを確認
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - **Result**: Found 1000 sellers missing site info, 724 missing property info

- [x] 6. データ修正スクリプトの作成
  - `backend/src/scripts/fix-call-mode-data.ts`を作成
  - スプレッドシートから全データを読み取り
  - 既存の売主データを更新
  - 不足している物件情報を作成
  - 修正結果をレポート
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_
  - **Note**: Created targeted version for better performance

- [x] 7. データ修正スクリプトの実行
  - データ修正スクリプトを実行
  - 修正結果を確認
  - エラーがあれば対処
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3_
  - **Result**: Fixed column mapping (removed property fields from sellers mapping)
  - **Result**: Updated 1396 sellers with site information
  - **Result**: Fixed 7 sellers with invalid dates (2026-02-29 → 2026-02-28)
  - **Status**: 8732/8752 sellers now have site info (99.8% complete)

- [ ] 8. 通話モードページの表示確認
  - 通話モードページを開く
  - 物件情報が表示されることを確認
  - サイト情報が表示されることを確認
  - ステータス情報が表示されることを確認
  - 訪問予約情報が表示されることを確認
  - 査定情報が表示されることを確認
  - 他のセクションの情報が表示されることを確認
  - _Requirements: 全て_

- [ ] 9. 複数の売主で確認
  - 少なくとも5件の売主で通話モードページを確認
  - 全てのセクションにデータが表示されることを確認
  - データが正しく表示されることを確認
  - _Requirements: 全て_

- [ ] 10. Checkpoint - 全てのテストが通ることを確認
  - Ensure all tests pass, ask the user if questions arise.

