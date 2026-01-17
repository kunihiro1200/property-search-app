# Requirements Document

## Introduction

This feature addresses the issue where images pasted into email templates at specific positions are sent as attachments at the bottom of the email instead of being embedded inline at the intended positions. Users can paste images anywhere in the email body using the rich text editor, but the current implementation converts these inline images to file attachments, breaking the intended layout.

## Glossary

- **Email System**: The application's email composition and sending functionality
- **Rich Text Editor**: The contentEditable-based email composition interface that supports image pasting
- **Inline Image**: An image embedded directly within the HTML email body at a specific position
- **Attachment**: A file attached to an email separately from the body content
- **Data URL**: A base64-encoded representation of an image embedded directly in HTML
- **CID (Content-ID)**: A MIME multipart reference method for embedding images in emails
- **Multipart Email**: An email with multiple MIME parts (text, HTML, attachments, inline images)

## Requirements

### Requirement 1

**User Story:** As a user composing an email, I want images I paste into the email body to appear at the exact position where I pasted them in the sent email, so that my email layout matches my intended design.

#### Acceptance Criteria

1. WHEN a user pastes an image at a specific cursor position in the rich text editor THEN the Email System SHALL preserve that image's position in the sent email
2. WHEN the Email System sends an email with inline images THEN the Email System SHALL embed images using either Data URLs or CID references within the HTML body
3. WHEN multiple images are pasted at different positions THEN the Email System SHALL maintain the relative order and positioning of all images
4. WHEN an email contains both text and images THEN the Email System SHALL preserve the interleaving of text and images as composed
5. WHEN the sent email is viewed in email clients THEN the images SHALL appear inline at their intended positions rather than as separate attachments

### Requirement 2

**User Story:** As a developer, I want the email sending service to correctly handle inline images from the rich text editor, so that the MIME multipart structure preserves image positioning.

#### Acceptance Criteria

1. WHEN the EmailService receives HTML content with embedded images THEN the EmailService SHALL detect inline images within the HTML
2. WHEN creating a multipart email message THEN the EmailService SHALL use appropriate MIME structure for inline images (multipart/related or Data URLs)
3. WHEN using CID references THEN the EmailService SHALL generate unique Content-IDs for each inline image and reference them correctly in the HTML
4. WHEN using Data URLs THEN the EmailService SHALL preserve the base64-encoded image data within the HTML body
5. WHEN the email size exceeds reasonable limits THEN the EmailService SHALL provide appropriate error messages to the user

### Requirement 3

**User Story:** As a user, I want to preview how my email will look before sending, so that I can verify image positioning is correct.

#### Acceptance Criteria

1. WHEN a user composes an email with inline images THEN the Email System SHALL display a preview that accurately reflects the final email layout
2. WHEN the preview is rendered THEN the Email System SHALL show images at their exact positions within the text
3. WHEN the user switches between edit and preview modes THEN the Email System SHALL maintain image positions consistently
4. WHEN images fail to load in preview THEN the Email System SHALL display appropriate placeholder indicators

### Requirement 4

**User Story:** As a system administrator, I want the email system to handle image size limits appropriately, so that emails remain deliverable and performant.

#### Acceptance Criteria

1. WHEN calculating total email size THEN the Email System SHALL include the size of all inline images
2. WHEN the total email size exceeds 10MB THEN the Email System SHALL prevent sending and display a warning message
3. WHEN individual images exceed 5MB THEN the Email System SHALL prevent insertion and display a warning message
4. WHEN using Data URLs THEN the Email System SHALL account for base64 encoding overhead (approximately 33% size increase)
5. WHERE email size limits are approached THEN the Email System SHALL suggest converting inline images to attachments or reducing image quality
