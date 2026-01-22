# Requirements Document

## Introduction

This feature enhances the Gmail distribution functionality on the property detail page by automatically filtering buyers based on geographic proximity and other criteria. When using the "値下げメール配信" (Price Reduction Email Distribution) template, the system will automatically add qualifying buyers' email addresses to the BCC field by comparing the property's Google Map URL with the buyer's preferred area map URLs (★エリア) and checking if they are within 2km radius.

## Glossary

- **System**: The real estate management application
- **Property**: A real estate listing with location and pricing information
- **Buyer**: A potential purchaser registered in the buyer list
- **Preferred Area**: Geographic areas specified by buyers where they want to purchase property
- **Distribution Flag**: A field indicating whether a buyer wants to receive email distributions (要/不要)
- **Latest Status**: The most recent status of a buyer (★最新状況)
- **Price Range**: The budget range specified by a buyer for property purchases
- **Radius Filter**: Geographic filtering based on 2KM distance between property Google Map URL and area map URLs
- **Area Map**: Numbered Google Maps URLs (①-⑯) representing specific geographic areas
- **City-Wide Area**: Special area designations for entire cities (㊵大分市, ㊶別府市)

## Requirements

### Requirement 1

**User Story:** As a real estate agent, I want the system to automatically identify buyers whose preferred areas are within 2KM of a property's location, so that I can efficiently target relevant buyers for price reduction emails.

#### Acceptance Criteria

1. WHEN a user selects the "値下げメール配信" template on a property detail page, THE System SHALL extract coordinates from the property's Google Map URL field
2. WHEN calculating distance, THE System SHALL extract coordinates from each area map URL (①-⑯) defined in the area configuration
3. WHEN the distance between the property's coordinates and an area map's coordinates is within 2KM radius, THE System SHALL mark buyers who have that area number in their preferred area field as geographically eligible
4. WHEN a buyer's preferred area includes ㊵ (大分市全部) and the property is in Oita City, THE System SHALL mark that buyer as geographically eligible
5. WHEN a buyer's preferred area includes ㊶ (別府市全部) and the property is in Beppu City, THE System SHALL mark that buyer as geographically eligible


### Requirement 2

**User Story:** As a real estate agent, I want the system to filter buyers based on their distribution preferences and current status, so that I only contact buyers who are actively looking and want to receive emails.

#### Acceptance Criteria

1. WHEN evaluating a buyer for email distribution, THE System SHALL check the buyer's distribution flag field
2. WHEN a buyer's distribution flag is set to "要", THE System SHALL mark that buyer as distribution-eligible
3. WHEN a buyer's distribution flag is not set to "要", THE System SHALL exclude that buyer from the distribution list
4. WHEN evaluating a buyer's latest status field, THE System SHALL check for the presence of "買付" or "D"
5. WHEN a buyer's latest status contains "買付" or "D", THE System SHALL exclude that buyer from the distribution list
6. WHEN a buyer's latest status does not contain "買付" or "D", THE System SHALL mark that buyer as status-eligible

### Requirement 3

**User Story:** As a real estate agent, I want the system to match buyers based on their price range preferences, so that I only send property information to buyers who can afford it.

#### Acceptance Criteria

1. WHEN evaluating a buyer for price matching, THE System SHALL retrieve the property's price and type
2. WHEN evaluating a buyer for price matching, THE System SHALL retrieve the buyer's price range for the matching property type
3. WHEN a buyer's price range is "指定なし" (not specified), THE System SHALL mark that buyer as price-eligible
4. WHEN a buyer's price range field is empty, THE System SHALL mark that buyer as price-eligible
5. WHEN a buyer's price range is specified and the property price falls within that range, THE System SHALL mark that buyer as price-eligible
6. WHEN a buyer's price range is specified and the property price falls outside that range, THE System SHALL exclude that buyer from the distribution list

### Requirement 3.1: 希望エリアと希望種別の必須化

**User Story:** As a real estate agent, I want the system to exclude buyers who have not specified their preferred area or property type, so that I only contact buyers with clear preferences.

#### Acceptance Criteria

1. WHEN evaluating a buyer for email distribution, THE System SHALL check if the buyer's preferred area field (★エリア) is specified
2. WHEN a buyer's preferred area field is empty or blank, THE System SHALL exclude that buyer from the distribution list
3. WHEN a buyer's preferred area field is null or undefined, THE System SHALL exclude that buyer from the distribution list
4. WHEN evaluating a buyer for email distribution, THE System SHALL check if the buyer's desired property type field is specified
5. WHEN a buyer's desired property type field is empty or blank, THE System SHALL exclude that buyer from the distribution list
6. WHEN a buyer's desired property type field is null or undefined, THE System SHALL exclude that buyer from the distribution list
7. WHEN a buyer has both preferred area and desired property type specified, THE System SHALL proceed with other eligibility checks
8. WHEN a buyer's price range field is empty, blank, null, undefined, or "指定なし" (not specified), THE System SHALL mark that buyer as price-eligible and proceed with other checks


### Requirement 4

**User Story:** As a real estate agent, I want the system to automatically populate the BCC field with qualifying buyers' email addresses, so that I can efficiently send targeted emails without manual selection.

#### Acceptance Criteria

1. WHEN all filtering criteria are evaluated, THE System SHALL combine geographic, distribution, status, price, area, and property type eligibility results
2. WHEN a buyer meets all eligibility criteria (geographic AND distribution AND status AND price AND area AND property type), THE System SHALL include that buyer's email address in the final list
3. WHEN a buyer fails any eligibility criterion, THE System SHALL exclude that buyer from the final list
4. WHEN the final buyer list is determined, THE System SHALL populate the BCC field with all qualifying email addresses
5. WHEN populating the BCC field, THE System SHALL format email addresses according to standard email protocols

### Requirement 5

**User Story:** As a real estate agent, I want to see which buyers were selected and why, so that I can verify the system's filtering logic and make manual adjustments if needed.

#### Acceptance Criteria

1. WHEN the buyer filtering process completes, THE System SHALL display the count of qualifying buyers
2. WHEN displaying qualifying buyers, THE System SHALL show each buyer's name and email address
3. WHEN a user requests details, THE System SHALL display which criteria each buyer met or failed
4. WHEN a user wants to modify the selection, THE System SHALL allow manual addition or removal of email addresses from the BCC field
5. WHEN manual modifications are made, THE System SHALL preserve those changes until the email is sent


### Requirement 6

**User Story:** As a system administrator, I want the area map URLs to be configurable, so that the system can adapt to changes in geographic boundaries or new area definitions.

#### Acceptance Criteria

1. WHEN the system initializes, THE System SHALL load the mapping between area numbers and Google Map URLs
2. WHEN an area map URL needs to be updated, THE System SHALL allow configuration changes without code deployment
3. WHEN a new area is added, THE System SHALL support adding new area number and URL mappings
4. WHEN extracting coordinates from Google Map URLs, THE System SHALL parse the URL format correctly
5. WHEN a Google Map URL format is invalid, THE System SHALL log an error and skip that area in distance calculations

## Area Map Reference

The following area numbers correspond to specific Google Map URLs:

- ① https://maps.app.goo.gl/6SUp2oApoATE4R336
- ② https://maps.app.goo.gl/3tXJJ3zPDhAXnxJk9
- ③ https://maps.app.goo.gl/9CvuwKdgGCpM7kiT7
- ④ https://maps.app.goo.gl/FAh59DdyR3Xrpn2d7
- ⑤ (Not specified)
- ⑥ https://maps.app.goo.gl/LWcdvysji8MzrC4a6
- ⑦ https://maps.app.goo.gl/UMvP5iD5ttYvpz9i8
- ⑧ https://maps.app.goo.gl/4UJ6Dcfniv5HnJV67
- ⑨ https://maps.app.goo.gl/RFxMmCWuqNBw1UR87
- ⑩ https://maps.app.goo.gl/LQrdiaZjij6R69fx9
- ⑪ https://maps.app.goo.gl/Lia3s1spu2giyaBJ9
- ⑫ https://maps.app.goo.gl/qkaDsYW4HFpx9x8x9
- ⑬ https://maps.app.goo.gl/hPndBk6HxPvdfFBz9
- ⑭ https://maps.app.goo.gl/ZWYbTxb2Dnq6B6ka8
- ⑮ https://maps.app.goo.gl/rAMak435w8Q33qJo8
- ㊵ 大分市全部 (All of Oita City)
- ㊶ 別府市全部 (All of Beppu City)
