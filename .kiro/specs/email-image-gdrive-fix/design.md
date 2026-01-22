# Design Document

## Overview

This design addresses the inline image positioning issue in email composition and sending. The current implementation treats pasted images as file attachments, causing them to appear at the bottom of emails rather than at their intended positions within the text. The solution involves modifying the email generation pipeline to properly handle inline images using either Data URLs (for smaller images) or CID references (for larger images) within the MIME multipart structure.

## Architecture

### Current Flow (Problematic)
```
RichTextEmailEditor (images as <img> with data URLs)
  ↓
EmailService.sendEmailWithImages()
  ↓
ImageProcessorService (extracts images from HTML)
  ↓
createMultipartMessage() (treats images as attachments)
  ↓
Gmail API (images appear at bottom)
```

### Proposed Flow (Fixed)
```
RichTextEmailEditor (images as <img> with data URLs)
  ↓
EmailService.sendEmailWithImages()
  ↓
InlineImageProcessor (detects and processes inline images)
  ↓
createMultipartRelatedMessage() (embeds images with CID or keeps Data URLs)
  ↓
Gmail API (images appear at intended positions)
```

## Components and Interfaces

### 1. InlineImageProcessor

A new service responsible for detecting and processing inline images within HTML content.

```typescript
interface InlineImage {
  id: string;              // Unique identifier for CID reference
  dataUrl: string;         // Original data URL from editor
  mimeType: string;        // Image MIME type (image/jpeg, image/png, etc.)
  data: Buffer;            // Binary image data
  size: number;            // Size in bytes
  position: number;        // Position in HTML (for ordering)
}

interface ProcessedHtml {
  html: string;                    // HTML with CID references or Data URLs
  inlineImages: InlineImage[];     // Array of inline images to embed
  totalSize: number;               // Total size of all images
  useDataUrls: boolean;            // Whether to use Data URLs vs CID
}

class InlineImageProcessor {
  /**
   * Process HTML content and extract inline images
   */
  processHtmlWithImages(html: string): ProcessedHtml;
  
  /**
   * Convert data URL to binary data
   */
  dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string };
  
  /**
   * Generate unique Content-ID for image
   */
  generateContentId(): string;
  
  /**
   * Replace data URLs with CID references in HTML
   */
  replaceDataUrlsWithCids(html: string, images: InlineImage[]): string;
  
  /**
   * Determine whether to use Data URLs or CID based on size
   */
  shouldUseDataUrls(totalSize: number): boolean;
}
```

### 2. EmailService (Modified)

Update the EmailService to handle inline images correctly.

```typescript
class EmailService {
  private inlineImageProcessor: InlineImageProcessor;
  
  /**
   * Send email with inline images (modified)
   */
  async sendEmailWithImages(params: EmailWithImagesParams): Promise<EmailResult>;
  
  /**
   * Create multipart/related message for inline images (new)
   */
  private createMultipartRelatedMessage(
    to: string,
    from: string,
    subject: string,
    html: string,
    inlineImages: InlineImage[]
  ): string;
  
  /**
   * Create message with Data URLs embedded in HTML (new)
   */
  private createHtmlMessageWithDataUrls(
    to: string,
    from: string,
    subject: string,
    html: string
  ): string;
}
```

### 3. RichTextEmailEditor (No Changes Required)

The editor already correctly embeds images as Data URLs in the HTML. No modifications needed.

## Data Models

### InlineImage
```typescript
interface InlineImage {
  id: string;              // Format: "image-{timestamp}-{random}"
  dataUrl: string;         // Format: "data:image/png;base64,..."
  mimeType: string;        // Examples: "image/jpeg", "image/png", "image/gif"
  data: Buffer;            // Binary image data
  size: number;            // Size in bytes
  position: number;        // Character position in HTML
}
```

### ProcessedHtml
```typescript
interface ProcessedHtml {
  html: string;                    // Modified HTML with CID refs or original Data URLs
  inlineImages: InlineImage[];     // Images to embed as multipart
  totalSize: number;               // Sum of all image sizes
  useDataUrls: boolean;            // true if total < 2MB, false otherwise
}
```

### MIME Structure for CID References
```
multipart/related
├── multipart/alternative
│   ├── text/plain (fallback)
│   └── text/html (with cid: references)
└── image/* (inline, with Content-ID headers)
    ├── Content-Type: image/jpeg
    ├── Content-Transfer-Encoding: base64
    ├── Content-ID: <image-123456@example.com>
    └── Content-Disposition: inline
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Image Position Preservation
*For any* email HTML with inline images at specific positions, sending the email should result in images appearing at those same positions in the received email.
**Validates: Requirements 1.1, 1.3, 1.4**

### Property 2: Image Embedding Correctness
*For any* inline image in the HTML, the image should be embedded using either a valid Data URL or a valid CID reference that resolves to the correct image data.
**Validates: Requirements 1.2, 2.2, 2.3**

### Property 3: Size Limit Enforcement
*For any* email composition with inline images, if the total size exceeds 10MB or any individual image exceeds 5MB, the system should prevent sending and display an error.
**Validates: Requirements 4.2, 4.3**

### Property 4: MIME Structure Validity
*For any* email with inline images using CID references, the generated MIME structure should be valid according to RFC 2387 (multipart/related).
**Validates: Requirements 2.2, 2.3**

### Property 5: Preview Accuracy
*For any* email composition, the preview display should match the final sent email layout, including image positions.
**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

### Image Size Errors
- **Individual Image > 5MB**: Display error immediately on paste, prevent insertion
- **Total Size > 10MB**: Display error on send attempt, prevent sending
- **Error Message Format**: "画像サイズが制限を超えています: {current}MB / {limit}MB"

### MIME Generation Errors
- **Invalid Data URL**: Log error, skip image, continue with remaining content
- **CID Generation Failure**: Fall back to Data URL method
- **Buffer Conversion Error**: Display user-friendly error, prevent sending

### Email Client Compatibility
- **Data URL Not Supported**: Provide fallback text "[画像]" in plain text version
- **CID Reference Broken**: Include alt text in img tags for accessibility
- **Large Email Rejected by Server**: Catch Gmail API error, suggest reducing image count/size

## Testing Strategy

### Unit Tests
- Test InlineImageProcessor.dataUrlToBuffer() with various image formats
- Test InlineImageProcessor.generateContentId() for uniqueness
- Test InlineImageProcessor.shouldUseDataUrls() with different size thresholds
- Test EmailService.createMultipartRelatedMessage() MIME structure validity
- Test size calculation including base64 overhead

### Property-Based Tests
Property-based tests will use a JavaScript PBT library (fast-check) to verify universal properties across many randomly generated inputs.

**Property 1: Image Position Preservation**
- Generate random HTML with images at various positions
- Send email and parse received HTML
- Verify image positions match original positions
- **Feature: email-image-gdrive-fix, Property 1: Image Position Preservation**

**Property 2: Image Embedding Correctness**
- Generate random images with various formats and sizes
- Embed in HTML and process
- Verify all images are correctly embedded (Data URL or CID)
- Verify image data integrity (decode and compare)
- **Feature: email-image-gdrive-fix, Property 2: Image Embedding Correctness**

**Property 3: Size Limit Enforcement**
- Generate random combinations of images with varying sizes
- Test both under and over limits
- Verify errors are thrown when limits exceeded
- Verify no errors when within limits
- **Feature: email-image-gdrive-fix, Property 3: Size Limit Enforcement**

**Property 4: MIME Structure Validity**
- Generate random emails with inline images
- Parse generated MIME structure
- Verify structure conforms to RFC 2387
- Verify all CID references resolve correctly
- **Feature: email-image-gdrive-fix, Property 4: MIME Structure Validity**

### Integration Tests
- Test complete flow from editor paste to email send
- Test with real Gmail API (sandbox environment)
- Test email rendering in multiple email clients (Gmail, Outlook, Apple Mail)
- Test with mixed content (text, images, links, formatting)

### Manual Testing
- Paste images at various positions in email body
- Send test emails to multiple email clients
- Verify images appear at correct positions
- Test with different image formats (JPEG, PNG, GIF)
- Test with various image sizes
- Test with multiple images in single email

## Implementation Notes

### Data URL vs CID Decision Logic
```typescript
// Use Data URLs if total size < 2MB (better compatibility, simpler)
// Use CID references if total size >= 2MB (better performance, smaller email)
const DATAURL_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

function shouldUseDataUrls(totalSize: number): boolean {
  return totalSize < DATAURL_SIZE_THRESHOLD;
}
```

### CID Reference Format
```typescript
// Generate unique Content-ID
function generateContentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `image-${timestamp}-${random}@seller-management.local`;
}

// HTML reference format
<img src="cid:image-1234567890-abc123@seller-management.local" alt="..." />
```

### MIME Multipart Structure
```
Content-Type: multipart/related; boundary="boundary-main"

--boundary-main
Content-Type: multipart/alternative; boundary="boundary-alt"

--boundary-alt
Content-Type: text/plain; charset=utf-8

[Plain text version]

--boundary-alt
Content-Type: text/html; charset=utf-8

<html>
  <body>
    <p>Text content</p>
    <img src="cid:image-123@example.com" alt="Image" />
  </body>
</html>

--boundary-alt--

--boundary-main
Content-Type: image/jpeg
Content-Transfer-Encoding: base64
Content-ID: <image-123@example.com>
Content-Disposition: inline

[Base64 encoded image data]

--boundary-main--
```

### Backward Compatibility
- Existing emails with attachments continue to work
- Gradual migration: new emails use inline images, old emails unchanged
- No database schema changes required
- No breaking changes to API contracts

## Performance Considerations

### Image Processing
- Process images asynchronously to avoid blocking UI
- Cache processed images during composition session
- Limit concurrent image processing to 3 images at a time

### Email Size
- Monitor total email size during composition
- Display size indicator to user
- Warn when approaching 10MB limit
- Suggest image compression or reduction

### Gmail API Rate Limits
- Respect Gmail API quotas (250 emails per day for free accounts)
- Implement exponential backoff for rate limit errors
- Queue emails if rate limit reached

## Security Considerations

### XSS Prevention
- Sanitize HTML content before sending
- Validate image Data URLs (must start with "data:image/")
- Escape user-provided alt text and filenames

### Data URL Validation
```typescript
function isValidImageDataUrl(dataUrl: string): boolean {
  const pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  return pattern.test(dataUrl);
}
```

### Size Limits (DoS Prevention)
- Enforce 5MB per image limit
- Enforce 10MB total email limit
- Prevent memory exhaustion from large base64 strings

## Migration Strategy

### Phase 1: Implement InlineImageProcessor
- Create new service with unit tests
- No changes to existing functionality

### Phase 2: Update EmailService
- Add new createMultipartRelatedMessage method
- Keep existing createMultipartMessage for backward compatibility
- Add feature flag to toggle between old and new behavior

### Phase 3: Testing and Rollout
- Test with internal users first
- Monitor error rates and email delivery success
- Gradually enable for all users

### Phase 4: Cleanup
- Remove old createMultipartMessage method
- Remove feature flag
- Update documentation
