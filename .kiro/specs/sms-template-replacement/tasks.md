# Implementation Plan

- [x] 1. Create SMS template generator utility functions





  - Create a new utility file for SMS template generation functions
  - Implement 7 generator functions (one for each template)
  - Each generator should accept (Seller, PropertyInfo | null) and return string
  - Handle null/undefined data gracefully with fallback values
  - _Requirements: 1.1, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5, 8.1-8.5, 9.1-9.5_

- [x] 1.1 Implement 初回不通時キャンセル案内 generator


  - Implement site-specific branching logic (ウ, L, Y, す, H)
  - Include seller name, property address, and company information
  - Generate イエウール-specific content for site "ウ"
  - Generate reply-based cancellation for sites "L" and "Y"
  - Generate Google Forms link for site "す"
  - Generate basic message for site "H"
  - _Requirements: 2.1-2.5_

- [x] 1.2 Implement キャンセル案内 generator

  - Implement site-specific branching logic (ウ, す, L)
  - Include seller name and property address
  - Generate email-based cancellation instructions for site "ウ"
  - Generate Google Forms link for site "す"
  - Generate reply-based cancellation with 24-hour deadline for site "L"
  - Return "キャンセル案内不要" for other sites
  - _Requirements: 3.1-3.5_

- [x] 1.3 Implement 査定Sメール generator

  - Format valuation amounts as 万円 (divide by 10000 and round)
  - Include three valuation amounts (査定額1, 査定額2, 査定額3)
  - Add build year notice if buildYear is null or <= 0
  - Include seller name, property address, appointment booking link
  - Include buyer interest mention and company contact information
  - _Requirements: 4.1-4.5_

- [x] 1.4 Implement 訪問事前通知メール generator

  - Detect if appointment day is Thursday
  - Use "明後日" for Thursday, "明日" for other days
  - Format appointment date as "M月D日" using Japanese locale
  - Format appointment time as "HH:MM"
  - Include seller name, company contact info, business hours notice
  - Include reply-disabled notice with alternative contact methods
  - _Requirements: 5.1-5.5_

- [x] 1.5 Implement 訪問後御礼メール generator

  - Map employee codes to names (U→裏, M→河野, Y→山本, W→和田, K→国広)
  - Include seller name and mapped employee name
  - Include thank you message and company name
  - Encourage seller to contact with questions
  - _Requirements: 6.1-6.5_

- [x] 1.6 Implement 除外前・長期客Sメール generator

  - Include seller name and property address
  - Include buyer interest mention
  - Include appointment booking link (http://bit.ly/44U9pjl)
  - Include opt-out offer
  - Include company address, sales record link (bit.ly/3J61wzG), and phone number
  - _Requirements: 7.1-7.5_

- [x] 1.7 Implement 当社が電話したというリマインドメール generator

  - Include seller name
  - Include call confirmation message
  - Request convenient callback times
  - Include reply welcome notice
  - Include company address, sales record link, and phone number
  - _Requirements: 8.1-8.5_

- [ ]* 1.8 Write property test for template generators
  - **Property 5-12: Required fields inclusion**
  - **Validates: Requirements 2.5, 3.5, 4.1-4.4, 5.3-5.5, 6.1-6.2-6.5, 7.1-7.5, 8.1-8.5**

- [x] 2. Update SMS template array in CallModePage


  - Replace existing smsTemplates array with new 7 templates
  - Define template objects with id, label, and generator function
  - Ensure templates are in the specified order
  - Remove all old template definitions
  - _Requirements: 1.1, 10.1, 10.2, 10.3_

- [ ]* 2.1 Write unit test for template array structure
  - Verify exactly 7 templates exist
  - Verify templates are in correct order
  - Verify each template has id, label, and generator
  - Verify old template IDs are not present
  - _Requirements: 1.1, 10.1, 10.2, 10.3_

- [x] 3. Update SMS template selection handler


  - Modify handleSmsTemplateSelect to use generator functions
  - Generate message content by calling template.generator(seller, property)
  - Pass generated content to confirmation dialog
  - Handle generation errors gracefully
  - _Requirements: 1.2, 9.2_

- [ ]* 3.1 Write property test for template selection
  - **Property 2: Template selection confirmation dialog**
  - **Validates: Requirements 1.2**

- [x] 4. Update confirmation dialog to show generated content


  - Display template label in dialog title
  - Display generated message content in dialog body
  - Add line break conversion for preview display
  - Ensure proper text wrapping and formatting
  - _Requirements: 1.2, 9.1_

- [x] 5. Update SMS send confirmation handler


  - Use generated message content when opening SMS app
  - Encode message content for SMS URL
  - Record activity with new template label format
  - Handle activity recording errors
  - _Requirements: 1.3, 1.4, 10.4_

- [ ]* 5.1 Write property test for activity recording
  - **Property 3: SMS confirmation creates activity record**
  - **Validates: Requirements 1.4, 10.4**

- [x] 6. Update activity history refresh logic

  - Ensure activity list refreshes after SMS send
  - Verify new SMS activity appears in list
  - Display new template labels correctly in activity history
  - _Requirements: 1.5, 10.5_

- [ ]* 6.1 Write property test for activity history update
  - **Property 4: Activity history updates after SMS send**
  - **Validates: Requirements 1.5, 10.5**

- [x] 7. Add line break conversion utility

  - Create utility function to convert "[改行]" to "\n"
  - Apply conversion to all generated messages
  - Ensure conversion happens before display and before SMS send
  - _Requirements: 9.1_

- [ ]* 7.1 Write property test for line break conversion
  - **Property 13: Line break placeholders are converted**
  - **Validates: Requirements 9.1**

- [x] 8. Add message length validation


  - Create utility function to check message length
  - Limit messages to 670 characters (Japanese SMS limit)
  - Show warning if message exceeds limit
  - Truncate or suggest editing if too long
  - _Requirements: 9.4_

- [ ]* 8.1 Write property test for message length
  - **Property 14: Message length is within SMS constraints**
  - **Validates: Requirements 9.4**

- [x] 9. Add error handling for missing data

  - Handle missing seller name (use empty string)
  - Handle missing property address (fall back to seller.address)
  - Handle missing site (use empty string)
  - Handle missing valuation amounts (show "未設定")
  - Handle missing appointment date (show error in preview)
  - Handle missing employee assignment (use "担当者")
  - Display user-friendly error messages
  - _Requirements: 9.2_

- [ ]* 9.1 Write unit tests for missing data scenarios
  - Test each generator with null/undefined values
  - Verify no crashes or broken message formats
  - Verify appropriate fallback values are used
  - _Requirements: 9.2_

- [x] 10. Update TypeScript types for SMS templates


  - Define SMSTemplate interface with id, label, generator
  - Update generator function signature type
  - Ensure type safety for all template operations
  - _Requirements: All_

- [x] 11. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Test SMS templates with real data

  - Test each template with various seller data scenarios
  - Verify site-specific branching works correctly
  - Verify date/time formatting is correct
  - Verify employee code mapping is correct
  - Verify message content matches requirements
  - Test on mobile devices (iOS and Android)
  - _Requirements: All_

- [x] 13. Update documentation


  - Document new template names and purposes
  - Document site-specific behavior
  - Document data requirements for each template
  - Create user guide for template selection
  - _Requirements: All_
