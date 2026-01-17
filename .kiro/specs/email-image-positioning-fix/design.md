# Design Document

## Overview

メール送信時に画像が本文の最後に配置されてしまう問題を解決します。現在の実装では、バックエンドで画像を抽出・置換する際に複雑なロジック（署名検出、画像の再配置など）が実行されており、これが画像位置の喪失を引き起こしています。

本設計では、フロントエンドのRichTextEmailEditorから送信されるHTML構造をそのまま保持し、画像のdata:image URLをCID参照に変換する際も、その場で置換することで位置を維持します。

## Architecture

### Current Flow (Problem)

```
1. User pastes image at cursor position in RichTextEmailEditor
   ↓
2. Image inserted as <img src="data:image/..."> at correct position
   ↓
3. Editor HTML sent to backend: "<p>Text</p><img src="data:..."/><p>More text</p>"
   ↓
4. Backend extracts images and stores them separately
   ↓
5. Backend generates new HTML with images inserted before signature
   ↓
6. Result: Images appear at wrong position (end of email)
```

### New Flow (Solution)

```
1. User pastes image at cursor position in RichTextEmailEditor
   ↓
2. Image inserted as <img src="data:image/..."> at correct position
   ↓
3. Editor HTML sent to backend: "<p>Text</p><img src="data:..."/><p>More text</p>"
   ↓
4. Backend performs IN-PLACE replacement: data:image → cid:
   Result: "<p>Text</p><img src="cid:image-0"/><p>More text</p>"
   ↓
5. Backend wraps in minimal HTML template (preserving structure)
   ↓
6. Backend creates multipart message with inline images
   ↓
7. Result: Images appear at correct position
```

## Components and Interfaces

### 1. Backend: EmailService.supabase.ts

#### Current Implementation Issues

1. **複雑な画像挿入ロジック**: `generateHtmlBodyWithImages()` メソッドが署名を検出して画像を挿入
2. **位置情報の喪失**: 画像を抽出してから別の場所に挿入するため、元の位置が失われる
3. **二重処理**: `sendTemplateEmail()` と `sendEmailWithImages()` で異なる処理フロー

#### New Implementation

**Key Changes:**

1. **In-place replacement**: `String.replace()` with callback function to replace data:image URLs with CID references at their exact positions
2. **Simple HTML wrapping**: Wrap processed HTML in minimal template without restructuring
3. **Unified processing**: Same logic for both `sendTemplateEmail()` and `sendEmailWithImages()`

```typescript
// 新しい画像処理フロー
async sendEmailWithImages(params: EmailWithImagesParams): Promise<EmailResult> {
  // 1. Check for embedded images in body
  const hasEmbeddedImages = /<img[^>]+src="data:image\/[^"]+"/i.test(params.body);
  
  if (hasEmbeddedImages) {
    // 2. Extract and replace inline (preserving position)
    const inlineImages: EmailAttachment[] = [];
    let processedBody = params.body;
    let imageIndex = 0;
    
    // Replace data:image URLs with CID references IN-PLACE
    processedBody = processedBody.replace(
      /<img([^>]*)src="data:image\/([^;]+);base64,([^"]+)"([^>]*)>/gi,
      (fullMatch, beforeSrc, mimeType, base64Data, afterSrc) => {
        try {
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Size check
          if (imageBuffer.length > MAX_SIZE) {
            console.warn(`Skipping image ${imageIndex}: too large`);
            return fullMatch; // Keep original tag
          }
          
          const cid = `image-${imageIndex}`;
          
          inlineImages.push({
            filename: `image-${imageIndex}.${mimeType}`,
            mimeType: `image/${mimeType}`,
            data: imageBuffer,
            cid: cid,
          });
          
          console.log(`✅ Extracted image ${imageIndex}: ${imageBuffer.length} bytes, CID: ${cid}`);
          imageIndex++;
          
          // Replace with CID reference at SAME position
          return `<img${beforeSrc}src="cid:${cid}"${afterSrc}>`;
        } catch (error) {
          console.error(`Error processing image ${imageIndex}:`, error);
          return fullMatch; // Keep original tag on error
        }
      }
    );
    
    console.log(`✅ Processed ${inlineImages.length} images`);
    console.log(`📄 Processed HTML preview:`, processedBody.substring(0, 500));
    
    // 3. Wrap in minimal HTML template (preserving structure)
    const htmlBody = this.wrapInEmailTemplate(processedBody);
    
    // 4. Create multipart message
    const message = this.createMultipartMessage(
      params.from,
      params.to,
      params.subject,
      htmlBody,
      inlineImages
    );
    
    // 5. Send email
    const result = await this.sendGmailMessage(message);
    
    return result;
  }
  
  // Handle non-embedded images (existing logic)
  // ...
}
```

#### New Helper Method: wrapInEmailTemplate()

```typescript
/**
 * Wrap processed HTML in minimal email template
 * Does NOT restructure or move content
 */
private wrapInEmailTemplate(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}
```

#### Remove/Simplify Methods

1. **Remove**: `generateHtmlBodyWithImages()` - This method restructures HTML and moves images
2. **Simplify**: `sendTemplateEmail()` - Use same logic as `sendEmailWithImages()`

### 2. Frontend: RichTextEmailEditor.tsx

**No changes required** - The editor already correctly inserts images at cursor position and maintains the HTML structure.

### 3. Frontend: Email Sending Component

**Minimal changes** - Ensure the editor's innerHTML is sent directly to the backend without modification.

```typescript
// In email confirmation dialog
const handleSendEmail = async () => {
  const editorHtml = editorRef.current?.innerHTML || '';
  
  // Send editor HTML directly (no preprocessing)
  await sendEmail({
    to: recipient,
    subject: subject,
    body: editorHtml, // Contains images at correct positions
    // ... other params
  });
};
```

## Data Models

### EmailAttachment Interface

```typescript
interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: Buffer;
  cid: string;
}
```

### EmailWithImagesParams Interface

```typescript
interface EmailWithImagesParams {
  sellerId: string;
  sellerNumber: string;
  to: string;
  subject: string;
  body: string;              // HTML from editor (may contain data:image URLs)
  from: string;
  selectedImages?: Array<{   // Optional: images from Drive/other sources
    id: string;
    name: string;
    source: 'drive' | 'local' | 'url';
    // ... other fields
  }>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Position preservation during replacement

*For any* HTML string containing `<img src="data:image/...">` tags, when replacing data:image URLs with CID references, the resulting HTML should have `<img src="cid:...">` tags at the exact same positions
**Validates: Requirements 2.2**

### Property 2: Image order consistency

*For any* HTML string with multiple images, the order of images in the processed HTML should match the order in the original HTML
**Validates: Requirements 1.3**

### Property 3: Text preservation around images

*For any* HTML string with text before and after an image, the text should remain in the same positions relative to the image after processing
**Validates: Requirements 1.4**

### Property 4: Structure preservation during wrapping

*For any* processed HTML content, wrapping it in an email template should not alter the content structure or element positions
**Validates: Requirements 2.4**

### Property 5: Graceful degradation on error

*For any* image that fails processing (size limit, extraction error), the system should keep the original img tag and continue processing other images
**Validates: Requirements 5.2**

## Error Handling

### Image Processing Errors

1. **Image Too Large**
   - Detection: `imageBuffer.length > 5 * 1024 * 1024`
   - Response: Log warning, keep original `<img>` tag
   - Recovery: Continue processing other images

2. **Base64 Decoding Error**
   - Detection: `Buffer.from()` throws exception
   - Response: Log error, keep original `<img>` tag
   - Recovery: Continue processing other images

3. **Invalid Image Format**
   - Detection: MIME type not recognized
   - Response: Log warning, keep original `<img>` tag
   - Recovery: Continue processing other images

### Email Sending Errors

1. **Gmail API Error**
   - Detection: API returns error status
   - Response: Return error in EmailResult
   - Recovery: User can retry

2. **No Images Detected**
   - Detection: `hasEmbeddedImages === false`
   - Response: Send as simple HTML email
   - Recovery: Automatic fallback

## Testing Strategy

### Unit Tests

1. **In-place Replacement**
   - Test single image replacement preserves position
   - Test multiple images maintain order
   - Test text around images is preserved
   - Test malformed data URLs are skipped

2. **HTML Wrapping**
   - Test template wrapping preserves content
   - Test no restructuring occurs
   - Test special characters are handled

3. **Error Handling**
   - Test oversized images are skipped
   - Test invalid Base64 is handled
   - Test processing continues after error

### Integration Tests

1. **End-to-End Image Position**
   - Create HTML with image at start
   - Verify image stays at start after processing
   - Create HTML with image in middle
   - Verify image stays in middle after processing
   - Create HTML with image at end
   - Verify image stays at end after processing

2. **Multiple Images**
   - Create HTML with 3 images at different positions
   - Verify all 3 images maintain their positions
   - Verify relative order is preserved

### Manual Testing

1. **Real Email Clients**
   - Send test email with images at various positions
   - Check in Gmail web interface
   - Check in Outlook
   - Check in mobile email clients

2. **Edge Cases**
   - Very large images (should be skipped)
   - Many images (10+)
   - Images with special characters in data URL
   - Mixed embedded and selected images

## Implementation Plan

### Phase 1: Backend Refactoring

1. Modify `sendEmailWithImages()` to use in-place replacement
2. Add `wrapInEmailTemplate()` helper method
3. Remove `generateHtmlBodyWithImages()` method
4. Update `sendTemplateEmail()` to use same logic
5. Add comprehensive logging

### Phase 2: Testing

1. Write unit tests for replacement logic
2. Write integration tests for position preservation
3. Manual testing with real email clients

### Phase 3: Cleanup

1. Remove unused code
2. Update documentation
3. Add inline comments

## Logging Strategy

### Debug Logs

```typescript
console.log('🔍 Checking for embedded images...');
console.log('📄 Body preview:', body.substring(0, 200));
console.log('✅ Found embedded images, processing...');
console.log(`📸 Extracted image ${index}: ${size} bytes, CID: ${cid}`);
console.log(`✅ Processed ${count} images`);
console.log('📄 Processed HTML preview:', html.substring(0, 500));
console.log('📧 Sending multipart email...');
console.log(`✅ Email sent: ${messageId}`);
```

### Error Logs

```typescript
console.warn(`⚠️ Skipping image ${index}: size ${size} exceeds limit`);
console.error(`❌ Error processing image ${index}:`, error);
console.error('❌ Email send failed:', error);
```

## Performance Considerations

1. **Regex Performance**: The `replace()` operation with regex is O(n) where n is the HTML length
2. **Memory Usage**: Images are processed one at a time, not all loaded into memory at once
3. **Base64 Decoding**: Efficient Buffer operations, minimal overhead

## Security Considerations

1. **Size Limits**: Enforce 5MB per image, 10MB total to prevent abuse
2. **MIME Type Validation**: Only allow image/* MIME types
3. **Base64 Validation**: Catch and handle invalid Base64 data
4. **HTML Injection**: No user input is used to construct HTML structure (only wrapping)

