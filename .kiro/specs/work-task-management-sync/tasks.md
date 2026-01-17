# Implementation Plan

## 1. データベーススキーマの作成

- [x] 1.1 work_tasksテーブルのマイグレーションファイルを作成
  - 128カラムに対応するテーブル定義
  - property_numberにユニーク制約とインデックス
  - 日付型・数値型カラムの適切な型定義
  - _Requirements: 1.2, 2.2, 2.3_

- [x] 1.2 マイグレーションを実行
  - Supabaseにテーブルを作成
  - インデックスの確認
  - _Requirements: 1.2_

## 2. カラムマッピング設定の作成

- [x] 2.1 work-task-column-mapping.jsonを作成
  - 128カラムのスプレッドシート名→DB名マッピング
  - 型変換設定（date, number, string）
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 Property test: カラムマッピング完全性
  - **Property 1: カラムマッピング完全性**
  - **Validates: Requirements 1.2**

## 3. WorkTaskColumnMapperの実装

- [x] 3.1 WorkTaskColumnMapper.tsを作成
  - mapToDatabase(): スプレッドシート行→DBデータ変換
  - 日付型カラムの自動検出と変換
  - 数値型カラムの自動検出と変換
  - 空値のnull変換
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 Property test: 日付型変換の正確性
  - **Property 3: 日付型変換の正確性**
  - **Validates: Requirements 2.2**

- [x] 3.3 Property test: 数値型変換の正確性
  - **Property 4: 数値型変換の正確性**
  - **Validates: Requirements 2.3**

- [x] 3.4 Property test: 空値のnull変換
  - **Property 5: 空値のnull変換**
  - **Validates: Requirements 2.4**

## 4. WorkTaskSyncServiceの実装

- [x] 4.1 WorkTaskSyncService.tsを作成
  - syncAll(): 全データ同期
  - syncByPropertyNumber(): 単一レコード同期
  - upsert処理の実装
  - _Requirements: 1.1, 1.3, 1.4_

- [x] 4.2 Property test: 物件番号の一意性保持
  - **Property 2: 物件番号の一意性保持**
  - **Validates: Requirements 1.4**

## 5. Checkpoint - 同期機能の動作確認

- [x] 5. Ensure all tests pass, ask the user if questions arise.

## 6. WorkTaskServiceの実装

- [x] 6.1 WorkTaskService.tsを作成
  - getByPropertyNumber(): 物件番号で取得
  - getBySellerId(): 売主IDで取得
  - list(): 一覧取得
  - _Requirements: 3.1, 3.2_

- [x] 6.2 APIエンドポイントの作成
  - GET /api/work-tasks/:propertyNumber
  - GET /api/sellers/:sellerId/work-task
  - _Requirements: 3.1_

## 7. フロントエンド表示の実装

- [x] 7.1 WorkTaskSection.tsxコンポーネントを作成
  - カテゴリ別グループ化表示
  - 業務依頼データなしの表示
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7.2 Property test: カテゴリ分類の正確性
  - **Property 6: カテゴリ分類の正確性**
  - **Validates: Requirements 3.3**

- [x] 7.3 SellerDetailPageに業務依頼セクションを追加
  - WorkTaskSectionの組み込み
  - _Requirements: 3.1_

## 8. 同期スクリプトの作成

- [x] 8.1 sync-work-tasks.tsスクリプトを作成
  - 手動同期実行用スクリプト
  - 同期ログの出力
  - _Requirements: 4.1, 4.2, 4.3_

## 9. Final Checkpoint - 全体動作確認

- [x] 9. Ensure all tests pass, ask the user if questions arise.
