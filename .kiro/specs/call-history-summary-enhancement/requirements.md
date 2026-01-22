# Requirements Document

## Introduction

This feature enhances the call history summary (通話履歴サマリー) functionality to provide more accurate call count tracking and improved comment display ordering. The system currently displays communication history and spreadsheet comments but needs improvements in counting phone calls from comment timestamps and prioritizing recent information.

## Glossary

- **Call History Summary (通話履歴サマリー)**: A summary section that aggregates communication activities and comments for a seller
- **Communication History (コミュニケーション履歴)**: Structured activity log entries stored in the system database
- **Spreadsheet Comments (スプレッドシートコメント)**: Free-text comments synced from Google Sheets that may contain timestamped call records
- **Call Count (通話回数)**: The total number of phone calls made to a seller, derived from both communication history and spreadsheet comments
- **Timestamp Pattern**: Date-time format in comments (e.g., "3/2 12:00 ●●●") indicating a phone call occurrence
- **System**: The seller management application

## Requirements

### Requirement 1

**User Story:** As a sales representative, I want accurate call counts that include both system-logged calls and spreadsheet comment timestamps, so that I can see the complete communication history with each seller.

#### Acceptance Criteria

1. WHEN the system calculates call counts, THE System SHALL parse spreadsheet comments for timestamp patterns matching the format "[month]/[day] [hour]:[minute]"
2. WHEN a timestamp pattern is found in spreadsheet comments, THE System SHALL increment the call count by one for each occurrence
3. WHEN combining call counts from communication history and spreadsheet comments, THE System SHALL ensure no duplicate counting occurs
4. WHEN displaying the call count, THE System SHALL show the total from both communication history entries and parsed spreadsheet comment timestamps
5. WHEN a comment contains multiple timestamp patterns, THE System SHALL count each unique timestamp as a separate call

### Requirement 2

**User Story:** As a sales representative, I want to see the most recent comments displayed first in the call history summary, so that I can quickly access the latest and most relevant information about each seller.

#### Acceptance Criteria

1. WHEN displaying spreadsheet comments in the call history summary, THE System SHALL sort comments in reverse chronological order
2. WHEN comments contain timestamp patterns, THE System SHALL use the most recent timestamp within each comment for sorting purposes
3. WHEN a comment lacks a timestamp pattern, THE System SHALL use the comment creation date for sorting
4. WHEN displaying the sorted comments, THE System SHALL place the newest comment at the top of the summary
5. WHEN communication history entries are displayed alongside spreadsheet comments, THE System SHALL maintain reverse chronological ordering across both sources

### Requirement 3

**User Story:** As a sales representative, I want the call history summary to consolidate and summarize information from multiple sources into concise sections, so that I can quickly understand the seller's situation without reading duplicate or verbose content.

#### Acceptance Criteria

1. WHEN generating the summary, THE System SHALL extract information from both communication history and spreadsheet comments and summarize it into unified sections
2. WHEN multiple entries contain similar or overlapping information, THE System SHALL merge and summarize the content into a single concise statement per section
3. WHEN displaying information in each section, THE System SHALL present summarized content rather than copying raw text verbatim
4. WHEN summarizing content, THE System SHALL preserve key facts while removing redundant phrases and unnecessary details
5. WHEN organizing sections, THE System SHALL follow the order: 次のアクション, 通話回数, 連絡可能時間, 状況, 名義人, 売却時期, 売却理由, 物件情報, 確度, その他

### Requirement 4

**User Story:** As a sales representative, I want the summary to intelligently extract, categorize, and summarize information into predefined sections, so that I can find specific details quickly in a concise format.

#### Acceptance Criteria

1. WHEN extracting information for 【状況】, THE System SHALL identify and summarize current situation, progress with other companies, contract status, and decision-making context
2. WHEN extracting information for 【名義人】, THE System SHALL identify and summarize property ownership and key decision-maker relationships
3. WHEN extracting information for 【売却時期】, THE System SHALL identify and summarize timing expectations, urgency, and planned moving dates
4. WHEN extracting information for 【売却理由】, THE System SHALL identify and summarize the primary motivation and circumstances for selling
5. WHEN extracting information for 【物件情報】, THE System SHALL identify and summarize key property characteristics, structure, condition, and notable features
6. WHEN extracting information for 【確度】, THE System SHALL identify and summarize confidence level indicators and assessment of likelihood to close
7. WHEN extracting information for 【連絡可能時間】, THE System SHALL identify and summarize preferred contact times, days, and communication preferences
8. WHEN extracting information for 【その他】, THE System SHALL identify and summarize important details that don't fit other categories

### Requirement 5

**User Story:** As a system administrator, I want the timestamp parsing logic to be robust and handle various date formats, so that call counts remain accurate even with inconsistent comment formatting.

#### Acceptance Criteria

1. WHEN parsing timestamps, THE System SHALL recognize patterns with single or double-digit months (e.g., "3/2" and "03/02")
2. WHEN parsing timestamps, THE System SHALL recognize patterns with single or double-digit days
3. WHEN parsing timestamps, THE System SHALL handle 24-hour time format (e.g., "17:21")
4. WHEN a timestamp pattern is malformed or incomplete, THE System SHALL skip that pattern without affecting other valid timestamps
5. WHEN parsing fails for a comment, THE System SHALL log the error and continue processing remaining comments

### Requirement 6

**User Story:** As a sales representative, I want the summary format to match the examples provided, so that information is presented consistently and clearly across all sellers.

#### Acceptance Criteria

1. WHEN showing call counts, THE System SHALL display the count in the format "【通話回数】X回" where X is the total count
2. WHEN displaying 【次のアクション】, THE System SHALL present the recommended next step based on the current situation
3. WHEN displaying 【状況】, THE System SHALL consolidate all situation-related information including other companies, progress, and current state
4. WHEN displaying 【名義人】, THE System SHALL show property ownership and key decision-maker information
5. WHEN displaying 【売却時期】, THE System SHALL show timing expectations and urgency
6. WHEN displaying 【売却理由】, THE System SHALL show the motivation for selling
7. WHEN displaying 【物件情報】, THE System SHALL show property characteristics in a concise format
8. WHEN displaying 【確度】, THE System SHALL provide an assessment of likelihood to close
9. WHEN displaying 【連絡可能時間】, THE System SHALL show preferred contact times and methods
10. WHEN displaying 【その他】, THE System SHALL include any additional important notes that don't fit other categories
