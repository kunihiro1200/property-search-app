# Design Document

## Overview

メール送信確認画面にリッチテキストエディタ（contentEditable）を導入し、クリップボードからの画像をカーソル位置に直接貼り付けられる機能を追加します。ユーザーがCtrl+V（またはCmd+V）を押すことで、クリップボード内の画像データをカーソル位置に挿入できるようにします。貼り付けられた画像はBase64エンコードされ、HTMLメールの一部として送信されます。

## Implementation Approach

**Phase 1 (Minimal - Current Implementation)**: contentEditableを使用したシンプルな実装
- contentEditable divを使用
- Ctrl+Vで画像をカーソル位置に挿入
- シンプルなHTML生成
- 実装期間: 1-2日

**Phase 2 (Future Enhancement)**: 軽量ライブラリの統合
- TipTapやQuillなどの軽量エディタライブラリを統合
- 太字、リンクなどの書式設定機能を追加
- 実装期間: 3-5日

本設計書ではPhase 1の実装に焦点を当てます。

## Architecture

### Component Structure

```
EmailConfirmationDialog (既存)
├── RichTextEmailEditor (新規コンポーネント - contentEditable div)
│   ├── contentEditable div - テキストと画像を含む
│   ├── onPaste handler - 画像をカーソル位置に挿入
│   ├── Placeholder text - "メール本文を入力..."
│   └── Helper text - "Ctrl+Vで画像を貼り付けられます（カーソル位置に挿入）"
└── Submit button - HTML contentを含めて送信
```

**Note**: PastedImagePreviewコンポーネントは不要になります。画像はエディタ内に直接表示されます。

### Data Flow

1. User pastes image (Ctrl+V) → `onPaste` event triggered on contentEditable div
2. Extract image from clipboard → `ClipboardEvent.clipboardData`
3. Validate image (size, type) → Validation logic
4. Convert to Base64 → `FileReader.readAsDataURL()`
5. Get current cursor position → `window.getSelection()` and `Range`
6. Insert `<img>` tag at cursor position → `document.execCommand('insertHTML')` or Range API
7. Image appears inline in editor → User sees image immediately
8. On submit → Extract innerHTML from contentEditable div
9. Send HTML content → Backend processes HTML email with embedded images

## Components and Interfaces

### 1. RichTextEmailEditor Component

新しいコンポーネントを作成して、contentEditableベースのリッチテキストエディタを実装します。

```typescript
interface RichTextEmailEditorProps {
  value: string;                 // HTML content
  onChange: (html: string) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  maxImageSize?: number;         // 5MB default
  maxTotalImageSize?: number;    // 10MB default
}
```

**Features:**
- contentEditable div for rich text editing
- Paste handler for images at cursor position
- Validation for image size limits
- Inline image display with proper styling
- Delete images using Backspace/Delete key
- Extract HTML content for email sending

### 2. Paste Handler Implementation

contentEditable divに`onPaste`ハンドラーを追加します。

```typescript
const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  // Find image items in clipboard
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      event.preventDefault(); // Prevent default paste behavior
      
      const file = item.getAsFile();
      if (file) {
        await insertImageAtCursor(file);
      }
    }
  }
};
```

### 3. Image Insertion at Cursor Position

```typescript
const insertImageAtCursor = async (file: File): Promise<void> => {
  // 1. Validate file size
  if (file.size > MAX_SINGLE_IMAGE_SIZE) {
    showError('画像サイズが5MBを超えています');
    return;
  }

  // 2. Check total size of all images in editor
  const existingImages = editorRef.current?.querySelectorAll('img') || [];
  const currentTotalSize = Array.from(existingImages).reduce((sum, img) => {
    // Estimate size from data URL length (rough approximation)
    const dataUrl = img.src;
    return sum + (dataUrl.length * 0.75); // Base64 is ~33% larger than binary
  }, 0);
  
  if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
    showError('合計画像サイズが10MBを超えています');
    return;
  }

  // 3. Read file as Data URL
  const dataUrl = await readFileAsDataURL(file);

  // 4. Get current selection/cursor position
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    showError('カーソル位置が取得できませんでした');
    return;
  }

  // 5. Create img element
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = `pasted-image-${Date.now()}`;
  img.style.maxWidth = '100%';
  img.style.height = 'auto';
  img.style.display = 'block';
  img.style.margin = '10px 0';
  img.style.border = '1px solid #ddd';
  img.style.borderRadius = '4px';

  // 6. Insert at cursor position
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(img);
  
  // 7. Move cursor after image
  range.setStartAfter(img);
  range.setEndAfter(img);
  selection.removeAllRanges();
  selection.addRange(range);

  // 8. Trigger onChange to update parent state
  if (editorRef.current) {
    onChange(editorRef.current.innerHTML);
  }
};
```

### 4. Email Sending Integration

メール送信時に、contentEditableのHTMLコンテンツをそのまま使用します。

```typescript
const generateEmailHtmlFromEditor = (editorHtml: string): string => {
  // contentEditableのHTMLをそのまま使用
  // 必要に応じて基本的なHTMLメール構造でラップ
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  ${editorHtml}
</body>
</html>`;

  return html;
};

// 使用例
const handleSendEmail = async () => {
  const editorHtml = editorRef.current?.innerHTML || '';
  const emailHtml = generateEmailHtmlFromEditor(editorHtml);
  
  await sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: emailHtml,
  });
};
```

## Data Models

### Email Payload

既存のメール送信APIペイロードを使用します。

```typescript
interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;                // Plain text fallback
  htmlBody?: string;           // HTML形式の本文（contentEditableから生成、画像埋め込み済み）
  attachments?: ImageFile[];   // 既存: Google Driveからの添付ファイル
}
```

### Editor State

```typescript
interface EditorState {
  htmlContent: string;         // contentEditableのinnerHTML
  totalImageSize: number;      // 現在の画像の合計サイズ（概算）
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Clipboard image extraction

*For any* paste event containing image data, the system should successfully extract the image and convert it to a Base64 data URL
**Validates: Requirements 1.1**

### Property 2: Image size validation

*For any* pasted image, if the image size exceeds 5MB, the system should reject it and display an error message
**Validates: Requirements 3.2**

### Property 3: Total size limit enforcement

*For any* set of pasted images, if adding a new image would cause the total size to exceed 10MB, the system should prevent the addition and display an error
**Validates: Requirements 3.3**

### Property 4: Base64 encoding correctness

*For any* pasted image, the generated Base64 data URL should start with `data:image/[type];base64,` followed by valid Base64 data
**Validates: Requirements 5.1**

### Property 5: Image deletion consistency

*For any* pasted image, when the user clicks the delete button, the image should be removed from both the preview and the internal state
**Validates: Requirements 1.5**

### Property 6: HTML email generation

*For any* email with pasted images, the generated HTML should contain `<img>` tags with Base64 data URLs for all pasted images
**Validates: Requirements 5.2, 5.3**

### Property 7: Non-image clipboard rejection

*For any* paste event containing non-image data, the system should not process it and should display an appropriate error message
**Validates: Requirements 3.1**

## Error Handling

### Client-Side Errors

1. **No Image in Clipboard**
   - Detection: `clipboardData.items` contains no image types
   - Response: Display error "クリップボードに画像データがありません"
   - Recovery: User can try pasting again

2. **Image Too Large**
   - Detection: `file.size > 5 * 1024 * 1024`
   - Response: Display error "画像サイズが5MBを超えています"
   - Recovery: User can paste a smaller image

3. **Total Size Exceeded**
   - Detection: `totalSize + newImageSize > 10 * 1024 * 1024`
   - Response: Display error "合計画像サイズが10MBを超えています"
   - Recovery: User can delete existing images before pasting new ones

4. **File Read Error**
   - Detection: `FileReader.onerror` triggered
   - Response: Display error "画像の読み込みに失敗しました"
   - Recovery: User can try pasting again

5. **Invalid Image Format**
   - Detection: Image fails to load or has invalid dimensions
   - Response: Display error "無効な画像形式です"
   - Recovery: User can paste a different image

### Server-Side Errors

1. **Email Send Failure**
   - Detection: API returns error status
   - Response: Display error message from server
   - Recovery: User can retry sending

2. **HTML Generation Error**
   - Detection: Exception during HTML generation
   - Response: Log error, send plain text email instead
   - Recovery: Automatic fallback to plain text

## Testing Strategy

### Unit Tests

1. **Clipboard Image Extraction**
   - Test extracting PNG image from clipboard
   - Test extracting JPEG image from clipboard
   - Test handling clipboard with no image data
   - Test handling clipboard with multiple items

2. **Image Validation**
   - Test rejecting images over 5MB
   - Test accepting images under 5MB
   - Test total size limit enforcement
   - Test valid image format detection

3. **Base64 Encoding**
   - Test converting File to Base64 data URL
   - Test data URL format correctness
   - Test handling encoding errors

4. **HTML Generation**
   - Test generating HTML with single image
   - Test generating HTML with multiple images
   - Test HTML structure and styling
   - Test preserving text formatting

### Integration Tests

1. **End-to-End Paste Flow**
   - Simulate paste event with image
   - Verify image appears in preview
   - Verify image is included in email payload
   - Verify email sends successfully

2. **Error Scenarios**
   - Test pasting oversized image
   - Test exceeding total size limit
   - Test pasting non-image data
   - Test network errors during send

### Manual Testing

1. **Browser Compatibility**
   - Test in Chrome, Firefox, Safari, Edge
   - Test on Windows and macOS
   - Test keyboard shortcuts (Ctrl+V, Cmd+V)

2. **User Experience**
   - Test paste feedback (loading, success, error)
   - Test image preview display
   - Test delete functionality
   - Test email rendering in various email clients

### Property-Based Tests

We will use `fast-check` for property-based testing in TypeScript.

1. **Property Test: Image size validation**
   - Generate random image sizes
   - Verify validation logic correctly accepts/rejects based on size

2. **Property Test: Base64 encoding**
   - Generate random image data
   - Verify all encoded data URLs have correct format

3. **Property Test: HTML generation**
   - Generate random sets of pasted images
   - Verify generated HTML contains correct number of `<img>` tags

4. **Property Test: Total size calculation**
   - Generate random sets of images with various sizes
   - Verify total size is calculated correctly
