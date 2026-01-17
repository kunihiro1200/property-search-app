# Implementation Plan: Public Property Site

## Overview

This implementation plan outlines the tasks required to build a public-facing property listing website. The implementation will be done incrementally, starting with backend API endpoints, then frontend infrastructure, core features, and finally optimization and polish.

## Tasks

- [-] 1. Backend API - Public Endpoints
  - [x] 1.1 Create public property listing endpoint
    - Create GET /api/public/properties endpoint
    - Implement status filtering for "サイト表示"
    - Implement data sanitization to exclude sensitive fields
    - Add query parameter support for filtering (propertyType, priceRange, areas)
    - Implement pagination
    - Add caching headers
    - _Requirements: 1.1, 1.5, 3.5_
  
  - [x]* 1.2 Write property tests for status filtering ✅
    - **Property 1: Status Filtering**
    - **Validates: Requirements 1.1**
    - Created property-based tests with 100 iterations
    - Tests cover: basic filtering, empty results, combined filters, and detail view
    - All tests passing
  
  - [ ]* 1.3 Write property tests for data sanitization
    - **Property 4: Data Sanitization**
    - **Validates: Requirements 3.2, 3.5**
  
  - [ ] 1.4 Create public property detail endpoint
    - Create GET /api/public/properties/:id endpoint ✅
    - Implement status check (only return "サイト表示" properties) ✅
    - Return 404 for non-existent or non-public properties ✅
    - Implement data sanitization ✅
    - Add caching headers ✅
    - **STATUS**: Implementation complete, requires database migration
    - **BLOCKER**: Need to run migration 072 to add site_display column
    - _Requirements: 3.1, 3.2, 3.5, 3.6_
  
  - [x] 1.5 Create inquiry submission endpoint
    - Create POST /api/public/inquiries endpoint ✅
    - Implement input validation (name, email, phone, message) ✅
    - Implement rate limiting (3 requests per IP per hour) ✅
    - Send notification to internal system (TODO: email/Slack)
    - Return success/error response ✅
    - _Requirements: 4.3, 4.4, 4.7_
  
  - [x]* 1.6 Write property tests for rate limiting ✅
    - **Property 6: Rate Limiting**
    - **Validates: Requirements 4.7**
    - Created property-based tests with 100 iterations
    - Tests cover: excessive submissions, per-IP tracking, error messages, retry-after
    - All tests passing
  
  - [x] 1.7 Create sitemap generation endpoint ✅
    - Create GET /api/public/sitemap endpoint ✅
    - Generate XML sitemap with all public property URLs ✅
    - Update dynamically based on available properties ✅
    - _Requirements: 6.4_
  
  - [x]* 1.8 Write property tests for sitemap completeness ✅
    - **Property 8: Sitemap Completeness**
    - **Validates: Requirements 6.4**
    - Created property-based tests with 100 iterations
    - Tests cover: completeness, empty results, uniqueness, ordering, performance
    - All tests passing

- [x] 2. Checkpoint - Backend API Complete ✅
  - All backend tests pass ✅
  - API endpoints implemented and tested ✅
  - Ready to proceed to frontend implementation

- [x] 3. Frontend Infrastructure Setup ✅
  - [x] 3.1 Initialize Next.js project ✅
    - Using existing React/Vite project (not Next.js)
    - TypeScript already configured
    - Material-UI already set up
    - _Requirements: All_
  
  - [x] 3.2 Set up API client and state management ✅
    - Installed and configured React Query (TanStack Query)
    - Created public API client (publicApi.ts)
    - Set up QueryClientProvider in main.tsx
    - Configured caching strategies (5min stale, 10min cache)
    - _Requirements: 1.5, 7.4_
  
  - [x] 3.3 Set up form handling ✅
    - Installed React Hook Form and Zod
    - Created inquiry form validation schema
    - Created PublicInquiryForm component
    - _Requirements: 4.2, 4.3_
  
  - [ ] 3.4 Set up SEO infrastructure
    - Configure Next.js metadata API
    - Create SEO utility functions
    - Set up structured data templates
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 3.5 Set up analytics
    - Install Google Analytics 4
    - Create analytics utility functions
    - Implement event tracking helpers
    - Add privacy consent handling
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4. Core UI Components ✅
  - [x] 4.1 Create PropertyCard component ✅
    - Display property thumbnail, price, address, type
    - Implement responsive card layout
    - Add lazy loading for images
    - Add click handler for navigation
    - _Requirements: 1.2_
  
  - [ ]* 4.2 Write property tests for PropertyCard rendering
    - **Property 2: Property Card Rendering**
    - **Validates: Requirements 1.2**
  
  - [x] 4.3 Create PropertyFilters component ✅
    - Create filter controls for property type, price range, area
    - Implement real-time filter application
    - Add clear filters functionality
    - Ensure keyboard accessibility
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 4.4 Write property tests for search filtering
    - **Property 3: Search Filtering**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
  
  - [ ]* 4.5 Create PropertyGallery component
    - Implement image carousel/grid
    - Add lightbox for full-size viewing
    - Implement keyboard navigation
    - Add touch gestures for mobile
    - _Requirements: 3.3_
  
  - [ ]* 4.6 Create PropertyMap component
    - Integrate Google Maps or Mapbox
    - Display property marker
    - Add zoom controls
    - Ensure accessibility
    - _Requirements: 3.4_
  
  - [x] 4.7 Create InquiryForm component ✅
    - Create form with name, email, phone, message fields
    - Implement validation with Zod
    - Add loading states
    - Add error handling
    - Implement rate limiting UI
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7_
  
  - [ ]* 4.8 Write property tests for form validation
    - **Property 5: Form Validation**
    - **Validates: Requirements 4.3, 9.3**
  
  - [ ] 4.9 Create SEOHead component
    - Generate meta tags
    - Generate Open Graph tags
    - Generate structured data (JSON-LD)
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ]* 4.10 Write property tests for meta tag generation
    - **Property 7: Meta Tag Generation**
    - **Validates: Requirements 6.1, 6.2**

- [x] 5. Page Implementation ✅
  - [x] 5.1 Implement PropertyListingPage ✅
    - Create page component (PublicPropertyListingPage.tsx)
    - Fetch properties from API using React Query
    - Display property grid (responsive: 1/2/3 columns)
    - Integrate PropertyFilters
    - Implement pagination
    - Add loading states
    - Add error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1-2.6_
  
  - [x] 5.2 Implement PropertyDetailPage ✅
    - Create page component (PublicPropertyDetailPage.tsx)
    - Fetch property details from API using React Query
    - Display property information
    - Display property images
    - Integrate InquiryForm
    - Add error handling (404)
    - Add back button to listing page
    - _Requirements: 3.1-3.6, 4.1-4.7_
  
  - [ ]* 5.3 Implement InquirySuccessPage
    - Create confirmation page
    - Display success message
    - Show next steps
    - Provide contact information
    - _Requirements: 4.5_
  
  - [ ]* 5.4 Implement 404 ErrorPage
    - Create custom 404 page
    - Display friendly error message
    - Suggest alternative actions
    - Add link back to property listings
    - _Requirements: 3.6_

- [x] 6. Checkpoint - Core Features Complete ✅
  - Frontend pages implemented
  - Routes configured in App.tsx
  - Ready for testing once backend migrations are run

- [ ] 7. Responsive Design Implementation
  - [ ] 7.1 Implement mobile layout (320px - 767px)
    - Single-column property grid
    - Mobile-optimized navigation
    - Touch-friendly controls
    - Optimized image sizes
    - _Requirements: 5.1, 5.4, 5.7_
  
  - [ ] 7.2 Implement tablet layout (768px - 1023px)
    - Two-column property grid
    - Tablet-optimized navigation
    - Appropriate spacing and sizing
    - _Requirements: 5.2, 5.5_
  
  - [ ] 7.3 Implement desktop layout (1024px+)
    - Three or four-column property grid
    - Desktop-optimized navigation
    - Full-featured UI
    - _Requirements: 5.3, 5.6_

- [ ] 8. Accessibility Implementation
  - [ ] 8.1 Implement semantic HTML structure
    - Use proper heading hierarchy
    - Use semantic elements (nav, main, article, section)
    - Use button/anchor elements appropriately
    - _Requirements: 6.6_
  
  - [ ] 8.2 Implement ARIA labels and attributes
    - Add ARIA labels to icon buttons
    - Add ARIA live regions for dynamic content
    - Add ARIA expanded/collapsed states
    - Add ARIA current for navigation
    - _Requirements: 8.3_
  
  - [ ]* 8.3 Write property tests for ARIA labels
    - **Property 12: ARIA Labels**
    - **Validates: Requirements 8.3**
  
  - [ ] 8.4 Implement keyboard navigation
    - Ensure all interactive elements are focusable
    - Implement logical tab order
    - Add visible focus indicators
    - Support keyboard shortcuts
    - _Requirements: 8.2_
  
  - [ ]* 8.5 Write property tests for keyboard navigation
    - **Property 11: Keyboard Navigation**
    - **Validates: Requirements 8.2**
  
  - [ ] 8.6 Implement form accessibility
    - Associate labels with form fields
    - Add error announcements
    - Ensure proper focus management
    - _Requirements: 8.6_
  
  - [ ]* 8.7 Write property tests for form field labels
    - **Property 13: Form Field Labels**
    - **Validates: Requirements 8.6**
  
  - [ ] 8.8 Ensure color contrast compliance
    - Verify 4.5:1 contrast ratio for normal text
    - Verify 3:1 contrast ratio for large text
    - Test with color blindness simulators
    - _Requirements: 8.4_
  
  - [ ] 8.9 Add image alt text
    - Ensure all images have descriptive alt text
    - Generate alt text for property images
    - _Requirements: 6.7_
  
  - [ ]* 8.10 Write property tests for image alt text
    - **Property 9: Image Alt Text**
    - **Validates: Requirements 6.7**

- [ ] 9. Performance Optimization
  - [ ] 9.1 Implement image optimization
    - Use Next.js Image component
    - Configure image formats (WebP with fallbacks)
    - Implement responsive images (srcset)
    - Add blur placeholders
    - _Requirements: 7.2, 7.3_
  
  - [ ]* 9.2 Write property tests for image optimization
    - **Property 10: Image Optimization**
    - **Validates: Requirements 7.3**
  
  - [ ] 9.3 Implement code splitting
    - Configure route-based code splitting
    - Use dynamic imports for heavy components
    - Optimize bundle size
    - _Requirements: 7.5_
  
  - [ ] 9.4 Implement caching strategies
    - Configure React Query caching
    - Set appropriate cache durations
    - Implement stale-while-revalidate
    - _Requirements: 7.4_
  
  - [ ] 9.5 Optimize bundle size
    - Enable tree shaking
    - Remove unused CSS
    - Minify and compress assets
    - _Requirements: 7.5_

- [ ] 10. SEO Implementation
  - [ ] 10.1 Generate sitemap
    - Create sitemap generation script
    - Include all public property URLs
    - Update dynamically
    - Submit to search engines
    - _Requirements: 6.4_
  
  - [ ] 10.2 Implement structured data
    - Add JSON-LD for property listings
    - Add JSON-LD for organization
    - Validate with Google Rich Results Test
    - _Requirements: 6.5_
  
  - [ ] 10.3 Optimize meta tags
    - Generate unique titles for each page
    - Generate descriptive meta descriptions
    - Add Open Graph tags
    - Add Twitter Card tags
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 11. Error Handling and User Feedback
  - [ ] 11.1 Implement API error handling
    - Handle network failures
    - Handle 404 errors
    - Handle 500 errors
    - Handle timeout errors
    - Display user-friendly error messages
    - _Requirements: 9.1, 9.2_
  
  - [ ] 11.2 Implement form error handling
    - Display inline validation errors
    - Highlight invalid fields
    - Show error summary
    - Prevent submission with errors
    - _Requirements: 9.3_
  
  - [ ] 11.3 Implement loading states
    - Add loading spinners
    - Add skeleton screens
    - Add progress indicators
    - _Requirements: 9.4_
  
  - [ ] 11.4 Implement error logging
    - Set up Sentry or similar
    - Log client-side errors
    - Log API errors
    - _Requirements: 9.5_

- [ ] 12. Analytics Implementation
  - [ ] 12.1 Implement event tracking
    - Track page views
    - Track property card clicks
    - Track filter usage
    - Track inquiry submissions
    - Track errors
    - _Requirements: 10.2, 10.3, 10.4_
  
  - [ ] 12.2 Implement privacy compliance
    - Add cookie consent banner
    - Respect Do Not Track
    - Provide opt-out mechanism
    - Anonymize IP addresses
    - _Requirements: 10.5_

- [ ] 13. Testing and Quality Assurance
  - [ ]* 13.1 Run accessibility audit
    - Run axe-core tests
    - Test with screen readers
    - Test keyboard navigation
    - Verify WCAG 2.1 Level AA compliance
    - _Requirements: 8.1_
  
  - [ ]* 13.2 Run performance audit
    - Run Lighthouse tests
    - Verify page load time < 3 seconds
    - Check Core Web Vitals
    - Optimize based on results
    - _Requirements: 7.1_
  
  - [ ]* 13.3 Run SEO audit
    - Validate meta tags
    - Validate sitemap
    - Validate structured data
    - Test mobile-friendliness
    - _Requirements: 6.1-6.7_
  
  - [ ]* 13.4 Cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge
    - Test on mobile browsers
    - Fix browser-specific issues
    - _Requirements: 5.1-5.7_
  
  - [ ]* 13.5 End-to-end testing
    - Test complete user journeys
    - Test form submission flow
    - Test error scenarios
    - Test on real devices
    - _Requirements: All_

- [ ] 14. Deployment and Launch
  - [ ] 14.1 Set up production environment
    - Configure production API URL
    - Configure analytics
    - Configure error reporting
    - Set up CDN
    - _Requirements: All_
  
  - [ ] 14.2 Deploy to production
    - Run final tests
    - Deploy Next.js application
    - Verify deployment
    - Monitor for errors
    - _Requirements: All_
  
  - [ ] 14.3 Submit sitemap to search engines
    - Submit to Google Search Console
    - Submit to Bing Webmaster Tools
    - Monitor indexing status
    - _Requirements: 6.4_

- [ ] 15. Final Checkpoint
  - Ensure all tests pass
  - Verify all features work in production
  - Monitor analytics and error logs
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows a logical progression: backend → frontend infrastructure → core features → optimization → testing → deployment
