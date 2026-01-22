# Implementation Plan: 問合時ヒアリングテキストエリアサイズ修正

## Overview

InlineEditableFieldコンポーネントのtextareaタイプの編集時レンダリングを改善し、表示モードと同等のサイズを維持する。

## Tasks

- [x] 1. InlineEditableFieldコンポーネントのtextareaケース修正
  - [x] 1.1 renderInput関数内のtextareaケースを修正
    - 固定の`rows`プロパティを`minRows`と`maxRows`に変更
    - `alwaysShowBorder`プロパティに基づいて最小高さを設定
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. 動作確認
  - [ ] 2.1 買主詳細ページで問合時ヒアリングフィールドの編集動作を確認
    - 編集モード時のサイズが表示モードと同等であることを確認
    - _Requirements: 1.1, 1.2_

## Notes

- 変更はInlineEditableFieldコンポーネントのみ
- 既存の保存処理やバリデーションには影響なし
- alwaysShowBorderプロパティを活用して一貫性を保つ
