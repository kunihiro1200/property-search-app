# Requirements Document

## Introduction

This feature addresses three issues with the "site" (サイト) field display and functionality in the seller management system. The site field tracks the website or channel from which seller inquiries originated (e.g., ウ, ビ, HP, at-home).

## Glossary

- **Site Field**: A field that stores the website or channel from which a seller inquiry originated
- **Sellers Table**: The main list view showing all sellers
- **New Seller Page**: The form for registering a new seller
- **Call Mode Page**: The page for managing seller calls and displaying seller details
- **Other Section**: A section in the Call Mode Page that displays additional seller information

## Requirements

### Requirement 1

**User Story:** As a user viewing the sellers table, I want to see the site field displayed correctly, so that I can identify the inquiry source for each seller.

#### Acceptance Criteria

1. WHEN the system retrieves seller data from the backend THEN the system SHALL map the `site` field from the API response to the display column
2. WHEN a seller has a site value THEN the system SHALL display that value in the "サイト" column
3. WHEN a seller does not have a site value THEN the system SHALL display "-" in the "サイト" column

### Requirement 2

**User Story:** As a user registering a new seller, I want to select the site from a dropdown list, so that I can accurately record the inquiry source.

#### Acceptance Criteria

1. WHEN a user views the new seller registration form THEN the system SHALL display a dropdown select field for the site
2. WHEN the site dropdown is opened THEN the system SHALL display all valid site options as defined in the backend
3. WHEN a user selects a site option THEN the system SHALL store that value in the form state
4. WHEN the form is submitted THEN the system SHALL send the selected site value to the backend using the `site` field name

### Requirement 3

**User Story:** As a user in call mode viewing seller details, I want to see the site field in the "Other" section, so that I can reference the inquiry source during calls.

#### Acceptance Criteria

1. WHEN a user views the call mode page THEN the system SHALL display a "サイト" field in the "Other" section
2. WHEN the seller has a site value THEN the system SHALL display that value in the site field
3. WHEN the seller does not have a site value THEN the system SHALL display an empty or placeholder value
4. WHEN a user edits the site field THEN the system SHALL allow selection from the valid site options
5. WHEN a user saves the site field THEN the system SHALL update the seller record with the new site value
