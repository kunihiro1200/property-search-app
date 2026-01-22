# Implementation Plan: 買主詳細画面 問合時ヒアリング クイック入力ボタン

## Overview

買主詳細画面の「問合時ヒアリング」フィールドに、売主詳細画面の「通話メモ入力」と同様のクイック入力ボタン機能を追加する。

## Tasks

- [x] 1. クイック入力ボタンの実装
  - [x] 1.1 BuyerDetailPageにクイック入力ボタンの定義を追加
    - INQUIRY_HEARING_QUICK_INPUTS定数を定義
    - 6つのボタン（初見か、希望時期、駐車場希望台数、リフォーム予算、持ち家か、他物件）
    - _Requirements: 1.2_
  - [x] 1.2 クイック入力ボタンのクリックハンドラーを実装
    - handleInquiryHearingQuickInput関数を追加
    - 既存値がある場合は改行を挟んで追加
    - handleInlineFieldSaveを呼び出してDBに保存
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 1.3 クイック入力ボタンセクションのUIを実装
    - 「問合時ヒアリング」フィールドの上にセクションを追加
    - Typography（ラベル: ヒアリング項目）とChipコンポーネントを配置
    - flex-wrapレイアウトを適用
    - Tooltipでフルテキストを表示
    - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3_

- [x] 2. バグ修正 - クイック入力後のフィールド表示更新
  - [x] 2.1 useInlineEditフックにinitialValue同期処理を追加
    - 編集モードでない時にinitialValueが変更されたらeditValueを同期
    - これによりクイック入力ボタンクリック後にフィールドが即座に更新される
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 handleInquiryHearingQuickInputの改善（追加修正）
    - 先にローカル状態（buyer）を更新して即座にUIに反映
    - inquiryHearingKeyを使用してInlineEditableFieldを強制再レンダリング
    - エラー時は元の値に戻す処理を追加
    - CallModePageと同様の即時反映動作を実現
    - _Requirements: 2.1, 2.2_

- [x] 3. Checkpoint - 動作確認
  - ブラウザで買主詳細画面を開き、クイック入力ボタンが表示されることを確認
  - ボタンをクリックしてテキストが追加されることを確認
  - 既存テキストがある場合に改行が正しく挿入されることを確認

- [x] 4. クイック入力ボタンの先頭追加対応
  - [x] 4.1 handleInquiryHearingQuickInput関数を修正
    - 既存値がある場合は、新しいテキストを先頭に追加し、改行を挟んで既存内容を続ける
    - 既存値がない場合は、新しいテキストのみを追加
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Checkpoint - 先頭追加動作確認
  - ブラウザで買主詳細画面を開き、クイック入力ボタンをクリック
  - 新しいテキストが既存内容の先頭に追加されることを確認
  - 複数回クリックした場合、最新のクリックが一番上に表示されることを確認

## Notes

- 既存のInlineEditableFieldコンポーネントとhandleInlineFieldSave関数を活用
- 売主詳細画面（CallModePage）の通話メモ入力セクションと同様のUI/UXを実現
- Chipコンポーネントはsize="small"とclickableプロパティを使用
- **修正内容**: 
  1. useInlineEditフックでinitialValueの変更を監視し、編集モードでない時に自動的にeditValueを同期
  2. handleInquiryHearingQuickInputで先にローカル状態を更新し、keyを変更してコンポーネントを強制再レンダリング
