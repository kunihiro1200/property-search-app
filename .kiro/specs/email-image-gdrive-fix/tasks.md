# Implementation Plan

- [x] 1. Create InlineImageProcessor service


  - Implement core service for detecting and processing inline images in HTML
  - Create methods for Data URL to Buffer conversion
  - Implement CID generation logic
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 1.1 Write property test for Data URL to Buffer conversion
  - **Property 2: Image Embedding Correctness**
  - **Validates: Requirements 2.1**


- [ ] 1.2 Implement dataUrlToBuffer method
  - Parse Data URL format (data:image/type;base64,...)
  - Extract MIME type from Data URL
  - Decode base64 string to Buffer
  - Validate image format (JPEG, PNG, GIF, WebP)
  - _Requirements: 2.1_


- [ ] 1.3 Implement generateContentId method
  - Generate unique Content-ID using timestamp and random string
  - Format: image-{timestamp}-{random}@seller-management.local
  - Ensure uniqueness across concurrent requests

  - _Requirements: 2.3_

- [ ] 1.4 Implement processHtmlWithImages method
  - Parse HTML and detect all <img> tags with data URLs
  - Extract image data and metadata (size, position, MIME type)
  - Calculate total size including base64 overhead

  - Determine whether to use Data URLs or CID references
  - _Requirements: 2.1, 2.2, 4.1, 4.4_

- [ ] 1.5 Implement replaceDataUrlsWithCids method
  - Replace data URL src attributes with cid: references

  - Maintain image order and positioning
  - Preserve other img attributes (alt, style, etc.)
  - _Requirements: 2.3_

- [ ] 1.6 Implement shouldUseDataUrls method
  - Check if total size is below 2MB threshold
  - Return boolean decision for embedding strategy
  - _Requirements: 2.2_

- [ ]* 1.7 Write unit tests for InlineImageProcessor
  - Test dataUrlToBuffer with various image formats


  - Test generateContentId for uniqueness
  - Test processHtmlWithImages with multiple images
  - Test replaceDataUrlsWithCids HTML transformation
  - Test shouldUseDataUrls threshold logic
  - _Requirements: 2.1, 2.2, 2.3_


- [ ] 2. Update EmailService for inline image support
  - Integrate InlineImageProcessor into email sending flow
  - Implement multipart/related MIME structure

  - Add size validation and error handling
  - _Requirements: 1.1, 1.2, 2.2, 4.2, 4.3_

- [ ] 2.1 Add InlineImageProcessor to EmailService constructor
  - Initialize InlineImageProcessor instance
  - Update service dependencies
  - _Requirements: 2.1_

- [ ] 2.2 Implement createMultipartRelatedMessage method
  - Create multipart/related MIME structure
  - Add multipart/alternative for text and HTML

  - Embed inline images with Content-ID headers
  - Set Content-Disposition: inline for images
  - Encode image data as base64
  - _Requirements: 1.2, 2.2, 2.3_


- [ ]* 2.3 Write property test for MIME structure validity
  - **Property 4: MIME Structure Validity**
  - **Validates: Requirements 2.2, 2.3**

- [ ] 2.4 Implement createHtmlMessageWithDataUrls method
  - Create simple HTML message with Data URLs embedded
  - Add proper HTML email headers

  - Encode subject line for Japanese characters
  - _Requirements: 1.2, 2.2_

- [ ] 2.5 Update sendEmailWithImages method
  - Call InlineImageProcessor to process HTML
  - Check total size against 10MB limit
  - Choose between Data URL and CID approach based on size
  - Call appropriate message creation method
  - Handle errors and return appropriate EmailResult
  - _Requirements: 1.1, 1.2, 4.2, 4.3_

- [ ] 2.6 Add size validation logic
  - Validate individual image size (5MB limit)
  - Validate total email size (10MB limit)
  - Account for base64 encoding overhead (33% increase)
  - Return descriptive error messages
  - _Requirements: 4.1, 4.2, 4.3, 4.4_



- [ ]* 2.7 Write property test for size limit enforcement
  - **Property 3: Size Limit Enforcement**
  - **Validates: Requirements 4.2, 4.3**


- [ ]* 2.8 Write unit tests for EmailService updates
  - Test createMultipartRelatedMessage MIME structure
  - Test createHtmlMessageWithDataUrls format
  - Test sendEmailWithImages with various image counts
  - Test size validation error cases

  - Test CID vs Data URL decision logic
  - _Requirements: 1.2, 2.2, 4.2, 4.3_

- [ ] 3. Add email preview functionality
  - Create preview component that accurately shows final layout

  - Handle image rendering in preview
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3.1 Create EmailPreview component
  - Display HTML content with inline images
  - Match final email styling
  - Show loading states for images
  - Handle image load errors with placeholders
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 3.2 Add preview toggle to email composition UI


  - Add "Preview" button to email editor
  - Switch between edit and preview modes
  - Maintain state when switching modes
  - _Requirements: 3.3_


- [ ] 3.3 Implement preview HTML generation
  - Use same HTML generation logic as email sending
  - Render Data URLs or CID references appropriately
  - Apply email client CSS styles for accurate preview
  - _Requirements: 3.1, 3.2_


- [ ]* 3.4 Write unit tests for preview functionality
  - Test EmailPreview component rendering
  - Test preview/edit mode switching
  - Test image placeholder display

  - Test preview HTML generation
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Add size monitoring and user feedback
  - Display current email size to user

  - Show warnings when approaching limits
  - Provide helpful error messages
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ] 4.1 Create EmailSizeMonitor component
  - Calculate and display current email size
  - Show size as MB with progress indicator
  - Update in real-time as images are added/removed
  - _Requirements: 4.1_

- [x] 4.2 Add size warning indicators


  - Show yellow warning at 8MB (80% of limit)
  - Show red warning at 9.5MB (95% of limit)
  - Display helpful messages about reducing size
  - _Requirements: 4.5_

- [ ] 4.3 Implement size limit error handling
  - Prevent sending when over 10MB limit
  - Show error dialog with current size and limit
  - Suggest actions: remove images, compress images, use attachments
  - _Requirements: 4.2, 4.3, 4.5_

- [ ] 4.4 Update RichTextEmailEditor error messages
  - Show specific error when individual image exceeds 5MB
  - Show specific error when total would exceed 10MB
  - Include current size and limit in error messages
  - _Requirements: 4.2, 4.3_

- [ ]* 4.5 Write unit tests for size monitoring
  - Test EmailSizeMonitor calculations
  - Test warning threshold triggers
  - Test error message generation
  - Test base64 overhead calculation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_


- [ ] 5. Integration testing and validation
  - Test complete flow from paste to send
  - Verify emails render correctly in multiple clients


  - Validate MIME structure compliance
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 5.1 Write property test for image position preservation
  - **Property 1: Image Position Preservation**

  - **Validates: Requirements 1.1, 1.3, 1.4**

- [ ]* 5.2 Write integration tests for complete email flow
  - Test paste image → compose → send → receive flow
  - Test with multiple images at different positions

  - Test with mixed content (text, images, links)
  - Test with different image formats (JPEG, PNG, GIF)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 5.3 Test email rendering in multiple clients
  - Send test emails to Gmail, Outlook, Apple Mail

  - Verify images appear at correct positions
  - Verify images load correctly
  - Document any client-specific issues
  - _Requirements: 1.5_




- [ ] 5.4 Validate MIME structure compliance
  - Use MIME parser to validate generated messages
  - Verify RFC 2387 compliance for multipart/related
  - Verify Content-ID references resolve correctly
  - _Requirements: 2.2, 2.3_

- [ ] 6. Update documentation and error messages
  - Update user documentation for inline images
  - Add developer documentation for new services
  - Ensure all error messages are user-friendly
  - _Requirements: 4.2, 4.3, 4.5_

- [ ] 6.1 Update user documentation
  - Document inline image feature
  - Explain size limits and best practices
  - Add troubleshooting section
  - _Requirements: 4.5_

- [ ] 6.2 Add developer documentation
  - Document InlineImageProcessor API
  - Document EmailService changes
  - Add code examples for common scenarios
  - Document MIME structure format
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6.3 Review and improve error messages
  - Ensure all error messages are in Japanese
  - Make error messages specific and actionable
  - Add suggestions for resolving errors
  - _Requirements: 4.2, 4.3, 4.5_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
