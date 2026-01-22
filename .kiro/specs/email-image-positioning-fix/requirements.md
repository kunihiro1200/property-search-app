# Requirements Document

## Introduction

メール送信機能において、RichTextEmailEditorで本文の任意の位置に貼り付けた画像が、受信したメールでは本文の最後に配置されてしまう問題を解決します。現在、フロントエンドではcontentEditableを使用してカーソル位置に画像を正しく挿入していますが、バックエンドでの画像処理時に位置情報が失われています。

## Glossary

- **RichTextEmailEditor**: contentEditableを使用したリッチテキストエディタコンポーネント
- **Inline Image**: メール本文内に埋め込まれた画像（data:image/... 形式）
- **CID (Content-ID)**: メール内で画像を参照するための一意の識別子
- **Multipart Message**: テキストと画像を含む複数パートで構成されるメールメッセージ
- **Base64 Encoding**: 画像データをテキスト形式にエンコードする方式

## Requirements

### Requirement 1

**User Story:** As a user, I want pasted images to appear at the exact position where I placed them in the editor, so that recipients see the images in the correct context.

#### Acceptance Criteria

1. WHEN a user pastes an image at the beginning of the email body THEN the system SHALL preserve that position in the sent email
2. WHEN a user pastes an image in the middle of text THEN the system SHALL maintain the image between the text segments in the sent email
3. WHEN a user pastes multiple images at different positions THEN the system SHALL preserve the relative order and positions of all images
4. WHEN a user types text after an image THEN the system SHALL keep the text after the image in the sent email
5. WHEN the email is received THEN the images SHALL appear at the same positions as they were in the editor

### Requirement 2

**User Story:** As a developer, I want the backend to preserve the exact HTML structure from the editor, so that image positions are maintained during email processing.

#### Acceptance Criteria

1. WHEN the backend receives HTML with embedded images THEN the system SHALL extract images without altering their positions in the HTML
2. WHEN converting data:image URLs to CID references THEN the system SHALL perform in-place replacement to maintain position
3. WHEN generating the multipart email message THEN the system SHALL use the processed HTML with CID references at their original positions
4. WHEN wrapping the HTML in an email template THEN the system SHALL preserve the exact content structure
5. WHEN multiple images are present THEN the system SHALL maintain their sequential order and relative positions

### Requirement 3

**User Story:** As a user, I want the email HTML generation to be simple and predictable, so that what I see in the editor matches what recipients see.

#### Acceptance Criteria

1. WHEN generating email HTML THEN the system SHALL NOT attempt to detect or move images based on signature patterns
2. WHEN processing the editor content THEN the system SHALL use the innerHTML directly without restructuring
3. WHEN creating the email body THEN the system SHALL wrap the content in a minimal HTML template
4. WHEN images are embedded THEN the system SHALL NOT insert them at predetermined locations (like before signature)
5. WHEN the email is sent THEN the HTML structure SHALL match the editor's DOM structure

### Requirement 4

**User Story:** As a developer, I want clear logging of the image processing steps, so that I can debug position-related issues easily.

#### Acceptance Criteria

1. WHEN processing embedded images THEN the system SHALL log the number of images detected
2. WHEN replacing data:image URLs THEN the system SHALL log each replacement with its CID
3. WHEN generating the final HTML THEN the system SHALL log a preview of the processed HTML
4. WHEN an error occurs during image processing THEN the system SHALL log the error with context
5. WHEN the email is sent successfully THEN the system SHALL log the message ID and confirmation

### Requirement 5

**User Story:** As a user, I want the system to handle edge cases gracefully, so that my emails are sent correctly even in unusual situations.

#### Acceptance Criteria

1. WHEN an image exceeds the size limit THEN the system SHALL skip that image and log a warning
2. WHEN image extraction fails THEN the system SHALL keep the original img tag and continue processing
3. WHEN no images are present THEN the system SHALL send the email as plain HTML without multipart structure
4. WHEN the HTML contains both embedded and selected images THEN the system SHALL process both types correctly
5. WHEN the editor content is empty THEN the system SHALL send an empty email body without errors

