# Requirements Document

## Introduction

買主詳細ページのクイックボタンに、一度押したら半永久的にグレーアウトする機能を追加します。これにより、ユーザーが誤って同じボタンを複数回押すことを防ぎ、より直感的なUIを提供します。状態はローカルストレージに保存され、ブラウザを閉じても保持されます。

## Glossary

- **Quick_Button**: 買主詳細ページの「よく聞く」セクションにある6つのクイックアクションボタン
- **Grayed_Out_State**: ボタンが視覚的に無効化され、クリックできない状態
- **Local_Storage**: ブラウザのローカルストレージ機能。データを永続的に保存する

## Requirements

### Requirement 1: クイックボタンのグレーアウト機能

**User Story:** As a user, I want quick buttons to be grayed out permanently after clicking them once, so that I can avoid accidentally clicking the same button multiple times.

#### Acceptance Criteria

1. WHEN a user clicks any Quick_Button, THE System SHALL change the button to Grayed_Out_State
2. WHEN a Quick_Button is changed to Grayed_Out_State, THE System SHALL save this state to Local_Storage
3. WHILE a Quick_Button is in Grayed_Out_State, THE System SHALL prevent further clicks on that button
4. WHEN a Quick_Button is in Grayed_Out_State, THE System SHALL display visual feedback indicating the button is disabled
5. THE System SHALL apply this behavior to all six Quick_Buttons independently

### Requirement 2: 対象ボタンの範囲

**User Story:** As a user, I want all quick buttons to have consistent behavior, so that the interface is predictable and easy to use.

#### Acceptance Criteria

1. THE System SHALL apply the grayed-out behavior to the following Quick_Buttons:
   - 初見か
   - 希望時期
   - 駐車場希望台数
   - リフォーム込みの予算（最高額）
   - 持ち家か
   - 他に気になる物件はあるか？
2. THE System SHALL maintain consistent visual styling across all Quick_Buttons in both enabled and Grayed_Out_State

### Requirement 3: 永続的な状態管理

**User Story:** As a user, I want button states to persist across sessions, so that I don't accidentally click the same button again even after closing and reopening the browser.

#### Acceptance Criteria

1. WHEN a Quick_Button is changed to Grayed_Out_State, THE System SHALL store the button state in Local_Storage with the buyer ID as the key
2. WHEN a user navigates to a different buyer detail page and returns, THE System SHALL restore the Grayed_Out_State from Local_Storage
3. WHEN a user refreshes the current buyer detail page, THE System SHALL restore the Grayed_Out_State from Local_Storage
4. WHEN a user closes and reopens the browser, THE System SHALL restore the Grayed_Out_State from Local_Storage
5. THE System SHALL maintain separate button states for each buyer using their unique buyer ID

### Requirement 4: 視覚的フィードバック

**User Story:** As a user, I want clear visual feedback on button states, so that I can easily understand which buttons I have already used.

#### Acceptance Criteria

1. WHEN a Quick_Button is in Grayed_Out_State, THE System SHALL reduce the button opacity
2. WHEN a Quick_Button is in Grayed_Out_State, THE System SHALL change the cursor to indicate the button is not clickable
3. WHEN a user hovers over a Grayed_Out_State Quick_Button, THE System SHALL display a tooltip explaining the button has been used
4. THE System SHALL maintain accessibility standards for color contrast in both enabled and Grayed_Out_State
