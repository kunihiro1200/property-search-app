# Implementation Plan

- [x] 1. バックエンドAPIエンドポイントの実装

  - パフォーマンスメトリクスを計算するAPIエンドポイントを作成
  - 月次フィルタリング機能を実装
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_

- [x] 1.1 PerformanceMetricsServiceの作成


  - `backend/src/services/PerformanceMetricsService.ts`を作成
  - 各メトリクス計算メソッドを実装
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3_


- [ ] 1.2 訪問査定取得数の計算ロジック実装
  - `calculateVisitAppraisalCount`メソッドを実装
  - 訪問日フィールドを参照して月次集計

  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.3 訪問査定取得割合の計算ロジック実装
  - `calculateVisitAppraisalRate`メソッドを実装
  - 確度D・ダブりを除外した依頼件数で割る

  - ゼロ除算のエラーハンドリング
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 1.4 専任件数（専任割合）の計算ロジック実装
  - `calculateExclusiveContracts`メソッドを実装

  - 営担別にグループ化して集計
  - 訪問件数で割って割合を計算
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 1.5 他決割合（未訪問）の計算ロジック実装

  - `calculateCompetitorLossUnvisited`メソッドを実装
  - 営担が空欄の他決ステータスをカウント
  - 確度D・ダブり・訪問件数を除外した依頼件数で割る
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_



- [x] 1.6 他決割合（訪問済み）の計算ロジック実装
  - `calculateCompetitorLossVisited`メソッドを実装
  - 営担別にグループ化して集計
  - 分母は「契約年月 他決は分かった時点」が指定月の件数で計算
  - 訪問日フィールドは使用しない（ユーザー修正により）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [ ] 1.7 APIルートの追加
  - `backend/src/routes/sellers.ts`に`GET /api/sellers/performance-metrics`エンドポイントを追加
  - 月パラメータのバリデーション
  - エラーハンドリング
  - _Requirements: 6.1, 6.2, 6.5_

- [ ]* 1.8 バックエンド単体テストの作成
  - `backend/src/services/__tests__/PerformanceMetricsService.test.ts`を作成
  - 各計算メソッドのテスト
  - エッジケース（ゼロ除算、空データ）のテスト
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ]* 1.9 Property 1のテスト実装
  - **Property 1: Visit appraisal count accuracy**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 1.10 Property 2のテスト実装
  - **Property 2: Visit appraisal rate calculation**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**

- [ ]* 1.11 Property 3のテスト実装
  - **Property 3: Exclusive contract count by representative**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ]* 1.12 Property 4のテスト実装
  - **Property 4: Exclusive contract rate calculation**
  - **Validates: Requirements 3.5, 3.7**

- [ ]* 1.13 Property 5のテスト実装
  - **Property 5: Unvisited competitor loss count**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ]* 1.14 Property 6のテスト実装
  - **Property 6: Unvisited competitor loss rate calculation**
  - **Validates: Requirements 4.4, 4.5, 4.6, 4.7, 4.9**


- [ ]* 1.15 Property 7のテスト実装
  - **Property 7: Visited competitor loss count by representative**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**



- [ ]* 1.16 Property 8のテスト実装
  - **Property 8: Visited competitor loss rate calculation**
  - **Validates: Requirements 5.5, 5.7**


- [ ] 2. フロントエンドコンポーネントの実装
  - 実績セクションを表示するコンポーネントを作成
  - 月選択UIを実装

  - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.1 PerformanceMetricsSectionコンポーネントの作成
  - `frontend/src/components/PerformanceMetricsSection.tsx`を作成
  - 基本的なレイアウトとスタイリング

  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 2.2 月選択UIの実装
  - 月選択ドロップダウンまたは日付ピッカーを追加

  - 現在の月をデフォルト値として設定
  - _Requirements: 6.3_

- [ ] 2.3 APIデータ取得ロジックの実装
  - `useEffect`でAPIからデータを取得

  - ローディング状態の管理
  - エラーハンドリング
  - _Requirements: 6.1, 6.2, 6.4, 6.5_


- [ ] 2.4 訪問査定取得数・割合の表示
  - 訪問査定取得数を表示
  - 訪問査定取得割合をパーセンテージで表示
  - _Requirements: 1.5, 2.5_



- [ ] 2.5 専任件数（専任割合）の表示
  - 営担別の専任件数と割合を表示
  - 合計の専任件数と割合を表示
  - フォーマット: 「山本：３（１５％）　裏：２（７％）角井：５（２０％）計：１０（●●％）」
  - _Requirements: 3.4, 3.6, 3.7_

- [ ] 2.6 他決割合（未訪問）の表示
  - 未訪問の他決件数と割合を表示
  - パーセンテージフォーマット
  - _Requirements: 4.8, 4.9_

- [ ] 2.7 他決割合（訪問済み）の表示
  - 営担別の訪問済み他決件数と割合を表示
  - 合計の訪問済み他決件数と割合を表示
  - フォーマット: 「山本：３（１５％）　裏：２（７％）角井：５（２０％）計：１０（●●％）」
  - _Requirements: 5.6, 5.7, 5.8_


- [ ] 2.8 CallModePageへの統合
  - `frontend/src/pages/CallModePage.tsx`にPerformanceMetricsSectionを追加

  - 適切な位置に配置
  - _Requirements: 7.1_

- [ ]* 2.9 フロントエンドコンポーネントテストの作成
  - `frontend/src/components/__tests__/PerformanceMetricsSection.test.tsx`を作成

  - レンダリングテスト
  - 月選択時の状態更新テスト
  - エラー表示のテスト
  - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5_


- [ ]* 2.10 Property 9のテスト実装
  - **Property 9: Month filter updates all metrics**
  - **Validates: Requirements 6.1, 6.2**

- [x]* 2.11 Property 10のテスト実装

  - **Property 10: Display format consistency**
  - **Validates: Requirements 3.6, 5.6, 7.3, 7.4**

- [x] 3. Checkpoint - すべてのテストが通ることを確認


  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる

- [ ] 4. 統合テストとマニュアルテスト
  - エンドツーエンドの動作確認
  - 異なる月でのデータ表示確認
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 4.1 APIエンドポイントの統合テスト
  - 実際のデータベースを使用したテスト
  - 異なる月でのデータ取得テスト
  - エラーケースのテスト
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 4.2 UI統合テストの実施
  - 通話モードページでの実績セクション表示確認
  - 月選択UIとデータ更新の連携確認
  - ローディング・エラー表示の確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4.3 マニュアルテストの実施
  - 実際のユーザーフローでの動作確認
  - 各メトリクスの計算結果の妥当性確認
  - パフォーマンスの確認
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1_

- [ ] 5. Final Checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、質問があればユーザーに尋ねる
