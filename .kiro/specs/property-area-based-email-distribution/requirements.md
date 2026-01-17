# Requirements Document

## Introduction

This feature simplifies the Gmail distribution functionality by using manual area number input instead of automatic geographic calculation. Users will input area numbers (①-⑯, ㊵, ㊶) directly in the property detail page, and the system will match these with buyers' preferred areas (★エリア) to generate the email distribution list. This approach is simpler, faster, and more reliable than the current coordinate-based distance calculation.

## Glossary

- **System**: The real estate management application
- **Property**: A real estate listing with location and pricing information
- **Buyer**: A potential purchaser registered in the buyer list
- **Area Number**: Geographic area identifiers (①-⑯ for specific areas, ㊵ for all of Oita City, ㊶ for all of Beppu City)
- **Distribution Area Field**: A new field in property details where users manually input area numbers
- **Preferred Area**: Geographic areas specified by buyers in the ★エリア field
- **Distribution Flag**: A field indicating whether a buyer wants to receive email distributions (要/不要)
- **Latest Status**: The most recent status of a buyer (★最新状況)
- **Price Range**: The budget range specified by a buyer for property purchases

## Requirements

### Requirement 1

**User Story:** As a real estate agent, I want the system to automatically suggest area numbers based on the property's location, so that I can quickly identify relevant distribution areas without manual calculation.

#### Acceptance Criteria

1. WHEN viewing a property detail page, THE System SHALL display a "配信エリア" (Distribution Area) input field
2. WHEN a property has a Google Map URL, THE System SHALL automatically calculate which area numbers (①-⑯) are within 3KM radius
3. WHEN the property is in Oita City, THE System SHALL automatically include ㊵ in the suggested areas
4. WHEN the property is in Beppu City, THE System SHALL automatically include ㊶ in the suggested areas
5. WHEN the automatic calculation completes, THE System SHALL populate the distribution area field with the calculated area numbers
6. WHEN a user manually edits the distribution area field, THE System SHALL allow modification and save the user's changes
7. WHEN a user saves the property, THE System SHALL store the distribution area value in the database
8. WHEN a user views a property that has distribution areas set, THE System SHALL display the saved area numbers in the field

### Requirement 2

**User Story:** As a real estate agent, I want the system to match the property's distribution areas with buyers' preferred areas, so that I can quickly identify relevant buyers for email distribution.

#### Acceptance Criteria

1. WHEN a user clicks the Gmail distribution button, THE System SHALL retrieve the property's distribution area field value
2. WHEN the distribution area field is empty, THE System SHALL display a warning message and not proceed with filtering
3. WHEN the distribution area field contains area numbers, THE System SHALL extract individual area numbers from the input
4. WHEN matching buyers, THE System SHALL compare each property area number with each buyer's ★エリア field
5. WHEN a buyer's ★エリア field contains at least one matching area number, THE System SHALL mark that buyer as geographically eligible

### Requirement 3

**User Story:** As a real estate agent, I want the system to filter buyers based on their distribution preferences and current status, so that I only contact buyers who are actively looking and want to receive emails.

#### Acceptance Criteria

1. WHEN evaluating a buyer for email distribution, THE System SHALL check the buyer's distribution flag field
2. WHEN a buyer's distribution flag is set to "要", THE System SHALL mark that buyer as distribution-eligible
3. WHEN a buyer's distribution flag is not set to "要", THE System SHALL exclude that buyer from the distribution list
4. WHEN evaluating a buyer's latest status field, THE System SHALL check for the presence of "買付" or "D"
5. WHEN a buyer's latest status contains "買付" or "D", THE System SHALL exclude that buyer from the distribution list
6. WHEN a buyer's latest status does not contain "買付" or "D", THE System SHALL mark that buyer as status-eligible

### Requirement 4

**User Story:** As a real estate agent, I want the system to match buyers based on their price range preferences, so that I only send property information to buyers who can afford it.

#### Acceptance Criteria

1. WHEN evaluating a buyer for price matching, THE System SHALL retrieve the property's price and type
2. WHEN evaluating a buyer for price matching, THE System SHALL retrieve the buyer's price range for the matching property type
3. WHEN a buyer's price range is "指定なし" (not specified), THE System SHALL mark that buyer as price-eligible
4. WHEN a buyer's price range field is empty, THE System SHALL mark that buyer as price-eligible
5. WHEN a buyer's price range is specified and the property price falls within that range, THE System SHALL mark that buyer as price-eligible
6. WHEN a buyer's price range is specified and the property price falls outside that range, THE System SHALL exclude that buyer from the distribution list

### Requirement 5

**User Story:** As a real estate agent, I want the system to automatically populate the BCC field with qualifying buyers' email addresses, so that I can efficiently send targeted emails without manual selection.

#### Acceptance Criteria

1. WHEN all filtering criteria are evaluated, THE System SHALL combine area matching, distribution, status, and price eligibility results
2. WHEN a buyer meets all eligibility criteria (area match AND distribution AND status AND price), THE System SHALL include that buyer's email address in the final list
3. WHEN a buyer fails any eligibility criterion, THE System SHALL exclude that buyer from the final list
4. WHEN the final buyer list is determined, THE System SHALL populate the BCC field with all qualifying email addresses
5. WHEN populating the BCC field, THE System SHALL format email addresses according to standard email protocols

### Requirement 6

**User Story:** As a real estate agent, I want to see which buyers were selected and why, so that I can verify the system's filtering logic and make manual adjustments if needed.

#### Acceptance Criteria

1. WHEN the buyer filtering process completes, THE System SHALL display the count of qualifying buyers
2. WHEN displaying qualifying buyers, THE System SHALL show each buyer's name and email address
3. WHEN a user requests details, THE System SHALL display which criteria each buyer met or failed
4. WHEN a user wants to modify the selection, THE System SHALL allow manual addition or removal of email addresses from the BCC field
5. WHEN manual modifications are made, THE System SHALL preserve those changes until the email is sent

## Area Number Reference

The following area numbers are valid:

- ① through ⑯: Specific geographic areas within cities
- ㊵: All of Oita City (大分市全部)
- ㊶: All of Beppu City (別府市全部)

## Comparison with Previous Implementation

This hybrid approach combines the best of both worlds:

**Previous (Complex - Real-time calculation)**:
- Automatic coordinate extraction during email distribution
- Distance calculation between property and area map coordinates
- 2km radius filtering
- Prone to errors and slow performance during email sending

**New (Hybrid - Pre-calculated + Editable)**:
- Automatic calculation when viewing/saving property details
- Pre-calculated area numbers stored in database
- User can manually edit if needed
- Fast email distribution (no calculation needed)
- Reliable and easy to understand

**Key Improvements**:
1. **Performance**: Calculation happens once when viewing property, not every time sending email
2. **Reliability**: User can verify and adjust auto-calculated areas
3. **Flexibility**: Supports both automatic and manual workflows
4. **User Control**: Agent has final say on which areas to include


### Requirement 7

**User Story:** As a real estate agent, I want the system to recalculate distribution areas when I update the property's Google Map URL, so that the area numbers stay accurate as property information changes.

#### Acceptance Criteria

1. WHEN a user updates a property's Google Map URL field, THE System SHALL trigger automatic recalculation of distribution areas
2. WHEN recalculation completes, THE System SHALL update the distribution area field with new calculated values
3. WHEN a user has manually edited the distribution area field, THE System SHALL display a confirmation before overwriting with recalculated values
4. WHEN a user confirms recalculation, THE System SHALL replace the current distribution areas with newly calculated ones
5. WHEN a user cancels recalculation, THE System SHALL preserve the manually edited distribution areas
