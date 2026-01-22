# Requirements Document

## Introduction

通話モードページのEmail送信プルダウンに表示されるテンプレートを、新しい業務要件に合わせて全面的に差し替える機能です。現在の7つのテンプレートを、より詳細で実務に即した25種類のテンプレートに置き換えます。

## Glossary

- **System**: 不動産売主管理システム
- **CallModePage**: 通話モード画面（売主との電話対応時に使用する画面）
- **EmailTemplate**: メール送信用のテンプレート（種別、件名、本文を含む）
- **Dropdown**: プルダウンメニュー（選択肢を表示するUI要素）
- **Placeholder**: テンプレート内の置換文字列（例：<<名前>>、<<物件所在地>>）

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to select from 25 different email templates in the call mode page, so that I can quickly send appropriate emails to sellers based on various situations.

#### Acceptance Criteria

1. WHEN the user opens the email dropdown in CallModePage THEN the System SHALL display 25 email template options
2. WHEN the user selects an email template THEN the System SHALL populate the template with seller and property data using placeholders
3. WHEN a template contains placeholders like <<名前(漢字のみ）>>, <<物件所在地>>, <<査定額1>> THEN the System SHALL replace them with actual data from the seller record
4. WHEN the user confirms sending an email THEN the System SHALL send the email with the populated content
5. WHEN an email is sent THEN the System SHALL record the activity in the seller's activity log

### Requirement 2

**User Story:** As a 営業担当者, I want each email template to have a clear category label (種別), so that I can quickly identify the purpose of each template.

#### Acceptance Criteria

1. WHEN displaying email templates in the dropdown THEN the System SHALL show the template category (種別) as the primary label
2. WHEN displaying email templates THEN the System SHALL show the subject line (件名) as secondary information
3. WHEN displaying email templates THEN the System SHALL show a preview of the email body (本文) as tertiary information
4. WHEN the dropdown menu is opened THEN the System SHALL display templates in a readable format with proper spacing and hierarchy
5. WHEN the user hovers over a template option THEN the System SHALL maintain readability of all three information levels

### Requirement 3

**User Story:** As a システム管理者, I want the email templates to support dynamic placeholder replacement, so that emails are personalized with seller-specific information.

#### Acceptance Criteria

1. WHEN a template contains <<名前(漢字のみ）>> THEN the System SHALL replace it with the seller's name (kanji only)
2. WHEN a template contains <<物件所在地>> THEN the System SHALL replace it with the property address
3. WHEN a template contains <<査定額1>>, <<査定額2>>, <<査定額3>> THEN the System SHALL replace them with valuation amounts in 万円 format
4. WHEN a template contains <<土（㎡）>>, <<建（㎡）>> THEN the System SHALL replace them with land and building areas
5. WHEN a template contains <<築年不明>> THEN the System SHALL replace it with build year information or appropriate text if unknown
6. WHEN a template contains <<営担>>, <<担当名（営業）名前>>, <<担当名（営業）電話番号>>, <<担当名（営業）メールアドレス>> THEN the System SHALL replace them with the assigned employee's information
7. WHEN a template contains <<訪問日>>, <<時間>> THEN the System SHALL replace them with appointment date and time
8. WHEN a template contains <<競合名>> THEN the System SHALL replace it with competitor company names
9. WHEN a template contains <<お客様紹介文言>> THEN the System SHALL replace it with customer introduction text
10. WHEN a placeholder value is missing or null THEN the System SHALL handle it gracefully by showing appropriate default text or leaving it blank

### Requirement 4

**User Story:** As a 営業担当者, I want to preview the email content before sending, so that I can verify the information is correct.

#### Acceptance Criteria

1. WHEN the user selects an email template THEN the System SHALL display a confirmation dialog with the populated email content
2. WHEN the confirmation dialog is shown THEN the System SHALL display the subject line and full email body
3. WHEN the user reviews the email in the confirmation dialog THEN the System SHALL show all placeholders replaced with actual data
4. WHEN the user clicks confirm in the dialog THEN the System SHALL send the email
5. WHEN the user clicks cancel in the dialog THEN the System SHALL close the dialog without sending the email

### Requirement 5

**User Story:** As a システム管理者, I want the new email templates to replace the existing templates completely, so that users only see the updated template list.

#### Acceptance Criteria

1. WHEN the system is updated THEN the System SHALL remove all 7 existing email templates from the dropdown
2. WHEN the system is updated THEN the System SHALL add all 25 new email templates to the dropdown
3. WHEN the email dropdown is opened THEN the System SHALL display only the new templates in the specified order
4. WHEN existing code references old template IDs THEN the System SHALL not break or cause errors
5. WHEN the update is deployed THEN the System SHALL maintain backward compatibility with activity logs that reference old template names
