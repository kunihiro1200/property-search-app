# Implementation Plan

- [x] 1. Gmail "Send As" Configuration Setup


  - Configure Send As addresses in Gmail web interface for the authenticated account
  - Add all required sender addresses (tenant@ifoo-oita.com, gyosha@ifoo-oita.com, hiromitsu-kakui@ifoo-oita.com)
  - Verify each Send As address through email confirmation
  - Document the current Send As configuration
  - _Requirements: 2.1, 2.2_



- [ ] 2. Update EmailService for Send As Support
  - Add ALLOWED_SEND_AS_ADDRESSES constant with whitelist of valid sender addresses
  - Implement validateSendAsAddress() method to check if address is in whitelist
  - Update sendBatch() method to validate sender address before sending
  - Add detailed error logging for Send As validation failures
  - _Requirements: 1.1, 1.2, 2.4_

- [x]* 2.1 Write property test for Send As validation



  - **Property 1: Send As Address Validation**
  - **Validates: Requirements 1.2, 2.4**

- [ ] 3. Verify Gmail API Send As Implementation
  - Research Gmail API documentation for Send As parameter usage
  - Test if current Gmail API client supports Send As
  - Verify OAuth2 scopes include gmail.send permission
  - Document any API limitations or special requirements
  - _Requirements: 2.3, 3.3_

- [ ] 4. Update Message Creation for Send As
  - Modify createMessage() to properly format From header with Send As address
  - Ensure Reply-To header is set correctly
  - Test message format with Japanese characters in sender name
  - Verify BCC recipients are not affected by Send As changes
  - _Requirements: 1.1, 1.3_

- [ ]* 4.1 Write property test for message creation
  - **Property 2: Correct Sender in Sent Email**
  - **Validates: Requirements 1.3**

- [ ] 5. Enhance Error Handling for Send As
  - Add INVALID_SEND_AS_ADDRESS error code and message
  - Add SEND_AS_NOT_CONFIGURED error code and message
  - Add SEND_AS_NOT_VERIFIED error code and message
  - Include sender address and authenticated account in error logs
  - Provide actionable error messages with configuration steps
  - _Requirements: 1.2, 3.2_

- [ ]* 5.1 Write unit tests for error scenarios
  - Test invalid Send As address rejection
  - Test unconfigured Send As address error
  - Test unverified Send As address error
  - Test error message clarity and actionability
  - _Requirements: 1.2, 3.2_

- [ ] 6. Update API Route Validation
  - Verify /send-distribution endpoint validates senderAddress parameter
  - Ensure validation uses same whitelist as EmailService
  - Add detailed error responses for invalid sender addresses
  - Test API endpoint with various sender addresses
  - _Requirements: 1.1, 1.2_

- [ ] 7. Add Send As Configuration Verification
  - Create utility function to list available Send As addresses from Gmail API
  - Implement startup check to verify all whitelisted addresses are configured
  - Log warning if whitelisted address is not configured in Gmail
  - Add admin endpoint to check Send As configuration status
  - _Requirements: 2.2, 5.1_

- [ ]* 7.1 Write property test for configuration validation
  - **Property 4: Configuration Validation**
  - **Validates: Requirements 2.2, 5.1**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Manual Testing with Real Gmail
  - Send test email from tenant@ifoo-oita.com and verify sender
  - Send test email from gyosha@ifoo-oita.com and verify sender
  - Send test email from hiromitsu-kakui@ifoo-oita.com and verify sender
  - Verify emails appear in authenticated account's sent folder
  - Test with unconfigured address and verify error message
  - _Requirements: 1.3, 1.4, 3.2_

- [ ] 10. Update Documentation
  - Create Gmail Send As setup guide with screenshots
  - Document troubleshooting steps for common issues
  - Add configuration checklist for new sender addresses
  - Update API documentation with Send As requirements
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 11. Final Checkpoint - Verify Production Readiness
  - Ensure all tests pass, ask the user if questions arise.
