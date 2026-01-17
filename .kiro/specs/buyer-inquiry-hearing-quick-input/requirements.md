# Requirements Document

## Introduction

買主詳細画面の「問合時ヒアリング」フィールドに、売主詳細画面の「通話メモ入力」セクションと同様のクイック入力ボタン機能を追加する。これにより、ユーザーは頻繁に使用するヒアリング項目をワンクリックで入力欄に追加でき、入力効率が向上する。

## Glossary

- **Buyer_Detail_Page**: 買主詳細画面（BuyerDetailPage.tsx）
- **Inquiry_Hearing_Field**: 問合時ヒアリングフィールド（inquiry_hearing）
- **Quick_Input_Button**: クイック入力ボタン（Chipコンポーネント）
- **InlineEditableField**: インライン編集可能フィールドコンポーネント

## Requirements

### Requirement 1: クイック入力ボタンの表示

**User Story:** As a 営業担当者, I want to see quick input buttons above the inquiry hearing field, so that I can quickly add common hearing items.

#### Acceptance Criteria

1. WHEN the Buyer_Detail_Page is displayed, THE System SHALL show Quick_Input_Buttons above the Inquiry_Hearing_Field
2. THE System SHALL display the following Quick_Input_Buttons in order:
   - 「初見か：」
   - 「希望時期：」
   - 「駐車場希望台数：」
   - 「リフォーム込みの予算（最高額）：」
   - 「持ち家か：」
   - 「他に気になる物件はあるか？：」
3. THE Quick_Input_Buttons SHALL be displayed as clickable Chip components
4. THE Quick_Input_Buttons SHALL be displayed in a flex-wrap layout to accommodate different screen sizes

### Requirement 2: クイック入力ボタンのクリック動作

**User Story:** As a 営業担当者, I want to click a quick input button to add the text to the top of the hearing field, so that I can see the most recent input first.

#### Acceptance Criteria

1. WHEN a user clicks a Quick_Input_Button, THE System SHALL prepend the button's text to the beginning of the Inquiry_Hearing_Field
2. IF the Inquiry_Hearing_Field already contains text, THEN THE System SHALL add a newline after the new text before the existing content
3. IF the Inquiry_Hearing_Field is empty, THEN THE System SHALL add the text without a trailing newline
4. WHEN text is prepended, THE System SHALL automatically trigger the inline edit mode for the field

### Requirement 3: 視覚的な一貫性

**User Story:** As a ユーザー, I want the quick input buttons to look consistent with the seller detail page, so that the UI feels familiar.

#### Acceptance Criteria

1. THE Quick_Input_Buttons SHALL use the same Chip component styling as the seller detail page's call memo section
2. THE Quick_Input_Buttons SHALL have a small size and be clickable
3. THE Quick_Input_Buttons section SHALL have a subtitle label「ヒアリング項目」above the buttons
