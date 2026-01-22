# Requirements Document

## Introduction

通話モードページのSMS送信機能において、現在の7つのテンプレート選択肢を新しい7つのテンプレートに総入れ替えする。各テンプレートは売主の情報（サイト、名前、物件所在地、査定額など）を動的に埋め込み、サイト別に異なる内容を送信する機能を持つ。

## Glossary

- **System**: 不動産管理システム
- **User**: システムを使用する不動産会社の従業員
- **Seller**: 不動産の売主（顧客）
- **Call Mode Page**: 通話モードページ - 売主との通話中に使用する専用ページ
- **SMS Template**: SMS送信用のテンプレート - 定型文と動的データの組み合わせ
- **Site**: 反響元サイト（ウ=イエウール、L=ライフルホームズ、Y=Yahoo、す=すまいステップ、H=HOME4U等）
- **Template Dropdown**: SMS送信テンプレートを選択するプルダウンメニュー

## Requirements

### Requirement 1

**User Story:** As a User, I want to select from 7 new SMS templates in a specific order, so that I can quickly send appropriate messages to Sellers during calls.

#### Acceptance Criteria

1. WHEN the User views the Call Mode Page THEN the System SHALL display an SMS template dropdown with exactly 7 options in the following order: 初回不通時キャンセル案内、キャンセル案内、査定Sメール、訪問事前通知メール、訪問後御礼メール、除外前・長期客Sメール、当社が電話したというリマインドメール
2. WHEN the User selects a template from the dropdown THEN the System SHALL display a confirmation dialog showing the template label and content preview
3. WHEN the User confirms sending THEN the System SHALL open the device SMS application with the Seller phone number and pre-filled message content
4. WHEN the User confirms sending THEN the System SHALL record the SMS activity in the activity log with the template label
5. WHEN the SMS is sent THEN the System SHALL refresh the activity history to show the new SMS record

### Requirement 2

**User Story:** As a User, I want the "初回不通時キャンセル案内" template to generate site-specific cancellation guidance messages, so that Sellers receive appropriate instructions based on their inquiry source.

#### Acceptance Criteria

1. WHEN the Seller site is "ウ" (イエウール) THEN the System SHALL generate a message containing イエウール-specific cancellation instructions with contact information (TEL: 05054971590, Mail: ieul-support@speee.jp)
2. WHEN the Seller site is "L" or "Y" (ライフルホームズ or Yahoo) THEN the System SHALL generate a message with reply-based cancellation instructions
3. WHEN the Seller site is "す" (すまいステップ) THEN the System SHALL generate a message with Google Forms cancellation link (https://forms.gle/iu3rLdPJ784WJxJW7)
4. WHEN the Seller site is "H" (HOME4U) THEN the System SHALL generate a message without specific cancellation instructions
5. WHEN the template is generated THEN the System SHALL include the Seller name, property address, and company information in the message

### Requirement 3

**User Story:** As a User, I want the "キャンセル案内" template to provide follow-up cancellation guidance after phone calls, so that Sellers can easily cancel if they wish.

#### Acceptance Criteria

1. WHEN the Seller site is "ウ" (イエウール) THEN the System SHALL generate a message with detailed email-based cancellation instructions including required wording guidance
2. WHEN the Seller site is "す" (すまいステップ) THEN the System SHALL generate a message with Google Forms cancellation link
3. WHEN the Seller site is "L" (ライフルホームズ) THEN the System SHALL generate a message with reply-based cancellation instructions and 24-hour deadline notice
4. WHEN the Seller site is not "ウ", "す", or "L" THEN the System SHALL indicate that cancellation guidance is not required
5. WHEN the template is generated THEN the System SHALL include the Seller name and property address in the message

### Requirement 4

**User Story:** As a User, I want the "査定Sメール" template to send valuation results with three price tiers, so that Sellers receive comprehensive pricing information.

#### Acceptance Criteria

1. WHEN the User selects the valuation SMS template THEN the System SHALL generate a message containing three valuation amounts (査定額1, 査定額2, 査定額3) formatted as price ranges in 万円 units
2. WHEN the build year is unknown or zero THEN the System SHALL include a notice that the valuation was calculated assuming 35 years old
3. WHEN the template is generated THEN the System SHALL include the Seller name, property address, appointment booking link (http://bit.ly/44U9pjl), and company contact information
4. WHEN the template is generated THEN the System SHALL mention that the User has potential buyers interested in the area
5. WHEN the valuation amounts are not set THEN the System SHALL use auto-calculated values if available

### Requirement 5

**User Story:** As a User, I want the "訪問事前通知メール" template to send appointment reminders with appropriate timing, so that Sellers are properly notified before visits.

#### Acceptance Criteria

1. WHEN the appointment day is Thursday THEN the System SHALL generate a message stating "明後日" (day after tomorrow) with the appointment date and time
2. WHEN the appointment day is not Thursday THEN the System SHALL generate a message stating "明日" (tomorrow) with the appointment date and time
3. WHEN the template is generated THEN the System SHALL include the Seller name, appointment datetime, company contact information (TEL: 097-533-2022, Email: tenant@ifoo-oita.com), and business hours notice
4. WHEN the template is generated THEN the System SHALL indicate that the message is reply-disabled and provide alternative contact methods
5. WHEN the template is generated THEN the System SHALL format the appointment date as "M月D日" and time as "HH:MM"

### Requirement 6

**User Story:** As a User, I want the "訪問後御礼メール" template to send thank-you messages after property visits, so that Sellers feel appreciated and can follow up with questions.

#### Acceptance Criteria

1. WHEN the User selects the post-visit thank-you template THEN the System SHALL generate a message thanking the Seller for their time
2. WHEN the template is generated THEN the System SHALL include the Seller name and the assigned employee name (営担 field mapped to full names)
3. WHEN the 営担 field is "U" THEN the System SHALL use "裏" as the employee name
4. WHEN the 営担 field is "M", "Y", "W", or "K" THEN the System SHALL use "河野", "山本", "和田", or "国広" respectively
5. WHEN the template is generated THEN the System SHALL include company name and encourage the Seller to contact with any questions

### Requirement 7

**User Story:** As a User, I want the "除外前・長期客Sメール" template to check selling intentions with long-term prospects, so that I can identify active selling opportunities.

#### Acceptance Criteria

1. WHEN the User selects the long-term customer template THEN the System SHALL generate a message inquiring about the Seller selling plans
2. WHEN the template is generated THEN the System SHALL include the Seller name, property address, and mention of interested buyers
3. WHEN the template is generated THEN the System SHALL include the appointment booking link (http://bit.ly/44U9pjl) for formal valuations
4. WHEN the template is generated THEN the System SHALL offer the option to opt-out of future communications
5. WHEN the template is generated THEN the System SHALL include company address, sales record link (bit.ly/3J61wzG), and phone number

### Requirement 8

**User Story:** As a User, I want the "当社が電話したというリマインドメール" template to send call reminders after phone conversations, so that Sellers remember our contact and can respond at their convenience.

#### Acceptance Criteria

1. WHEN the User selects the call reminder template THEN the System SHALL generate a message confirming that the company called earlier
2. WHEN the template is generated THEN the System SHALL include the Seller name and request for convenient callback times
3. WHEN the template is generated THEN the System SHALL indicate that replies to the message are welcome
4. WHEN the template is generated THEN the System SHALL include company address, sales record link (bit.ly/3J61wzG), and phone number
5. WHEN the template is generated THEN the System SHALL maintain a polite and professional tone

### Requirement 9

**User Story:** As a User, I want all SMS templates to properly handle line breaks and formatting, so that messages display correctly on mobile devices.

#### Acceptance Criteria

1. WHEN the System generates any SMS template THEN the System SHALL convert "[改行]" placeholders to actual line breaks
2. WHEN the System generates any SMS template THEN the System SHALL handle empty or null Seller data fields gracefully without breaking the message format
3. WHEN the System generates any SMS template THEN the System SHALL ensure proper spacing between sections for readability
4. WHEN the System generates any SMS template THEN the System SHALL limit message length to reasonable SMS constraints
5. WHEN the System generates any SMS template THEN the System SHALL preserve Japanese character encoding correctly

### Requirement 10

**User Story:** As a User, I want the SMS template dropdown to replace the existing templates completely, so that only the new 7 templates are available.

#### Acceptance Criteria

1. WHEN the System loads the Call Mode Page THEN the System SHALL remove all existing SMS template definitions
2. WHEN the System displays the SMS dropdown THEN the System SHALL show only the 7 new templates in the specified order
3. WHEN the User attempts to access old templates THEN the System SHALL not provide any access to previous template definitions
4. WHEN the System records SMS activities THEN the System SHALL use the new template labels in activity logs
5. WHEN the System displays activity history THEN the System SHALL correctly display SMS activities sent using the new templates
