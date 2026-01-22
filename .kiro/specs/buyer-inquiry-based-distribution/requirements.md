# Requirements Document

## Introduction

買主への物件配信ロジックを拡張し、買主が過去に問い合わせた物件の位置情報を活用した配信を実現する。現在のエリア番号ベースの配信に加えて、買主の実際の興味エリア（問い合わせ履歴）に基づいた配信を可能にする。

## Glossary

- **System**: 不動産売主・買主管理システム
- **Buyer**: 買主（物件購入希望者）
- **Property**: 配信対象物件
- **Inquiry History**: 買主が過去に問い合わせた物件の履歴
- **Distribution Area**: 配信エリア（★エリア番号）
- **Inquiry-Based Radius**: 問い合わせ物件を中心とした半径
- **Area-Based Radius**: エリア番号の中心座標を中心とした半径

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want buyers to receive property notifications based on their inquiry history, so that they receive relevant properties matching their actual interests.

#### Acceptance Criteria

1. WHEN the system calculates distribution targets for a property THEN the system SHALL retrieve all properties that each buyer has previously inquired about
2. WHEN a buyer has inquiry history THEN the system SHALL extract coordinates for all inquired properties
3. WHEN calculating distance for inquiry-based matching THEN the system SHALL use straight-line distance between property coordinates
4. WHEN a property is within 3km of any inquired property THEN the system SHALL include that buyer as a distribution target
5. WHEN a buyer has no inquiry history THEN the system SHALL only use area-based matching for that buyer

### Requirement 2

**User Story:** As a system administrator, I want to maintain the existing area-based distribution logic, so that buyers without inquiry history still receive relevant properties.

#### Acceptance Criteria

1. WHEN calculating distribution targets THEN the system SHALL evaluate both inquiry-based and area-based criteria
2. WHEN a buyer matches either inquiry-based OR area-based criteria THEN the system SHALL include that buyer in distribution
3. WHEN using area-based matching THEN the system SHALL use the center coordinates of the buyer's desired area numbers
4. WHEN calculating area-based distance THEN the system SHALL use 3km radius from area center coordinates
5. WHEN a buyer matches both criteria THEN the system SHALL include that buyer only once in the distribution list

### Requirement 3

**User Story:** As a system administrator, I want the system to handle multiple inquiry properties per buyer, so that all of a buyer's interest areas are considered.

#### Acceptance Criteria

1. WHEN a buyer has multiple inquiry properties THEN the system SHALL check distance from all inquired property locations
2. WHEN any inquired property is within 3km THEN the system SHALL mark the buyer as matching inquiry-based criteria
3. WHEN calculating distances THEN the system SHALL use the minimum distance among all inquired properties
4. WHEN an inquired property has no valid coordinates THEN the system SHALL skip that property and continue with others
5. WHEN all inquired properties lack coordinates THEN the system SHALL fall back to area-based matching only

### Requirement 4

**User Story:** As a system administrator, I want detailed logging of distribution matching, so that I can debug and verify the distribution logic.

#### Acceptance Criteria

1. WHEN evaluating a buyer THEN the system SHALL log whether inquiry-based matching was attempted
2. WHEN inquiry-based matching succeeds THEN the system SHALL log the matching property and distance
3. WHEN area-based matching succeeds THEN the system SHALL log the matching area and distance
4. WHEN a buyer is included in distribution THEN the system SHALL log which criteria matched
5. WHEN a buyer is excluded THEN the system SHALL log why neither criteria matched

### Requirement 5

**User Story:** As a system administrator, I want the distribution calculation to perform efficiently, so that email distribution does not experience delays.

#### Acceptance Criteria

1. WHEN retrieving inquiry history THEN the system SHALL use database joins to minimize queries
2. WHEN calculating distances THEN the system SHALL batch coordinate lookups where possible
3. WHEN a buyer matches inquiry-based criteria THEN the system SHALL skip area-based calculation for efficiency
4. WHEN processing large buyer lists THEN the system SHALL complete distribution calculation within 10 seconds
5. WHEN coordinates are missing THEN the system SHALL handle gracefully without blocking other buyers
