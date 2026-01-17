# Requirements Document

## Introduction

買主詳細ページにおける問合せ・内覧情報セクションの機能拡張と、物件詳細カードの表示改善を行います。最新状況と内覧結果・後続対応フィールドを追加し、物件詳細カードを常時オープン表示に変更します。

## Glossary

- **BuyerDetailPage**: 買主詳細ページコンポーネント
- **PropertyInfoCard**: 物件情報カードコンポーネント
- **FIELD_SECTIONS**: フィールドセクション定義配列
- **Accordion**: 折りたたみ可能なUIコンポーネント
- **Paper**: Material-UIの基本カードコンポーネント

## Requirements

### Requirement 1: 最新状況フィールドの追加

**User Story:** As a 営業担当者, I want to see the latest status in the inquiry section, so that I can quickly understand the current state of the buyer inquiry.

#### Acceptance Criteria

1. THE BuyerDetailPage SHALL display a latest_status field in the inquiry and viewing information section
2. WHEN the inquiry section is rendered, THE System SHALL show the latest_status field with appropriate styling
3. THE latest_status field SHALL be positioned logically within the inquiry information layout

### Requirement 2: 内覧結果・後続対応フィールドの追加

**User Story:** As a 営業担当者, I want to see viewing results and follow-up actions, so that I can track the progress of property viewings.

#### Acceptance Criteria

1. THE BuyerDetailPage SHALL display a viewing_result_follow_up field in the inquiry and viewing information section
2. WHEN a viewing date exists, THE System SHALL display the viewing_result_follow_up field
3. WHEN no viewing date exists, THE System SHALL hide the viewing_result_follow_up field
4. THE viewing_result_follow_up field SHALL be clearly labeled and formatted

### Requirement 3: 物件詳細カードの常時オープン表示

**User Story:** As a 営業担当者, I want the property details card to be always open, so that I can immediately see important property information without clicking.

#### Acceptance Criteria

1. THE PropertyInfoCard SHALL replace Accordion component with Paper component
2. THE PropertyInfoCard SHALL remove all collapse/expand toggle buttons
3. THE PropertyInfoCard SHALL display all property details in an always-visible state
4. THE PropertyInfoCard SHALL maintain the same visual styling as before when expanded

### Requirement 4: 重複物件詳細セクションの削除

**User Story:** As a 営業担当者, I want to avoid seeing duplicate property information, so that the interface is cleaner and less confusing.

#### Acceptance Criteria

1. THE BuyerDetailPage SHALL remove the duplicate "物件詳細" section from FIELD_SECTIONS
2. WHEN the page renders, THE System SHALL display property details only in the PropertyInfoCard component
3. THE removal SHALL not affect other field sections in FIELD_SECTIONS

### Requirement 5: 伝達事項フィールドの移動

**User Story:** As a 営業担当者, I want to see communication notes near property information, so that I can understand context when reviewing property details.

#### Acceptance Criteria

1. THE PropertyInfoCard SHALL display pre_viewing_notes field
2. THE PropertyInfoCard SHALL display viewing_notes field
3. THE pre_viewing_notes and viewing_notes fields SHALL be positioned below the price information section
4. THE moved fields SHALL maintain their original data binding and functionality

### Requirement 6: フロントエンドのみの変更

**User Story:** As a developer, I want to implement this feature with frontend changes only, so that deployment is simpler and faster.

#### Acceptance Criteria

1. THE implementation SHALL modify only BuyerDetailPage and PropertyInfoCard components
2. THE implementation SHALL NOT require backend API changes
3. WHEN existing database fields are used, THE System SHALL work without database migrations
4. THE implementation SHALL include database migration SQL only if new fields are required

### Requirement 7: データ整合性の維持

**User Story:** As a system administrator, I want data integrity to be maintained, so that existing functionality continues to work correctly.

#### Acceptance Criteria

1. WHEN fields are moved or added, THE System SHALL preserve all existing data
2. THE System SHALL maintain backward compatibility with existing data structures
3. WHEN rendering fields, THE System SHALL handle null or undefined values gracefully

### Requirement 8: レスポンシブデザインの維持

**User Story:** As a user, I want the interface to work well on different screen sizes, so that I can use the system on various devices.

#### Acceptance Criteria

1. THE modified components SHALL maintain responsive design principles
2. WHEN the screen size changes, THE layout SHALL adapt appropriately
3. THE always-open property card SHALL not cause layout issues on smaller screens
