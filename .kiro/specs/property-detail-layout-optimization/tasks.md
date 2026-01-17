# Implementation Plan

- [x] 1. Create EditableSection component
- [x] 1.1 Create EditableSection component structure


  - Implement component with props interface (title, isEditMode, onEditToggle, onSave, onCancel, children, maxWidth)
  - Add edit/save/cancel button controls
  - Implement loading state management
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 1.2 Add button handlers to EditableSection
  - Implement handleSave with async support
  - Implement handleCancel with confirmation dialog
  - Toggle between read-only and edit modes
  - _Requirements: 7.2, 7.4, 7.5_

- [x] 2. Create new component files
  - Create PriceSection component for displaying price information at the top
  - Create PropertyDetailsSection component for property physical details at the bottom
  - Create CompactBuyerList component with 5-row limit and expand functionality
  - _Requirements: 1.1, 2.1, 3.1-3.7_





- [x] 3. Implement PriceSection component with width constraint
- [x] 3.1 Create PriceSection component structure
  - Implement component with props interface (salesPrice, listingPrice, priceReductionHistory, onFieldChange, editedData, isEditMode, onEditToggle)
  - Add visual emphasis styling with background color
  - Display sale price prominently at the top


  - Display price reduction history in multi-line format
  - Apply maxWidth constraint (600px)
  - _Requirements: 1.1, 6.1, 6.3_

- [x] 3.2 Integrate EditableSection wrapper
  - Wrap PriceSection content with EditableSection component
  - Pass edit mode props and handlers
  - Implement save and cancel handlers
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.3 Add edit functionality to PriceSection
  - Implement field change handlers
  - Add input validation for price fields
  - Toggle between read-only and edit displays
  - _Requirements: 1.1, 7.3_

- [x] 4. Implement CompactBuyerList component with width constraint
- [x] 4.1 Create CompactBuyerList component structure
  - Implement component with BuyerWithDetails interface
  - Add maxInitialDisplay prop (default: 5)
  - Create compact layout for buyer entries
  - Apply maxWidth constraint (400px)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2, 6.4_

- [x] 4.2 Add buyer entry display fields
  - Display reception date for each buyer
  - Display viewing date for each buyer


  - Display purchase offer status indicator (Chip component)
  - Format dates using utility function
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 4.3 Implement expand/collapse functionality
  - Show only first 5 buyers initially
  - Add "すべて表示" button when buyers > 5


  - Toggle between compact and full view



  - _Requirements: 2.1, 2.5_


- [x] 5. Implement PropertyDetailsSection component

- [x] 5.1 Create PropertyDetailsSection component structure
  - Implement component with props interface
  - Add all property detail fields (land area, building area, construction date, structure, floor plan, contract date, settlement date)

  - _Requirements: 3.1-3.7_

- [x] 5.2 Integrate EditableSection wrapper
  - Wrap PropertyDetailsSection content with EditableSection component
  - Pass edit mode props and handlers
  - Implement save and cancel handlers
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5.3 Add edit functionality to PropertyDetailsSection
  - Implement field change handlers for all fields
  - Add appropriate input types for each field
  - Toggle between read-only and edit displays
  - _Requirements: 3.1-3.7, 7.3_


- [x] 6. Modify MapLinkSection
- [x] 6.1 Remove embedded map iframe
  - Remove iframe element from MapLinkSection
  - Replace with Link component
  - _Requirements: 4.1, 4.2_

- [x] 6.2 Implement URL link display
  - Display Google Maps URL as clickable link
  - Add MapIcon for visual indication
  - Set target="_blank" and rel="noopener noreferrer"
  - _Requirements: 4.1, 4.3_

- [x] 7. Restructure BasicInfoSection

- [x] 7.1 Add current status field to BasicInfoSection
  - Move "現況" field from owner situation section
  - Integrate into basic information display
  - _Requirements: 1.3_

- [x] 7.2 Integrate non-empty other info fields
  - Define otherInfoFields array
  - Filter for non-empty values
  - Display filtered fields in BasicInfoSection
  - _Requirements: 1.4_

- [x] 7.3 Remove property detail fields from BasicInfoSection
  - Remove land area, building area, construction date, structure, floor plan
  - Remove contract date and settlement date
  - These will be displayed in PropertyDetailsSection
  - _Requirements: 3.1-3.7_

- [x] 7.4 Integrate EditableSection wrapper for BasicInfoSection
  - Wrap BasicInfoSection content with EditableSection component
  - Pass edit mode props and handlers
  - Implement save and cancel handlers
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Modify OtherInfoSection visibility
- [ ] 8.1 Implement conditional rendering for OtherInfoSection
  - Filter for empty fields only
  - Show section only in edit mode
  - Hide section in view mode when all fields are empty
  - _Requirements: 1.5_

- [ ] 8.2 Add edit mode toggle
  - Implement editMode state
  - Add edit button to trigger edit mode
  - Show empty fields when in edit mode
  - _Requirements: 1.5_





- [x] 9. Reorganize PropertyListingDetailPage layout
- [x] 9.1 Reorder sections in correct priority
  - Place PriceSection at the very top
  - Move NotesSection immediately after BasicInfoSection
  - Place PropertyDetailsSection at the bottom
  - Maintain other sections in logical order
  - _Requirements: 1.1, 1.2, 5.1_

- [x] 9.2 Update left column layout
  - Integrate all new and modified components
  - Ensure proper spacing between sections


  - Apply compact styling where appropriate
  - _Requirements: 5.2, 5.3_

- [x] 9.3 Update right column with CompactBuyerList
  - Replace existing buyer list with CompactBuyerList component


  - Pass proper props including buyers data and property number
  - _Requirements: 2.1-2.5, 6.2, 6.4_

- [x] 10. Implement edit mode state management
- [x] 10.1 Add edit mode state for each section


  - Create state variables for PriceSection edit mode
  - Create state variables for BasicInfoSection edit mode
  - Create state variables for PropertyDetailsSection edit mode
  - Create state variables for other sections as needed
  - _Requirements: 7.1, 7.2_

- [x] 10.2 Implement save handlers for each section
  - Create handleSavePrice function with API call
  - Create handleSaveBasicInfo function with API call
  - Create handleSavePropertyDetails function with API call
  - Handle success and error states
  - _Requirements: 7.4_

- [x] 10.3 Implement cancel handlers for each section
  - Create handleCancelPrice function to discard changes
  - Create handleCancelBasicInfo function to discard changes
  - Create handleCancelPropertyDetails function to discard changes
  - Reset edited data to original values
  - _Requirements: 7.5_

- [x] 11. Optimize spacing and layout
- [x] 11.1 Reduce vertical spacing between sections
  - Adjust margin and padding values
  - Use compact Paper component styling
  - _Requirements: 5.2, 5.3_

- [ ] 11.2 Measure and verify page height reduction
  - Implement height measurement utility
  - Compare before and after scrollable heights
  - Verify at least 30% reduction
  - _Requirements: 5.4_

- [x] 12. Add error handling
- [x] 12.1 Handle missing data gracefully
  - Display "-" for empty fields
  - Show appropriate message for empty buyer list
  - Hide map section when URL is missing
  - _Requirements: All_

- [x] 12.2 Handle API errors
  - Display error message for buyer data fetch failures
  - Show snackbar notification for save failures
  - _Requirements: All_

- [ ] 13. Update PriceSection width constraint
- [x] 13.1 Reduce PriceSection width to 33%


  - Change maxWidth from 600px to 400px
  - Add flex: '0 0 33%' for consistent sizing
  - Test responsive behavior
  - _Requirements: 9.1_


- [ ] 14. Update NotesSection for larger display
- [ ] 14.1 Expand NotesSection width to 67%
  - Add maxWidth: 800px
  - Add flex: '0 0 67%' for consistent sizing

  - _Requirements: 9.2_

- [ ] 14.2 Increase font size in NotesSection
  - Change special notes font size to 18px
  - Change memo font size to 18px
  - Adjust line height for readability (1.8)

  - _Requirements: 9.3, 9.4_

- [ ] 15. Implement side-by-side layout for Price and Notes
- [ ] 15.1 Create flex container for Price and Notes sections
  - Wrap PriceSection and NotesSection in a flex Box
  - Set display: 'flex' and gap: 2
  - Ensure sections appear in the same row
  - _Requirements: 9.5_

- [ ] 16. Remove Owner Situation Section
- [ ] 16.1 Remove OwnerSituationSection from PropertyListingDetailPage
  - Remove any references to owner situation section
  - Verify current status is displayed in BasicInfoSection
  - Verify owner info is displayed in SellerBuyerInfoSection
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

