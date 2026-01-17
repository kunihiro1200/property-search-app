# Requirements Document

## Introduction

買主詳細画面の「問合時ヒアリング」フィールドに、初期状態から囲い枠を表示する機能を実装する。これにより、ユーザーがこのフィールドが入力可能であることを視覚的に認識しやすくなる。参考UIは通話モードの「通話メモ入力」フィールド。

## Glossary

- **Buyer_Detail_Page**: 買主詳細画面。買主の情報を表示・編集するページ
- **Inquiry_Hearing_Field**: 問合時ヒアリングフィールド。買主への問い合わせ時のヒアリング内容を記録するテキストエリア
- **InlineEditableField**: インライン編集可能なフィールドコンポーネント
- **Border_Style**: 囲い枠のスタイル。通話モードの通話メモ入力と同様の視覚的表現

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a visible border around the "問合時ヒアリング" field from the initial state, so that I can easily recognize it as an editable input area.

#### Acceptance Criteria

1. WHEN the Buyer_Detail_Page loads, THE Inquiry_Hearing_Field SHALL display with a visible border from the initial state
2. WHEN the Inquiry_Hearing_Field is empty, THE System SHALL display a placeholder text indicating the field is for input
3. WHEN the user hovers over the Inquiry_Hearing_Field, THE System SHALL provide visual feedback indicating the field is editable
4. THE Inquiry_Hearing_Field border style SHALL be consistent with the call mode memo input field style (通話メモ入力)

### Requirement 2

**User Story:** As a user, I want the bordered field to have adequate height, so that I can see and enter multi-line content comfortably.

#### Acceptance Criteria

1. THE Inquiry_Hearing_Field SHALL have a minimum height of 120px to accommodate multi-line content
2. WHEN content exceeds the visible area, THE System SHALL allow scrolling within the field
3. THE Inquiry_Hearing_Field SHALL maintain its bordered appearance regardless of content length
