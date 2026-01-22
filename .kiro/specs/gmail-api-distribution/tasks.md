# Implementation Plan

## Phase 1: Backend - Gmail API Integration (5 hours) ✅ COMPLETE

- [x] 1. Implement backend Gmail API integration
  - Create `/api/emails/send-distribution` endpoint in `backend/src/routes/emails.ts`
  - Implement request validation (sender address, recipients, subject, body)
  - Add sender address whitelist validation
  - Return appropriate error responses
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.1 Implement EmailService.sendDistributionEmail method
  - Add `sendDistributionEmail()` method to `backend/src/services/EmailService.ts`
  - Implement batch splitting logic (max 100 recipients per batch)
  - Implement delay between batches (1 second)
  - Handle partial success (some batches succeed, some fail)
  - Return detailed response with success/failure information
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.2 Implement EmailService.sendBatch method
  - Create RFC 2822 formatted message
  - Set From header to selected sender address
  - Set Reply-To header to selected sender address
  - Set Bcc header with recipient list
  - Encode message in base64url format
  - Call Gmail API to send message
  - Handle Gmail API errors
  - _Requirements: 3.4, 3.5_

- [x] 1.3 Configure Gmail API authentication
  - Verify Gmail API is enabled in Google Cloud Console
  - Verify OAuth2 scopes include `gmail.send` and `gmail.compose`
  - Integrate with existing GoogleAuthService
  - Test OAuth2 token retrieval
  - _Requirements: 3.3_

- [ ]* 1.4 Write unit tests for EmailService
  - Test sendDistributionEmail with single recipient
  - Test sendDistributionEmail with multiple recipients (< 100)
  - Test sendDistributionEmail with > 100 recipients (batch splitting)
  - Test sendBatch message formatting
  - Test error handling for invalid sender address
  - Test error handling for empty recipients
  - Test batch failure handling
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3_

## Phase 2: Frontend - API Integration (3 hours) ✅ COMPLETE

- [x] 2. Create DistributionConfirmationModal component
  - Create new component `frontend/src/components/DistributionConfirmationModal.tsx`
  - Display sender address prominently
  - Display recipient count
  - Display email subject
  - Show email body preview
  - Add confirm and cancel buttons
  - Show loading indicator during sending
  - Disable buttons during loading
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2.1 Update GmailDistributionButton to use backend API
  - Add state for confirmation modal
  - Add state for selected emails
  - Update handleFilterSummaryConfirm to prepare data and open confirmation modal
  - Implement handleConfirmationConfirm to call backend API
  - Handle API success response
  - Handle API error response
  - Show loading indicator during API call
  - Display success message with recipient count
  - Display error message on failure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.2 Implement fallback to Gmail Web UI
  - Add fallbackToGmailWebUI function
  - Generate Gmail compose URL with distribution data
  - Open Gmail in new tab
  - Display info message for manual sending
  - Trigger fallback on API error
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 2.3 Write integration tests for distribution flow
  - Test complete distribution flow from button click to API call
  - Test confirmation modal display
  - Test API success handling
  - Test API error handling
  - Test fallback to Gmail Web UI
  - Test loading states
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3_

## Phase 3: UI Improvements (2 hours)

- [ ] 3. Update BuyerFilterSummaryModal for API sending
  - Update confirm button label to "送信する" (instead of "Gmailを開く")
  - Update info alert text to indicate API sending
  - Ensure sender address is displayed
  - Ensure recipient count is displayed
  - Remove any references to Gmail Web UI opening
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3.1 Fix SenderAddressSelector display issues
  - Verify sender address selector is visible in all modals
  - Ensure selected address is highlighted
  - Verify session storage persistence works
  - Test with all three sender addresses
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 3.2 Update success/error messages
  - Update success message to show recipient count
  - Update success message to show sender address
  - Update error messages to be user-friendly
  - Add fallback option to error messages
  - _Requirements: 1.5, 6.1, 6.2, 7.2_

## Phase 4: Testing (6 hours)

- [ ] 4. Backend testing
  - Test /api/emails/send-distribution endpoint with valid data
  - Test with invalid sender address
  - Test with empty recipients
  - Test with missing parameters
  - Test with single recipient
  - Test with 50 recipients
  - Test with 150 recipients (batch splitting)
  - Verify From and Reply-To headers are set correctly
  - Verify BCC recipients are correct
  - Verify batch delay is working
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3_

- [ ] 4.1 Frontend integration testing
  - Test complete flow: button click → template selection → buyer filtering → confirmation → sending
  - Test with different templates
  - Test with different sender addresses
  - Test with different recipient counts
  - Test loading indicators
  - Test success messages
  - Test error messages
  - Test fallback to Gmail Web UI
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

- [ ] 4.2 Manual testing with real Gmail accounts
  - Send test email to single recipient
  - Verify email is received
  - Verify From address is correct
  - Verify Reply-To address is correct
  - Send test email to 10 recipients
  - Verify all recipients receive email
  - Send test email to 150 recipients
  - Verify batch sending works
  - Verify all recipients receive email
  - Test with each sender address (tenant, gyosha, info)
  - _Requirements: 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

- [ ] 4.3 Error scenario testing
  - Test with invalid Gmail API credentials
  - Verify error message is displayed
  - Verify fallback to Gmail Web UI is offered
  - Test with network error
  - Verify error message is displayed
  - Test with rate limit error
  - Verify appropriate error message
  - Test with invalid email format
  - Verify validation error
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Documentation (2 hours)

- [ ] 5. Create API documentation
  - Document /api/emails/send-distribution endpoint
  - Document request parameters
  - Document response format
  - Document error codes
  - Add example requests and responses
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5.1 Create user guide
  - Document how to use Gmail distribution feature
  - Document sender address selection
  - Document confirmation modal
  - Document what happens during sending
  - Document error handling and fallback
  - Add screenshots
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5.2 Create deployment guide
  - Document Gmail API setup requirements
  - Document OAuth2 configuration
  - Document environment variables
  - Document testing procedures
  - Document monitoring and troubleshooting
  - _Requirements: 3.3, 7.1, 7.2, 7.3, 7.4_

## Summary

**Total Tasks:** 18 main tasks + 3 optional test tasks
**Estimated Time:** 18 hours total
- Phase 1 (Backend): 5 hours
- Phase 2 (Frontend): 3 hours
- Phase 3 (UI): 2 hours
- Phase 4 (Testing): 6 hours
- Phase 5 (Documentation): 2 hours

**Key Features:**
✅ Gmail API integration for direct sending
✅ User confirmation before sending
✅ Batch splitting for >100 recipients
✅ From and Reply-To header configuration
✅ Fallback to Gmail Web UI on error
✅ Comprehensive error handling
✅ Loading indicators and user feedback

**Next Steps:**
1. Start with Phase 1: Backend Gmail API integration
2. Implement EmailService.sendDistributionEmail method
3. Test backend endpoint thoroughly
4. Move to Phase 2: Frontend API integration
5. Create DistributionConfirmationModal component
6. Update GmailDistributionButton to use backend API
7. Complete remaining phases in order
