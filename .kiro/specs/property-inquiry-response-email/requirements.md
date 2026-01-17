# Requirements Document

## Introduction

買主からの物件問い合わせに対する返信メールを自動生成する機能を実装します。買主リストページから買主を選択し、その買主が問い合わせた物件の「●内覧前伝達事項」（BQ列）を物件スプレッドシートから取得し、指定されたテンプレートに基づいてメール本文を生成します。買主への効率的な情報提供を実現します。

## Glossary

- **System**: 買主リスト管理システム
- **Buyer**: 買主（buyersテーブル）
- **Property Listing**: 物件リスト（property_listingsテーブル）
- **Property Number**: 物件番号（buyersテーブルのproperty_numberフィールド）
- **Spreadsheet**: Google スプレッドシート（物件データの元データ）
- **内覧前伝達事項**: 物件スプレッドシートのBQ列に記載される、内覧前に買主に伝えるべき情報
- **Inquiry Response Email**: 問い合わせ返信メール
- **Email Template**: メール本文のテンプレート
- **内覧アンケート**: 内覧予約用のアンケートURL

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to retrieve the property information based on the buyer's inquiry, so that I can send accurate property details to the buyer.

#### Acceptance Criteria

1. WHEN a buyer is selected from the buyer list THEN the System SHALL retrieve the property_number from the buyers table
2. WHEN the property_number is retrieved THEN the System SHALL search for the corresponding property in the property_listings table
3. WHEN the property is found THEN the System SHALL retrieve the pre_viewing_notes field from the property_listings table
4. WHEN the pre_viewing_notes field exists THEN the System SHALL include it in the email template
5. WHEN the pre_viewing_notes field is empty THEN the System SHALL handle it gracefully by omitting that section
6. WHEN the property_number is empty or invalid THEN the System SHALL display an error message and prevent email generation
7. WHEN the property is not found in property_listings THEN the System SHALL display an error message indicating the property does not exist

### Requirement 2

**User Story:** As a 営業担当者, I want to generate inquiry response emails using a predefined template with buyer information, so that I can send personalized and professional responses.

#### Acceptance Criteria

1. WHEN generating an inquiry response email THEN the System SHALL use a simple template structure with:
   - Buyer name greeting
   - Property information (property number, address)
   - Pre-viewing notes (if available)
   - Optional custom message
   - Closing message
2. WHEN the template contains buyer name placeholder THEN the System SHALL replace it with the buyer's name from the buyers.name field
3. WHEN the template contains property information THEN the System SHALL replace it with data from property_listings table
4. WHEN the template contains pre-viewing notes placeholder THEN the System SHALL replace it with the pre_viewing_notes field value
5. WHEN pre_viewing_notes is empty THEN the System SHALL omit that section from the email

### Requirement 3

**User Story:** As a 営業担当者, I want the email to be sent through the existing EmailService, so that all emails are sent consistently through the same system.

#### Acceptance Criteria

1. WHEN sending an inquiry response email THEN the System SHALL use the existing EmailService.sendEmail() method
2. WHEN the email is sent THEN the System SHALL include the buyer's email address as the recipient
3. WHEN the email is sent THEN the System SHALL include a subject line with the property number
4. WHEN the email is sent THEN the System SHALL include both plain text and HTML versions of the email body
5. WHEN the email is sent successfully THEN the System SHALL return a success message to the user

### Requirement 4

**User Story:** As a 営業担当者, I want to add custom messages to the inquiry response email, so that I can personalize the communication with each buyer.

#### Acceptance Criteria

1. WHEN composing an inquiry response email THEN the System SHALL provide a text field for adding a custom message
2. WHEN a custom message is entered THEN the System SHALL include it in the email body after the property information
3. WHEN no custom message is entered THEN the System SHALL send the email with only the standard template content
4. WHEN the custom message is too long THEN the System SHALL display a character count or warning
5. WHEN the email is sent THEN the System SHALL preserve the formatting of the custom message

### Requirement 5

**User Story:** As a 営業担当者, I want to preview the property information before sending the email, so that I can verify the content is correct.

#### Acceptance Criteria

1. WHEN the inquiry response modal opens THEN the System SHALL display the property information retrieved from the database
2. WHEN the property information is displayed THEN the System SHALL show the property number, address, property type, and price
3. WHEN pre_viewing_notes exist THEN the System SHALL display them in a highlighted section
4. WHEN pre_viewing_notes do not exist THEN the System SHALL not display that section
5. WHEN the user reviews the information THEN the System SHALL allow them to add a custom message before sending

### Requirement 6

**User Story:** As a システム管理者, I want the system to handle missing data gracefully, so that email generation doesn't fail due to incomplete property information.

#### Acceptance Criteria

1. WHEN a buyer's property_number is missing THEN the System SHALL disable the inquiry response button for that buyer
2. WHEN the property is not found in property_listings THEN the System SHALL display an error message
3. WHEN the pre_viewing_notes field is empty THEN the System SHALL omit that section from the email
4. WHEN the property address is missing THEN the System SHALL still allow email generation with available data
5. WHEN critical data is missing THEN the System SHALL display a warning message but allow the user to proceed

### Requirement 7

**User Story:** As a 営業担当者, I want the system to integrate with existing email functionality, so that I can send the generated emails through the established workflow.

#### Acceptance Criteria

1. WHEN the email is ready to send THEN the System SHALL use the existing EmailService to send the email
2. WHEN sending the email THEN the System SHALL use the configured SMTP settings
3. WHEN sending the email THEN the System SHALL include proper email headers (From, To, Subject)
4. WHEN the email is sent successfully THEN the System SHALL display a success confirmation message
5. WHEN the email fails to send THEN the System SHALL display an error message with details

### Requirement 8

**User Story:** As a システム管理者, I want the email template to be simple and maintainable, so that it can be easily updated in the future.

#### Acceptance Criteria

1. WHEN generating an email THEN the System SHALL use a simple template defined in the service code
2. WHEN the template is used THEN the System SHALL replace placeholders with actual buyer and property data
3. WHEN the template needs to be updated THEN the System SHALL allow changes without requiring database migrations
4. WHEN the template is rendered THEN the System SHALL generate both plain text and HTML versions
5. WHEN the template is rendered THEN the System SHALL maintain proper formatting and line breaks

### Requirement 9

**User Story:** As a 営業担当者, I want to see clear feedback when sending emails, so that I know whether the operation was successful.

#### Acceptance Criteria

1. WHEN an inquiry response email is being sent THEN the System SHALL display a loading indicator
2. WHEN the email is sent successfully THEN the System SHALL display a success message
3. WHEN the email fails to send THEN the System SHALL display an error message with the reason
4. WHEN the modal is closed after success THEN the System SHALL reset the form state
5. WHEN the user closes the modal THEN the System SHALL return to the buyer list page

### Requirement 10

**User Story:** As a 営業担当者, I want to access this inquiry response email feature from the buyer list page, so that I can quickly respond to buyer inquiries.

#### Acceptance Criteria

1. WHEN viewing the buyer list page THEN the System SHALL display an "問い合わせ返信" button for each buyer row
2. WHEN a buyer has a property_number THEN the System SHALL enable the "問い合わせ返信" button
3. WHEN a buyer does not have a property_number THEN the System SHALL disable the "問い合わせ返信" button
4. WHEN the "問い合わせ返信" button is clicked THEN the System SHALL open a modal with the buyer's information
5. WHEN the modal opens THEN the System SHALL automatically fetch the property information using the buyer's property_number
6. WHEN the property information is fetched THEN the System SHALL display the property details and pre_viewing_notes
7. WHEN the user clicks "メール送信" THEN the System SHALL send the inquiry response email to the buyer
