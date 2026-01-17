# Implementation Plan

- [x] 1. 新規コンポーネントの作成


  - ProgressBar、ComparisonIndicator、RepresentativeTable、MetricCard コンポーネントを作成
  - 各コンポーネントに適切な TypeScript 型定義を追加
  - Tailwind CSS でスタイリング
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_


- [ ] 2. ProgressBar コンポーネントの実装
  - 達成度に応じた幅の計算ロジック
  - カラーコーディング（緑/黄/赤）の実装
  - アクセシビリティ属性の追加

  - _Requirements: 1.2, 1.3_

- [ ] 3. ComparisonIndicator コンポーネントの実装
  - 現在値と平均値の比較ロジック
  - 矢印アイコンの表示（react-icons を使用）

  - 差分に応じた色分け
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. RepresentativeTable コンポーネントの実装
  - テーブルレイアウトの作成
  - データのソート機能（割合の降順）
  - 合計行の強調表示

  - 空データ時の「データなし」表示
  - モバイル対応（スクロール可能）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.4_

- [ ] 5. MetricCard コンポーネントの実装
  - カードレイアウトの作成
  - タイトルと数値の大きな表示
  - ProgressBar と ComparisonIndicator の統合
  - 子要素（テーブルなど）のサポート
  - _Requirements: 1.1, 1.4_




- [ ] 6. PerformanceMetricsSection の改修
  - 既存のコンポーネントを新しいカード形式に置き換え
  - レスポンシブグリッドレイアウトの実装
  - 各指標を MetricCard で表示
  - 担当者別データを RepresentativeTable で表示
  - _Requirements: 1.1, 4.1, 4.2, 4.3, 4.5_



- [ ] 7. スタイリングの最終調整
  - カード間のスペーシング調整
  - フォントサイズの最適化
  - カラースキームの統一
  - ホバー効果の追加
  - _Requirements: 1.4, 4.5_

- [ ] 8. Checkpoint - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、問題があればユーザーに質問する
