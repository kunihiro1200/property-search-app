# Implementation Tasks

## Task 1: Backend - PropertyImageService
- [x] Create PropertyImageService class
- [x] Implement extractFolderIdFromUrl method to parse Google Drive URLs
- [x] Implement getImagesFromStorageUrl method to fetch images from folder
- [x] Implement caching mechanism with configurable TTL
- [x] Implement getImageData method for image proxy

## Task 2: Backend - API Endpoints
- [x] Add GET /api/public/properties/:id/images endpoint
- [x] Add GET /api/public/images/:fileId endpoint (image proxy)
- [x] Add GET /api/public/images/:fileId/thumbnail endpoint (thumbnail proxy)
- [x] Integrate with WorkTaskService to get storage_url

## Task 3: Frontend - Types
- [x] Add PropertyImage interface
- [x] Add PropertyImagesResult interface
- [x] Export types from publicProperty.ts

## Task 4: Frontend - React Query Hook
- [x] Create usePropertyImages hook
- [x] Configure caching (1 hour stale time)

## Task 5: Frontend - PropertyImageGallery Component
- [x] Create PropertyImageGallery component
- [x] Implement image grid layout (responsive)
- [x] Implement lightbox modal for enlarged view
- [x] Implement keyboard navigation (arrow keys, escape)
- [x] Handle loading state
- [x] Handle empty/error state with placeholder

## Task 6: Frontend - Integration
- [x] Update PublicPropertyDetailPage to use PropertyImageGallery
- [x] Remove old static image display

## Task 7: Testing (TODO)
- [ ] Unit tests for PropertyImageService
- [ ] Unit tests for URL parsing
- [ ] Integration tests for API endpoints
- [ ] Component tests for PropertyImageGallery

## Task 8: Documentation
- [x] Update requirements.md with corrected approach
- [x] Update design.md with corrected architecture
- [x] Create tasks.md

## Notes
- Images are fetched from the storage_url field in work_tasks table
- Image proxy is used to avoid CORS issues with Google Drive
- Cache TTL is 1 hour by default
- Lightbox supports keyboard navigation
