# Requirements Document

## Introduction

This feature addresses a critical issue where the system fails to load images from Google Drive folders when users click the "Google Drive" button in the ImageSelectorModal, resulting in "画像が見つかりません" (Images not found) errors. The system is receiving 404 (Not Found) responses when attempting to fetch folder contents from the Drive API endpoint `/api/drive/folders/contents`. Local file uploads work correctly, indicating the issue is specific to the Google Drive integration.

## Glossary

- **Drive API**: The backend API endpoint that interfaces with Google Drive to retrieve folder contents and images
- **ImageSelectorModal**: The frontend component that displays and allows selection of images from Drive folders
- **Folder Contents Endpoint**: The API route `/api/drive/folders/contents/:folderId` that retrieves files from a specific Drive folder
- **404 Error**: HTTP status code indicating the requested resource was not found

## Requirements

### Requirement 1

**User Story:** As a user viewing seller details, I want to click the "Google Drive" button and see available images from the Drive folder, so that I can select and attach them to emails.

#### Acceptance Criteria

1. WHEN a user clicks the "Google Drive" button in ImageSelectorModal THEN the system SHALL retrieve the seller's Drive folder ID
2. WHEN the Drive folder ID exists THEN the system SHALL call the Drive API endpoint with the correct folder ID
3. WHEN the Drive API endpoint receives a valid folder ID THEN the system SHALL return a list of image files
4. WHEN a Drive folder does not exist THEN the system SHALL return a clear error message indicating the folder was not found
5. WHEN the Drive API encounters an error THEN the system SHALL log detailed error information including the folder ID and error response

### Requirement 2

**User Story:** As a developer, I want comprehensive error handling for Drive API calls, so that I can quickly diagnose and fix issues.

#### Acceptance Criteria

1. WHEN the Drive API call fails THEN the system SHALL log the folder ID, error type, and error message
2. WHEN authentication fails THEN the system SHALL return a 401 status with authentication error details
3. WHEN rate limits are exceeded THEN the system SHALL return a 429 status with retry information
4. WHEN network errors occur THEN the system SHALL return a 503 status with connectivity error details
5. WHEN the response is logged THEN the system SHALL include the HTTP status code and response body

### Requirement 3

**User Story:** As a user, I want the system to validate folder IDs before making API calls, so that invalid requests are caught early.

#### Acceptance Criteria

1. WHEN a folder ID is null or undefined THEN the system SHALL return a 400 status with validation error
2. WHEN a folder ID is an empty string THEN the system SHALL return a 400 status with validation error
3. WHEN a folder ID contains invalid characters THEN the system SHALL return a 400 status with validation error
4. WHEN a folder ID is valid THEN the system SHALL proceed with the Drive API call
5. WHEN validation fails THEN the system SHALL log the invalid folder ID for debugging

### Requirement 4

**User Story:** As a system administrator, I want to verify Drive API configuration and permissions, so that I can ensure the integration is properly set up.

#### Acceptance Criteria

1. WHEN the Drive service is initialized THEN the system SHALL verify the service account credentials exist
2. WHEN making Drive API calls THEN the system SHALL use the correct authentication method
3. WHEN folder access is requested THEN the system SHALL verify the service account has read permissions
4. WHEN the Drive API returns permission errors THEN the system SHALL provide actionable error messages
5. WHEN configuration is missing THEN the system SHALL fail gracefully with clear setup instructions

### Requirement 5

**User Story:** As a user, I want the local file upload functionality to continue working as expected, so that I have an alternative method to attach images.

#### Acceptance Criteria

1. WHEN a user clicks the "ローカルファイル" (Local File) button THEN the system SHALL open the file picker
2. WHEN a user selects local image files THEN the system SHALL upload and display them correctly
3. WHEN local file upload is used THEN the system SHALL not interfere with Drive functionality
4. WHEN both upload methods are available THEN the user SHALL be able to switch between them seamlessly
5. WHEN local files are uploaded THEN the system SHALL maintain the same user experience as before
