# Requirements Document

## Introduction

通話モードページにおいて、除外アクションフィールドの配置を改善し、ユーザーが除外日設定と除外理由を視覚的に関連付けやすくする。除外アクションを選択した際に、次電日が自動的に除外日に設定され、選択した除外理由が通話メモ入力欄の横に赤字で表示されることで、ユーザーの操作ミスを防ぎ、除外理由の可視性を向上させる。

## Glossary

- **System**: 通話モード管理システム
- **User**: システムを使用する営業担当者
- **Exclusion Date Field**: 除外日を入力・表示するフィールド
- **Exclusion Action Field**: 除外理由を選択するフィールド（「除外日にすること」）
- **Call Memo Input**: 通話メモを入力するテキストエリア
- **Next Call Date**: 次回電話予定日（次電日）

## Requirements

### Requirement 1

**User Story:** As a User, I want the Exclusion Action Field to be positioned directly below the Exclusion Date Field, so that I can easily understand the relationship between exclusion date and exclusion reason.

#### Acceptance Criteria

1. WHEN the User views the call mode page THEN the System SHALL display the Exclusion Action Field immediately below the Exclusion Date Field
2. WHEN the User views the status update section THEN the System SHALL maintain consistent vertical spacing between the Exclusion Date Field and Exclusion Action Field
3. WHEN the page layout is rendered THEN the System SHALL position all other fields below the Exclusion Action Field in their original order

### Requirement 2

**User Story:** As a User, I want the next call date to be automatically set to the exclusion date when I select an exclusion action, so that I can avoid manual data entry errors.

#### Acceptance Criteria

1. WHEN the User selects "除外日に不通であれば除外" from the Exclusion Action Field THEN the System SHALL automatically set the Next Call Date value to match the Exclusion Date Field value
2. WHEN the User selects "除外日に何もせず除外" from the Exclusion Action Field THEN the System SHALL automatically set the Next Call Date value to match the Exclusion Date Field value
3. WHEN the Exclusion Date Field is empty and the User selects an exclusion action THEN the System SHALL not modify the Next Call Date value
4. WHEN the Next Call Date is automatically updated THEN the System SHALL trigger any validation rules associated with the Next Call Date field

### Requirement 3

**User Story:** As a User, I want to see the selected exclusion reason displayed in red text next to the call memo input, so that I am constantly reminded of the exclusion action I have taken.

#### Acceptance Criteria

1. WHEN the User selects "除外日に不通であれば除外" THEN the System SHALL display the text "除外日に不通であれば除外" in red color to the right of the Call Memo Input field
2. WHEN the User selects "除外日に何もせず除外" THEN the System SHALL display the text "除外日に何もせず除外" in red color to the right of the Call Memo Input field
3. WHEN the User deselects or changes the exclusion action THEN the System SHALL update or remove the red text display accordingly
4. WHEN no exclusion action is selected THEN the System SHALL not display any red text next to the Call Memo Input field
5. WHEN the red text is displayed THEN the System SHALL ensure it does not overlap with other UI elements and remains readable

### Requirement 4

**User Story:** As a User, I want the exclusion action selection to persist when I save the status update, so that I can review the exclusion reason in future sessions.

#### Acceptance Criteria

1. WHEN the User saves a status update with an exclusion action selected THEN the System SHALL store the selected exclusion action value in the database
2. WHEN the User reopens a saved status update THEN the System SHALL display the previously selected exclusion action in the Exclusion Action Field
3. WHEN the User reopens a saved status update with an exclusion action THEN the System SHALL display the corresponding red text next to the Call Memo Input field
