# Implementation Plan: Buyer Detail Field Visual Indicators

## Overview

買主詳細画面のUI改善として、内覧結果関連フィールドのグループ化と、編集可能フィールドの視覚的識別機能を実装する。InlineEditableFieldコンポーネントを拡張し、BuyerDetailPageに内覧結果グループを追加する。

## Tasks

- [x] 1. InlineEditableFieldコンポーネントの視覚的インジケーター追加
  - [x] 1.1 編集可能フィールドに常時表示のボーダースタイルを追加
    - `showEditIndicator` propを追加（デフォルト: true）
    - 編集可能フィールドに薄いグレーのボーダーを常時表示
    - ホバー時にボーダー色を強調
    - _Requirements: 2.1, 4.1, 5.1, 5.2_

  - [x] 1.2 プルダウンフィールドにドロップダウンアイコンを常時表示
    - ドロップダウンタイプのフィールドに矢印アイコンを追加
    - アイコンは常時表示（ホバー不要）
    - _Requirements: 2.2, 3.1, 3.2, 3.3_

  - [x] 1.3 読み取り専用フィールドのスタイル調整
    - 読み取り専用フィールドからボーダーを削除
    - フラットな表示を維持
    - _Requirements: 2.3_

  - [ ]* 1.4 InlineEditableFieldの視覚的インジケーターのユニットテスト
    - 編集可能フィールドにボーダーが表示されることを確認
    - ドロップダウンにアイコンが表示されることを確認
    - 読み取り専用フィールドにボーダーがないことを確認
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. 内覧結果関連フィールドのグループ化
  - [x] 2.1 BuyerDetailPageのフィールド定義を更新
    - viewing_result_follow_up, follow_up_assignee, latest_statusを「問合せ・内覧情報」セクションから分離
    - 新しい「内覧結果・後続対応」グループとして定義
    - _Requirements: 1.1, 1.3_

  - [x] 2.2 内覧結果グループのスタイリング実装
    - 薄い青色の背景色を適用
    - 微妙なボーダーで囲む
    - 他のフィールドと視覚的に区別
    - _Requirements: 1.2, 1.4_

  - [x] 2.3 BuyerDetailPageのレイアウト調整
    - 内覧結果グループを適切な位置に配置
    - グループ内のフィールドを整列
    - _Requirements: 1.1, 1.3_

- [ ] 3. Checkpoint - 視覚的確認
  - ブラウザで買主詳細画面を開き、以下を確認:
    - 編集可能フィールドにボーダーが常時表示されている
    - プルダウンフィールドにドロップダウンアイコンが表示されている
    - 内覧結果グループが薄い青色の背景で表示されている
    - 読み取り専用フィールドにボーダーがない
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 4. プロパティベーステスト
  - [ ]* 4.1 編集可能フィールドのボーダー一貫性テスト
    - **Property 1: Editable fields have consistent visible borders**
    - **Validates: Requirements 2.1, 4.1, 5.1, 5.2**

  - [ ]* 4.2 ドロップダウンインジケーターテスト
    - **Property 2: Dropdown fields have visible dropdown indicators**
    - **Validates: Requirements 2.2, 3.1, 3.2**

  - [ ]* 4.3 読み取り専用フィールドテスト
    - **Property 3: Read-only fields do not display editable indicators**
    - **Validates: Requirements 2.3**

- [ ] 5. Final checkpoint - 最終確認
  - すべてのテストが通過することを確認
  - ブラウザで視覚的な確認を実施
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
