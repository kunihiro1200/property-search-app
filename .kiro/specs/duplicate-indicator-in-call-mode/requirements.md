# Requirements Document

## Introduction

通話モードページにおいて、重複案件（メールアドレスや電話番号が一致する他の売主案件）が存在する場合に、その情報を視覚的に表示し、重複案件の詳細情報（スプレッドシートコメントとコミュニケーション履歴）に簡単にアクセスできる機能を実装する。これにより、営業担当者は過去の対応履歴を素早く確認し、より効果的な顧客対応が可能になる。

## Glossary

- **System**: 売主管理システム
- **CallModeHeader**: 通話モードページのヘッダー部分（売主番号などが表示される領域）
- **DuplicateIndicator**: 重複案件の存在を示す視覚的な表示要素
- **DuplicateModal**: 重複案件の詳細情報を表示するモーダルダイアログ
- **SpreadsheetComment**: スプレッドシートに記録されているコメント情報
- **CommunicationHistory**: 過去の通話履歴やメール送信履歴などの活動記録
- **DuplicateMatch**: メールアドレスまたは電話番号が一致する他の売主案件

## Requirements

### Requirement 1

**User Story:** 営業担当者として、通話モード画面で重複案件の存在を即座に認識したい。そうすることで、過去の対応履歴を考慮した適切な対応ができる。

#### Acceptance Criteria

1. WHEN the System loads a seller in call mode THEN the System SHALL check for duplicate sellers by phone number and email address
2. WHEN duplicate sellers exist THEN the CallModeHeader SHALL display a DuplicateIndicator next to the seller number
3. WHEN no duplicate sellers exist THEN the CallModeHeader SHALL NOT display any DuplicateIndicator
4. WHEN the DuplicateIndicator is displayed THEN the System SHALL use a visually prominent style with red or orange color
5. WHEN multiple duplicates exist THEN the DuplicateIndicator SHALL show the count of duplicate cases

### Requirement 2

**User Story:** 営業担当者として、重複案件の詳細情報を簡単に確認したい。そうすることで、過去のやり取りを把握して適切な対応方針を決定できる。

#### Acceptance Criteria

1. WHEN a user clicks the DuplicateIndicator THEN the System SHALL open a DuplicateModal
2. WHEN the DuplicateModal opens THEN the System SHALL display a list of all duplicate sellers
3. WHEN displaying each duplicate seller THEN the System SHALL show the seller number, name, inquiry date, and match type
4. WHEN the match type is phone THEN the System SHALL indicate the duplicate was found by phone number
5. WHEN the match type is email THEN the System SHALL indicate the duplicate was found by email address
6. WHEN the match type is both THEN the System SHALL indicate the duplicate was found by both phone and email

### Requirement 3

**User Story:** 営業担当者として、重複案件のスプレッドシートコメントを確認したい。そうすることで、過去に記録された重要な情報や注意事項を把握できる。

#### Acceptance Criteria

1. WHEN the DuplicateModal displays a duplicate seller THEN the System SHALL fetch and display the SpreadsheetComment for that seller
2. WHEN the SpreadsheetComment exists THEN the System SHALL display it in a readable text format
3. WHEN the SpreadsheetComment is empty THEN the System SHALL display a message indicating no comments exist
4. WHEN the SpreadsheetComment contains line breaks THEN the System SHALL preserve the formatting
5. WHEN the SpreadsheetComment is long THEN the System SHALL provide scrolling functionality

### Requirement 4

**User Story:** 営業担当者として、重複案件のコミュニケーション履歴を確認したい。そうすることで、過去の通話内容やメール送信履歴を把握して重複対応を避けられる。

#### Acceptance Criteria

1. WHEN the DuplicateModal displays a duplicate seller THEN the System SHALL fetch and display the CommunicationHistory for that seller
2. WHEN displaying CommunicationHistory THEN the System SHALL show phone calls, emails, and SMS messages in chronological order
3. WHEN displaying each activity THEN the System SHALL show the date, time, type, and content
4. WHEN displaying phone call activities THEN the System SHALL show the call memo content
5. WHEN displaying email activities THEN the System SHALL show the email subject and template used
6. WHEN displaying SMS activities THEN the System SHALL show the SMS template used
7. WHEN no CommunicationHistory exists THEN the System SHALL display a message indicating no history exists

### Requirement 5

**User Story:** 営業担当者として、重複案件の詳細情報を見やすい形式で確認したい。そうすることで、情報を素早く理解して次のアクションを決定できる。

#### Acceptance Criteria

1. WHEN the DuplicateModal is displayed THEN the System SHALL organize information into clear sections
2. WHEN displaying duplicate seller information THEN the System SHALL use a card or panel layout for each duplicate
3. WHEN displaying multiple duplicates THEN the System SHALL allow scrolling through the list
4. WHEN the user wants to close the modal THEN the System SHALL provide a close button
5. WHEN the user clicks outside the modal THEN the System SHALL close the DuplicateModal
6. WHEN the user presses the Escape key THEN the System SHALL close the DuplicateModal

### Requirement 6

**User Story:** 営業担当者として、重複案件から元の売主詳細ページに移動したい。そうすることで、より詳細な情報を確認したり編集したりできる。

#### Acceptance Criteria

1. WHEN the DuplicateModal displays a duplicate seller THEN the System SHALL provide a link to that seller's detail page
2. WHEN a user clicks the seller detail link THEN the System SHALL navigate to the seller detail page in a new tab
3. WHEN navigating to the seller detail page THEN the System SHALL preserve the current call mode page state
4. WHEN the seller number is displayed THEN the System SHALL make it clickable as a link
5. WHEN hovering over the seller number link THEN the System SHALL show a visual indication that it is clickable

### Requirement 7

**User Story:** システム管理者として、重複検出のパフォーマンスを最適化したい。そうすることで、通話モード画面の読み込み速度を維持できる。

#### Acceptance Criteria

1. WHEN loading call mode THEN the System SHALL perform duplicate detection asynchronously
2. WHEN duplicate detection is in progress THEN the System SHALL display a loading indicator
3. WHEN duplicate detection completes THEN the System SHALL update the DuplicateIndicator without page reload
4. WHEN duplicate detection fails THEN the System SHALL log the error and continue without showing duplicates
5. WHEN fetching duplicate details THEN the System SHALL cache the results for the session
