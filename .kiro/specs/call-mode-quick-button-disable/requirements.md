# Requirements Document

## Introduction

通話モードページのクイックボタンに無効化機能を追加します。買主詳細ページと同様に、クイックボタンをクリックして保存ボタンを押すと、そのボタンが半永久的にグレーアウトされ、再度クリックできなくなります。この機能により、ユーザーは既に実行したアクションを視覚的に確認でき、重複実行を防ぐことができます。

## Glossary

- **Call_Mode_Page**: 売主の通話モードページ。売主情報の確認と更新を行うページ
- **Quick_Button**: 通話モードページ内の各種クイックアクションボタン（例：SMS送信、メール送信など）
- **Save_Button**: 通話モードページの保存ボタン。変更を確定するために使用
- **LocalStorage**: ブラウザのローカルストレージ。ボタンの無効化状態を永続化するために使用
- **Seller_ID**: 売主の一意識別子

## Requirements

### Requirement 1: クイックボタンの無効化トリガー

**User Story:** As a user, I want quick buttons to be permanently disabled after clicking them and saving, so that I can visually track which actions I have already completed and avoid duplicate actions.

#### Acceptance Criteria

1. WHEN a user clicks a quick button on the call mode page, THE System SHALL mark the button as pending disable
2. WHEN a user clicks the save button after clicking a quick button, THE System SHALL permanently disable the quick button
3. WHEN a quick button is disabled, THE System SHALL apply visual styling to indicate the disabled state
4. WHEN a user navigates away without saving, THE System SHALL not persist the disabled state
5. THE System SHALL store the disabled state in localStorage keyed by seller ID and button identifier

### Requirement 2: 視覚的フィードバック

**User Story:** As a user, I want clear visual feedback when a button is disabled, so that I can easily identify which actions have been completed.

#### Acceptance Criteria

1. WHEN a quick button is disabled, THE System SHALL reduce the button opacity to 0.5
2. WHEN a quick button is disabled, THE System SHALL change the cursor to not-allowed
3. WHEN a quick button is disabled, THE System SHALL display a tooltip indicating the button has been used
4. WHEN a quick button is disabled, THE System SHALL prevent click events from triggering the button action
5. THE System SHALL maintain consistent visual styling across all disabled quick buttons

### Requirement 3: 状態の永続化

**User Story:** As a user, I want the disabled state of buttons to persist across browser sessions, so that I don't lose track of completed actions.

#### Acceptance Criteria

1. WHEN a quick button is disabled and saved, THE System SHALL store the state in localStorage
2. WHEN a user returns to the call mode page, THE System SHALL restore disabled button states from localStorage
3. WHEN localStorage is unavailable, THE System SHALL fall back to in-memory storage
4. THE System SHALL use a composite key of seller ID and button identifier for storage
5. THE System SHALL handle localStorage quota exceeded errors gracefully

### Requirement 4: 売主ごとの独立した状態管理

**User Story:** As a user, I want button states to be tracked independently for each seller, so that actions on one seller don't affect buttons for other sellers.

#### Acceptance Criteria

1. WHEN viewing different sellers, THE System SHALL maintain separate disabled button states for each seller
2. THE System SHALL use the seller ID as part of the storage key
3. WHEN a seller is deleted, THE System SHALL optionally clean up associated button states
4. THE System SHALL handle cases where seller ID is undefined or null
5. THE System SHALL prevent state leakage between different sellers

### Requirement 5: 保存ボタンとの連携

**User Story:** As a user, I want the button disable state to only be saved when I click the save button, so that I can cancel actions if needed.

#### Acceptance Criteria

1. WHEN a user clicks a quick button, THE System SHALL mark the button as pending disable but not persist the state
2. WHEN a user clicks the save button, THE System SHALL persist all pending disable states to localStorage
3. WHEN a user navigates away without saving, THE System SHALL discard pending disable states
4. WHEN a save operation fails, THE System SHALL not persist the disabled states
5. THE System SHALL provide visual feedback to distinguish between pending and persisted disabled states

### Requirement 6: エラーハンドリング

**User Story:** As a developer, I want robust error handling for storage operations, so that the feature degrades gracefully when issues occur.

#### Acceptance Criteria

1. WHEN localStorage write fails, THE System SHALL log the error and continue operation
2. WHEN localStorage read fails, THE System SHALL return an empty state and log the error
3. WHEN localStorage quota is exceeded, THE System SHALL attempt to clean up old entries
4. THE System SHALL provide fallback to in-memory storage when localStorage is unavailable
5. THE System SHALL not crash or block the UI when storage errors occur

### Requirement 7: パフォーマンス最適化

**User Story:** As a user, I want the button disable feature to not impact page performance, so that the call mode page remains responsive.

#### Acceptance Criteria

1. THE System SHALL debounce localStorage write operations
2. THE System SHALL batch multiple button state updates into a single storage operation
3. THE System SHALL load button states asynchronously on page load
4. THE System SHALL not block the main thread during storage operations
5. THE System SHALL limit the size of stored data to prevent performance degradation
