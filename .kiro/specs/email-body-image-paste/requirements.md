# Requirements Document

## Introduction

メール送信確認画面において、ユーザーがスクリーンショットなどの画像をクリップボードから直接メール本文の任意の位置に貼り付けられる機能を追加します。現在はGoogle Driveからの画像添付のみサポートしていますが、より迅速な画像共有のために、クリップボードからの直接貼り付けを可能にします。

画像は本文内のカーソル位置に直接埋め込まれ、リッチテキストエディタ（contentEditable）を使用してテキストと画像を自由に配置できるようにします。

## Glossary

- **Email Confirmation Screen**: メール送信前の確認画面。件名、本文、添付ファイルを確認・編集できる画面
- **Clipboard Paste**: クリップボードに保存された画像データをCtrl+V（またはCmd+V）で貼り付ける操作
- **Inline Image**: メール本文内に埋め込まれた画像
- **Base64 Encoding**: 画像データをテキスト形式にエンコードする方式
- **Image Preview**: 貼り付けられた画像のプレビュー表示

## Requirements

### Requirement 1

**User Story:** As a user, I want to paste screenshots directly into the email body at the cursor position, so that I can quickly share visual information exactly where I need it without saving files first.

#### Acceptance Criteria

1. WHEN a user presses Ctrl+V (or Cmd+V) in the email body field AND the clipboard contains image data THEN the system SHALL extract the image from the clipboard
2. WHEN an image is extracted from the clipboard THEN the system SHALL insert the image at the current cursor position in the email body
3. WHEN an image is inserted THEN the system SHALL display it inline with the text content
4. WHEN a user pastes multiple images THEN the system SHALL insert each image at the cursor position when pasted
5. WHEN a user clicks on an inserted image THEN the system SHALL allow the user to delete it using the Delete or Backspace key

### Requirement 2

**User Story:** As a user, I want pasted images to be included in the email at their exact positions, so that recipients can see the images exactly where I placed them.

#### Acceptance Criteria

1. WHEN a user sends an email with pasted images THEN the system SHALL encode the images as Base64
2. WHEN encoding images THEN the system SHALL preserve their positions within the HTML email body
3. WHEN sending the email THEN the system SHALL include all pasted images in the email payload at their correct positions
4. WHEN the email is sent successfully THEN the system SHALL clear the email body content

### Requirement 3

**User Story:** As a user, I want to see validation errors for invalid images, so that I understand why an image cannot be pasted.

#### Acceptance Criteria

1. WHEN a user pastes non-image clipboard data THEN the system SHALL display an error message "クリップボードに画像データがありません"
2. WHEN a pasted image exceeds 5MB THEN the system SHALL display an error message "画像サイズが5MBを超えています"
3. WHEN the total size of all pasted images exceeds 10MB THEN the system SHALL prevent adding more images and display "合計画像サイズが10MBを超えています"
4. WHEN a validation error occurs THEN the system SHALL not add the invalid image to the preview area

### Requirement 4

**User Story:** As a user, I want clear visual feedback when pasting images, so that I know the paste operation was successful.

#### Acceptance Criteria

1. WHEN an image paste operation starts THEN the system SHALL display a loading indicator
2. WHEN an image is successfully pasted THEN the image SHALL appear immediately at the cursor position
3. WHEN an image paste fails THEN the system SHALL display an error message with the failure reason
4. WHEN the email body field is focused THEN the system SHALL show a hint "Ctrl+Vで画像を貼り付けられます（カーソル位置に挿入）"

### Requirement 5

**User Story:** As a developer, I want the pasted images to be properly formatted, so that they display correctly in email clients.

#### Acceptance Criteria

1. WHEN encoding images as Base64 THEN the system SHALL use the format `data:image/[type];base64,[data]`
2. WHEN embedding images in HTML THEN the system SHALL use `<img>` tags with the Base64 data URL
3. WHEN generating the email HTML THEN the system SHALL preserve the exact positions of images within the content
4. WHEN the email contains both text and images THEN the system SHALL preserve the text formatting and image positions exactly as they appear in the editor

### Requirement 6

**User Story:** As a user, I want to use a rich text editor for email composition, so that I can format my emails with text and images naturally.

#### Acceptance Criteria

1. WHEN the email body field is rendered THEN the system SHALL use a contentEditable div instead of a plain textarea
2. WHEN a user types in the editor THEN the system SHALL preserve line breaks and basic formatting
3. WHEN a user pastes an image THEN the system SHALL insert it at the current cursor/selection position
4. WHEN generating HTML from the editor THEN the system SHALL extract the innerHTML and preserve all content structure
5. WHEN the editor contains images THEN the system SHALL maintain their Base64 data URLs in the final HTML
