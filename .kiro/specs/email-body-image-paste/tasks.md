# Implementation Tasks

## Phase 1: Rich Text Editor with Cursor Position Insertion

### Task Group 1: Create RichTextEmailEditor Component

- [x] 1. Create RichTextEmailEditor component




  - [ ] 1.1 Create component file `frontend/src/components/RichTextEmailEditor.tsx`
    - Create contentEditable div as the main editor
    - Accept `value`, `onChange`, `placeholder`, `helperText` props
    - Style the editor to look like a text field
    - Add focus/blur states

    - _Requirements: 6.1, 6.2_

  - [ ] 1.2 Implement controlled component behavior
    - Sync `value` prop with contentEditable innerHTML
    - Call `onChange` when content changes

    - Handle edge cases (empty content, initial value)
    - _Requirements: 6.2_

  - [ ] 1.3 Add helper text and placeholder
    - Show "Ctrl+Vで画像を貼り付けられます（カーソル位置に挿入）" as helper text




    - Show placeholder when editor is empty
    - _Requirements: 4.4_

### Task Group 2: Implement Image Insertion at Cursor Position


- [ ] 2. Implement paste handler for images
  - [ ] 2.1 Add onPaste handler to contentEditable div
    - Detect image data in clipboard
    - Prevent default paste behavior for images
    - Extract File from clipboard
    - _Requirements: 1.1_


  - [ ] 2.2 Implement `insertImageAtCursor` function
    - Get current selection and range using `window.getSelection()`
    - Create `<img>` element with Base64 data URL
    - Insert image at cursor position using Range API
    - Move cursor after inserted image

    - Apply inline styles to image (max-width, border, etc.)
    - _Requirements: 1.2, 1.3_

  - [ ] 2.3 Add image validation before insertion
    - Validate single image size (max 5MB)
    - Calculate total size of existing images in editor

    - Validate total size (max 10MB)
    - Show error messages for validation failures
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Add loading state during image processing

    - Show loading indicator while reading file
    - Disable editor during processing
    - _Requirements: 4.1_

### Task Group 3: Image Management in Editor

- [ ] 3. Implement image deletion
  - [x] 3.1 Allow users to select and delete images




    - Images can be selected by clicking
    - Delete key removes selected image
    - Backspace key removes image before cursor
    - _Requirements: 1.5_


  - [ ] 3.2 Update total size calculation after deletion
    - Recalculate total image size
    - Update validation state
    - _Requirements: 3.3_




### Task Group 4: Integration with Email Sending





- [ ] 4. Replace TextField with RichTextEmailEditor
  - [ ] 4.1 Locate email body TextField in CallModePage or email dialog
    - Find where email body is currently rendered
    - Replace TextField with RichTextEmailEditor component
    - Update state management to store HTML content

    - _Requirements: 6.1_

  - [ ] 4.2 Update email sending logic
    - Extract HTML content from editor (innerHTML)
    - Pass HTML content to email sending function
    - Keep plain text version as fallback
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 4.3 Clear editor after successful send
    - Reset editor content to empty
    - Clear any error states
    - _Requirements: 2.4_

### Task Group 5: HTML Email Generation

- [ ] 5. Update HTML email generation utility
  - [ ] 5.1 Modify `generateEmailHtmlFromEditor` function
    - Accept HTML content from contentEditable
    - Wrap content in proper HTML email structure
    - Preserve image positions and Base64 data URLs
    - Apply email-safe CSS styles
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 5.2 Generate plain text fallback
    - Extract text content from HTML (strip images)
    - Preserve line breaks
    - Add note about images for plain text clients
    - _Requirements: 2.1_

  - [ ]* 5.3 Write unit tests for HTML generation
    - Test with no images (plain text only)
    - Test with single image
    - Test with multiple images at different positions

    - Test HTML structure and img tag format
    - _Requirements: 5.2, 5.3, 5.4_

### Task Group 6: Backend Support (Already Complete)


- [x] 6. Backend email service
  - [x] 6.1 EmailService supports HTML body
    - Gmail API supports HTML emails


    - _Requirements: 2.1, 2.2_
    - **COMPLETED**: Gmail API supports HTML

  - [x] 6.2 EmailService sends HTML emails
    - Uses `htmlBody` parameter
    - Proper MIME type for HTML emails
    - _Requirements: 2.1, 2.2, 2.3_
    - **COMPLETED**: EmailService.supabase.ts updated

  - [x] 6.3 Request body size limit increased
    - Express body size limit set to 50mb
    - _Requirements: 2.1_
    - **COMPLETED**: Fixed in backend/src/index.ts

### Task Group 7: Error Handling and Polish

- [ ] 7. Implement comprehensive error handling
  - [ ] 7.1 Add error handling for file read failures
    - Catch FileReader errors
    - Display user-friendly error message
    - _Requirements: 3.1_

  - [ ] 7.2 Add error handling for invalid image formats
    - Detect images that fail to load
    - Display error message "無効な画像形式です"
    - _Requirements: 3.1_

  - [ ] 7.3 Add error handling for cursor position issues
    - Handle cases where selection is not available
    - Fallback to appending at end if cursor position fails
    - _Requirements: 1.2_

  - [ ]* 7.4 Write property test for error scenarios
    - **Property 7: Non-image clipboard rejection**
    - **Validates: Requirements 3.1**

- [ ] 8. Add utility functions (reuse existing)
  - [x] 8.1 `formatFileSize(bytes)` utility
    - **COMPLETED**: Already exists in clipboard utils
    - _Requirements: 1.3_

  - [x] 8.2 `readFileAsDataURL(file)` utility
    - **COMPLETED**: Already exists in clipboard utils
    - _Requirements: 1.1_

  - [ ]* 8.3 Write unit tests for utilities
    - Test formatFileSize with various inputs
    - Test readFileAsDataURL with valid/invalid files
    - _Requirements: 1.3_

### Task Group 8: Fix Image Positioning Issue

- [x] 8. Debug and fix image positioning at cursor
  - [x] 8.1 Investigate cursor position detection
    - Identified issue: async image loading causes selection to be lost
    - Selection needs to be saved before async operation
    - _Requirements: 1.2_

  - [x] 8.2 Fix cursor position fallback logic
    - Save selection range before async image loading
    - Restore selection after image is loaded
    - Add fallback to append at end if selection cannot be restored
    - Ensure editor is focused before inserting image
    - _Requirements: 1.2, 7.3_

  - [x] 8.3 Verify image insertion in DOM
    - Added console logging to track selection and insertion
    - Logs show: selection state, range restoration, insertion point
    - Check browser console for debug output when pasting
    - _Requirements: 1.2, 1.3_
    
  - [ ] 8.6 Debug with console logs
    - Open browser DevTools console
    - Paste an image and observe the logs
    - Look for: "Selection saved", "Using saved range", "Image inserted"
    - Check if "No selection available" appears (indicates fallback to end)
    - Share console output if issue persists
    - _Requirements: 1.2_

  - [ ] 8.4 Test and fix browser compatibility
    - Test in Chrome (primary browser)
    - Test in Firefox
    - Test in Edge
    - Handle browser-specific selection API differences
    - _Requirements: 1.2_

  - [x] 8.5 Add explicit cursor positioning
    - Editor focus is restored after image loading
    - Selection is saved and restored properly
    - Fallback logic added for edge cases
    - _Requirements: 1.2, 4.2_

### Task Group 9: Testing and Documentation

- [ ] 9. Manual browser testing
  - [ ] 9.1 Test paste functionality
    - Test in Chrome, Firefox, Safari, Edge
    - Test on Windows (Ctrl+V) and macOS (Cmd+V)
    - Test with various image formats (PNG, JPEG, GIF, WebP)
    - Test with screenshots from different tools
    - _Requirements: All_

  - [ ] 9.2 Test cursor position insertion
    - Paste image at beginning of text
    - Paste image in middle of text
    - Paste image at end of text
    - Paste multiple images at different positions
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 9.3 Test image deletion
    - Select image and press Delete key
    - Use Backspace to delete image
    - Verify content reflows correctly
    - _Requirements: 1.5_

  - [ ] 9.4 Test email rendering
    - Send test emails with images
    - Verify rendering in Gmail, Outlook, etc.
    - Check image positions are preserved
    - _Requirements: 2.2, 5.3, 5.4_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all integration tests
  - Fix any failing tests
  - Ask user if questions arise

- [ ] 11. Update user documentation
  - Add section to user guide about rich text editor
  - Document image pasting at cursor position
  - Include keyboard shortcuts
  - Document size limitations
  - Add troubleshooting tips
  - _Documentation_

---

## 📋 IMPLEMENTATION STATUS

### Previous Implementation (Append at End)
- ✅ Clipboard paste detection and image extraction
- ✅ Image validation (size, format, total limit)
- ✅ Preview component with delete functionality
- ✅ HTML email generation with Base64 images (appended at end)
- ✅ Backend email service updated
- ✅ Request body size limit increased (50MB)

### New Implementation (Cursor Position Insertion)
- ✅ RichTextEmailEditor component created
- ✅ Cursor position insertion logic implemented
- ✅ Integration with CallModePage complete
- ✅ Backend support (already complete)
- ✅ Utility functions (can be reused)
- ⚠️ **ISSUE REPORTED**: Images appearing at bottom instead of cursor position

**CURRENT STATUS**: 
- Component is implemented and integrated
- User reports images are being placed at the bottom instead of at cursor position
- Need to debug cursor position detection and insertion logic

**NEXT STEPS**: Task Group 8 - Debug and fix image positioning issue
