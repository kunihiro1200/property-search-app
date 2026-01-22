# Implementation Plan: Buyer Detail Inline Edit

## Overview

This implementation plan breaks down the inline editing feature into discrete, incremental tasks. Each task builds on previous work and includes testing to validate functionality early.

## Tasks

- [x] 1. Create core inline edit infrastructure
  - Create `useInlineEdit` custom hook with edit state management
  - Implement edit mode activation/deactivation logic
  - Add value change tracking and original value preservation
  - _Requirements: 1.1, 4.5_

- [ ]* 1.1 Write property test for edit mode activation
  - **Property 1: Field Activation**
  - **Validates: Requirements 1.1, 1.2, 1.5**

- [x] 2. Build InlineEditableField component
  - Create reusable component with display and edit modes
  - Implement field type detection and appropriate input rendering
  - Add visual feedback for editable fields (hover states)
  - Support text, email, phone, date, dropdown, textarea, and number types
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 2.1 Write property test for input control rendering
  - **Property 1: Field Activation**
  - **Validates: Requirements 1.1, 1.2, 1.5**

- [x] 3. Implement validation system
  - Create field validation functions for each field type
  - Add email validation with regex pattern
  - Add phone validation with format checking
  - Implement required field validation
  - Add min/max length validation
  - _Requirements: 2.2, 4.2_

- [ ]* 3.1 Write property test for email and phone validation
  - **Property 2: Email and Phone Validation**
  - **Validates: Requirements 2.2**

- [ ]* 3.2 Write property test for validation before save
  - **Property 5: Validation Before Save**
  - **Validates: Requirements 4.2, 8.5**

- [x] 4. Implement auto-save functionality
  - Create auto-save service with debouncing (300ms)
  - Implement onBlur save trigger
  - Add optimistic UI updates
  - Handle save success and error states
  - _Requirements: 4.1, 4.4_

- [ ]* 4.1 Write property test for auto-save on blur
  - **Property 4: Auto-Save on Blur**
  - **Validates: Requirements 4.1**

- [ ]* 4.2 Write property test for save error handling
  - **Property 6: Save Error Handling**
  - **Validates: Requirements 4.4, 6.4**

- [x] 5. Add keyboard navigation support
  - Implement Tab key navigation with save
  - Implement Shift+Tab reverse navigation with save
  - Add Enter key handling for single-line fields
  - Add Enter key handling for multi-line fields (line break)
  - Implement Escape key to cancel edit
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 5.1 Write property test for cancel edit restoration
  - **Property 7: Cancel Edit Restoration**
  - **Validates: Requirements 4.5, 7.5**

- [ ]* 5.2 Write property test for Tab navigation
  - **Property 10: Tab Navigation and Save**
  - **Validates: Requirements 7.1**

- [ ]* 5.3 Write property test for Shift-Tab navigation
  - **Property 11: Shift-Tab Navigation and Save**
  - **Validates: Requirements 7.2**

- [ ]* 5.4 Write property test for Enter in single-line fields
  - **Property 12: Enter Key Behavior in Single-Line Fields**
  - **Validates: Requirements 7.3**

- [ ]* 5.5 Write property test for Enter in multi-line fields
  - **Property 13: Enter Key Behavior in Multi-Line Fields**
  - **Validates: Requirements 7.4**

- [x] 6. Implement field permissions system
  - Create field metadata configuration with read-only flags
  - Add permission checking logic
  - Implement read-only field styling
  - Add tooltips for read-only fields
  - Prevent edit mode activation for read-only fields
  - _Requirements: 5.1, 5.3, 5.4_

- [ ]* 6.1 Write property test for read-only field protection
  - **Property 8: Read-Only Field Protection**
  - **Validates: Requirements 5.1, 5.3**

- [ ]* 6.2 Write property test for permission enforcement
  - **Property 9: Permission Enforcement**
  - **Validates: Requirements 5.4**

- [x] 7. Add multi-line text formatting preservation
  - Implement line break preservation in textarea fields
  - Handle whitespace preservation
  - Test with various line break patterns
  - _Requirements: 3.5_

- [x]* 7.1 Write property test for multi-line text preservation
  - **Property 3: Multi-line Text Preservation**
  - **Validates: Requirements 3.5**

- [x] 8. Implement conflict detection system
  - Add last-modified timestamp tracking
  - Create conflict detection service
  - Implement concurrent edit detection logic
  - Add conflict notification UI
  - _Requirements: 8.1, 8.2_

- [ ]* 8.1 Write property test for concurrent edit detection
  - **Property 14: Concurrent Edit Detection**
  - **Validates: Requirements 8.1**

- [ ]* 8.2 Write property test for conflict notification
  - **Property 15: Conflict Notification**
  - **Validates: Requirements 8.2**

- [x] 9. Build conflict resolution UI
  - Create conflict resolution modal
  - Display side-by-side value comparison
  - Add option buttons (keep mine, keep theirs, merge)
  - Implement conflict resolution logic
  - _Requirements: 8.3_

- [ ]* 9.1 Write property test for conflict resolution
  - **Property 16: Conflict Resolution**
  - **Validates: Requirements 8.3**

- [x] 10. Implement audit trail logging
  - Create audit log service
  - Log all successful edits with field name, old/new values, user, timestamp
  - Add audit log API endpoint
  - Store audit logs in database
  - _Requirements: 8.4_

- [ ]* 10.1 Write property test for audit trail logging
  - **Property 17: Audit Trail Logging**
  - **Validates: Requirements 8.4**

- [x] 11. Integrate inline editing into Basic Info Section
  - Add InlineEditableField for name field
  - Add InlineEditableField for email field
  - Add InlineEditableField for phone field
  - Add InlineEditableField for address field
  - Add InlineEditableField for budget field
  - Add InlineEditableField for property type (dropdown)
  - Add InlineEditableField for preferred areas (multi-select)
  - Add InlineEditableField for inquiry source (dropdown)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - **Status: COMPLETE** ✅
  - Implemented 8 fields with inline editing
  - Conflict detection enabled
  - Read-only enforcement for buyer_number
  - Changed edit button text to "その他編集"

- [ ]* 11.1 Write unit tests for basic info fields
  - Test name field activation
  - Test email field validation
  - Test phone field validation
  - Test address field activation
  - Test inquiry source dropdown

- [x] 12. Integrate inline editing into Viewing Info Section
  - Add InlineEditableField for viewing notes (textarea)
  - Add InlineEditableField for viewing dates (date picker)
  - Add InlineEditableField for viewing status (dropdown)
  - Add InlineEditableField for latest status (dropdown)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - **Status: COMPLETE** ✅
  - Implemented 10 fields with inline editing
  - Special handling for inquiry_source dropdown
  - Replaced LatestStatusDropdown with text field
  - Multiline support for textarea fields
  - Empty value display logic updated

- [ ]* 12.1 Write unit tests for viewing info fields
  - Test viewing notes field activation
  - Test viewing date picker display
  - Test viewing status dropdown
  - Test latest status dropdown

- [x] 13. Add visual feedback and loading states
  - Implement loading spinner during save
  - Add success indicator after save
  - Add error message display near field
  - Implement field highlighting in edit mode
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - **Status: COMPLETE** ✅
  - Loading spinner: CircularProgress shown during save
  - Success indicator: Green checkmark with "保存しました" message
  - Error display: Error message shown below field
  - Edit mode highlighting: Border color change on hover/edit
  - "クリックして編集" hint on hover

- [ ] 14. Implement accessibility features
  - Add ARIA labels to all editable fields
  - Implement focus management
  - Add screen reader announcements for edit mode changes
  - Test keyboard-only navigation
  - Ensure WCAG compliance
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Performance optimization
  - Implement debouncing for auto-save (300ms)
  - Add request cancellation for abandoned edits
  - Optimize re-renders with React.memo
  - Cache field metadata
  - _Requirements: 4.1_
  - **Status: COMPLETE** ✅
  - Debouncing: 300ms delay implemented in useInlineEdit hook
  - Request cancellation: AbortController for in-flight requests
  - React.memo: Applied to InlineEditableField and ConflictNotification
  - useMemo: Field metadata, permissions, validation rules cached
  - useCallback: All event handlers memoized
  - Field metadata cache: Map-based caching in fieldPermissions.ts
  - Performance documentation created

- [ ]* 16.1 Write integration tests
  - Test complete edit workflow from click to save
  - Test keyboard navigation through entire form
  - Test conflict resolution end-to-end
  - Test permission enforcement across user roles

- [ ] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
