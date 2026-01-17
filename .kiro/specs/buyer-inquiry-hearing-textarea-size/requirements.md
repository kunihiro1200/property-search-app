# Requirements Document

## Introduction

買主詳細ページの「問合時ヒアリング」フィールドにおいて、表示モードでは大きな枠で全文が見えるが、編集モードに入ると小さいテキストエリアになってしまう問題を修正する。編集時も表示時と同じサイズを維持し、ユーザーが編集しやすいようにする。

## Glossary

- **InlineEditableField**: インライン編集可能なフィールドコンポーネント
- **Textarea**: 複数行テキスト入力フィールド
- **問合時ヒアリング**: 買主の問い合わせ時に聞き取った情報を記録するフィールド（inquiry_hearing）

## Requirements

### Requirement 1: テキストエリアの編集時サイズ維持

**User Story:** ユーザーとして、問合時ヒアリングフィールドを編集する際に、表示時と同じ大きさのテキストエリアで編集したい。これにより、長いテキストを編集する際に内容を確認しやすくなる。

#### Acceptance Criteria

1. WHEN ユーザーがtextareaタイプのフィールドを編集モードに切り替える THEN THE InlineEditableField SHALL 表示モードと同等のサイズでテキストエリアを表示する
2. WHEN alwaysShowBorderがtrueでtextareaタイプのフィールドが編集モードになる THEN THE InlineEditableField SHALL 最小高さ120px以上のテキストエリアを表示する
3. WHEN テキストエリアの内容が多い場合 THEN THE InlineEditableField SHALL 内容に応じてテキストエリアの高さを自動調整する
4. WHEN ユーザーが編集を完了してフォーカスを外す THEN THE InlineEditableField SHALL 保存処理を実行し表示モードに戻る
