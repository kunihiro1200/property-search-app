# Implementation Plan: Buyer Detail Layout Improvements

## Overview

買主詳細ページのレイアウトを改善し、伝達事項セクションに薄黄色の背景を追加し、重複セクションを削除する。

## Tasks

- [ ] 1. BuyerDetailPageの修正
  - `frontend/src/pages/BuyerDetailPage.tsx`を開く
  - 伝達事項セクションに薄黄色の背景スタイルを追加
  - 重複している内覧前伝達事項セクションを削除
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 2. 動作確認
  - ブラウザで買主詳細ページを開く
  - 伝達事項セクションの背景色が薄黄色であることを確認
  - 内覧前伝達事項セクションが1つだけ表示されることを確認
  - テキストの可読性を確認
  - _Requirements: 1.3, 2.3_

## Notes

- シンプルなUI改善のため、バックエンドの変更は不要
- 既存のデータや機能に影響を与えない
