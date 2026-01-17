# Design Document: Public Property Site

## Overview

The Public Property Site is a customer-facing web application that allows potential buyers to browse and inquire about available properties without authentication. The system consists of a modern React-based frontend that consumes data from the existing backend API, with a focus on performance, SEO, and user experience.

### Key Design Principles

1. **Public-First**: No authentication required for browsing
2. **Performance**: Fast page loads and smooth interactions
3. **SEO-Optimized**: Discoverable via search engines
4. **Responsive**: Works seamlessly across all devices
5. **Accessible**: WCAG 2.1 Level AA compliant
6. **Secure**: Sensitive data never exposed to public

## Architecture

### System Architecture

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  React Frontend │
│  (Public Site)  │
│                 │
│  - Next.js      │
│  - React Query  │
│  - Tailwind CSS │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  Backend API    │
│  (Existing)     │
│                 │
│  - Express.js   │
│  - PostgreSQL   │
└─────────────────┘
```

### Technology Stack

**Frontend:**
- **Framework**: Next.js 14 (App Router) - for SSR, SSG, and SEO
- **UI Library**: React 18
- **Styling**: Tailwind CSS - for responsive design
- **State Management**: React Query (TanStack Query) - for server state
- **Forms**: React Hook Form + Zod - for validation
- **Image Optimization**: Next.js Image component
- **Maps**: Google Maps API or Mapbox
- **Analytics**: Google Analytics 4
- **Deployment**: Vercel or similar

**Backend:**
- Existing Express.js API with new public endpoints

### Deployment Architecture

```
┌──────────────────┐
│   Vercel CDN     │ ← Static assets, images
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Next.js Server  │ ← SSR/SSG pages
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Backend API    │ ← Property data
└──────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. Page Components

**PropertyListingPage**
- Displays grid of property cards
- Implements search and filter UI
- Handles pagination
- Server-side rendered for SEO

**PropertyDetailPage**
- Displays comprehensive property information
- Photo gallery with lightbox
- Interactive map
- Inquiry form
- Server-side rendered with dynamic metadata

**InquirySuccessPage**
- Confirmation page after inquiry submission
- Displays next steps
- Provides contact information

**ErrorPage (404)**
- Friendly error message
- Suggestions for alternative actions
- Link back to property listings

#### 2. Feature Components

**PropertyCard**
```typescript
interface PropertyCardProps {
  property: PublicProperty;
  onClick: () => void;
}
```
- Displays property thumbnail, price, address, type
- Responsive card layout
- Lazy-loaded images

**PropertyFilters**
```typescript
interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
  initialFilters?: PropertyFilters;
}

interface PropertyFilters {
  propertyType?: PropertyType[];
  priceRange?: { min?: number; max?: number };
  areas?: string[];
}
```
- Filter controls for property type, price, area
- Real-time filter application
- Clear filters button

**PropertyGallery**
```typescript
interface PropertyGalleryProps {
  images: PropertyImage[];
  propertyName: string;
}
```
- Image carousel/grid
- Lightbox for full-size viewing
- Keyboard navigation support

**PropertyMap**
```typescript
interface PropertyMapProps {
  latitude: number;
  longitude: number;
  propertyName: string;
}
```
- Interactive map display
- Property marker
- Zoom controls

**InquiryForm**
```typescript
interface InquiryFormProps {
  propertyId: string;
  propertyName: string;
  onSuccess: () => void;
}

interface InquiryFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}
```
- Form with validation
- Rate limiting
- Loading states
- Error handling

#### 3. Utility Components

**SEOHead**
```typescript
interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  canonicalUrl: string;
}
```
- Meta tags management
- Open Graph tags
- Structured data (JSON-LD)

**LoadingSpinner**
- Consistent loading indicator
- Accessible with ARIA labels

**ErrorMessage**
```typescript
interface ErrorMessageProps {
  message: string;
  retry?: () => void;
}
```
- User-friendly error display
- Optional retry action

### Backend API Endpoints

#### New Public Endpoints

**GET /api/public/properties**
- Returns list of ALL properties from property_listings table
- Supports query parameters for filtering
- Returns sanitized property data (no sensitive fields)
- Includes atbb_status field to determine badge display and clickability
- Badge logic:
  - Contains "公開中": No badge, clickable
  - Contains "公開前": "公開前" badge, clickable
  - Contains "非公開（配信メールのみ）": "配信限定" badge, clickable
  - Contains "非公開案件": "成約済み" badge, NOT clickable
  - All others: "成約済み" badge, NOT clickable
- Implements caching headers

Query Parameters:
```typescript
{
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  areas?: string[];
  page?: number;
  limit?: number;
}
```

Response:
```typescript
{
  properties: PublicProperty[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**GET /api/public/properties/:id**
- Returns detailed property information
- Only returns properties with atbb_status containing "公開中", "公開前", or "非公開（配信メールのみ）" (clickable properties)
- Returns 404 if property not found or atbb_status indicates "成約済み" status (including "非公開案件")
- Implements caching headers

Response:
```typescript
{
  property: PublicPropertyDetail;
}
```

**POST /api/public/inquiries**
- Accepts inquiry form submissions
- Validates input data
- Implements rate limiting (e.g., 3 requests per IP per hour)
- Sends notification to internal system
- Returns success/error response

Request Body:
```typescript
{
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}
```

Response:
```typescript
{
  success: boolean;
  message: string;
}
```

**GET /api/public/sitemap**
- Generates XML sitemap
- Lists all public property URLs
- Updates dynamically based on available properties

## Data Models

### PublicProperty (List View)

```typescript
interface PublicProperty {
  id: string;
  propertyNumber: string;
  address: string;
  price: number;
  propertyType: PropertyType;
  thumbnailImage: string;
  keyFeatures: string[];
  atbbStatus: string; // e.g., "専任・公開中", "一般・公開中", "公開前", "非公開（配信メールのみ）", "非公開案件", "成約済み", etc.
  badgeType: BadgeType; // Computed based on atbbStatus
  isClickable: boolean; // Computed: true if atbbStatus contains "公開中", "公開前", "非公開（配信メールのみ）", or "非公開案件"
  createdAt: Date;
}

type PropertyType = '戸建て' | 'マンション' | '土地';

type BadgeType = 
  | 'none'                    // atbbStatus contains "公開中" - no badge displayed
  | 'pre_release'             // atbbStatus contains "公開前" - displays "公開前" badge
  | 'email_only'              // atbbStatus contains "非公開（配信メールのみ）" - displays "配信限定" badge
  | 'sold';                   // atbbStatus contains "非公開案件" or all other cases - displays "成約済み" badge (NOT clickable)

// Badge display helper functions
function getBadgeType(atbbStatus: string): BadgeType {
  if (!atbbStatus) return 'sold';
  if (atbbStatus.includes('公開中')) return 'none';
  if (atbbStatus.includes('公開前')) return 'pre_release';
  if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
  // "非公開案件" and all other cases return 'sold'
  return 'sold';
}

function isPropertyClickable(atbbStatus: string): boolean {
  if (!atbbStatus) return false;
  // Only "公開中", "公開前", and "非公開（配信メールのみ）" are clickable
  // "非公開案件" and all other statuses are NOT clickable
  return atbbStatus.includes('公開中') || 
         atbbStatus.includes('公開前') || 
         atbbStatus.includes('非公開（配信メールのみ）');
}

// Badge display text mapping
const BADGE_TEXT_MAP: Record<BadgeType, string | null> = {
  'none': null,
  'pre_release': '公開前',
  'email_only': '配信限定',
  'sold': '成約済み'
};
```

### PublicPropertyDetail (Detail View)

```typescript
interface PublicPropertyDetail extends PublicProperty {
  description: string;
  images: PropertyImage[];
  specifications: PropertySpecifications;
  location: PropertyLocation;
  features: string[];
}

interface PropertyImage {
  url: string;
  alt: string;
  order: number;
}

interface PropertySpecifications {
  landArea?: number;
  buildingArea?: number;
  buildingStructure?: string;
  buildYear?: number;
  rooms?: string;
  parking?: string;
  // ... other public specifications
}

interface PropertyLocation {
  latitude: number;
  longitude: number;
  address: string;
  nearestStation?: string;
  walkingDistance?: number;
}
```

### Data Sanitization

The backend must filter out sensitive fields before returning data:

**Excluded Fields:**
- Seller personal information (name, contact)
- Internal notes and comments
- Employee assignments
- Acquisition details
- Internal status codes
- Profit margins
- Any PII or business-sensitive data

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: All Properties Display
*For any* set of properties in the property_listings table, when fetching for public display, ALL properties should be returned regardless of their atbb_status.
**Validates: Requirements 1.1**

### Property 2: Badge Display Logic
*For any* property, when rendering the property card, the correct badge should be displayed based on atbbStatus:
- If atbbStatus contains "公開中": No badge
- If atbbStatus contains "公開前": "公開前" badge
- If atbbStatus contains "非公開（配信メールのみ）": "配信限定" badge
- If atbbStatus contains "非公開案件": "成約済み" badge
- Otherwise: "成約済み" badge
**Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7**

### Property 3: Clickable Property Logic
*For any* property, when rendering the property card, the card should be clickable if and only if atbbStatus contains "公開中", "公開前", or "非公開（配信メールのみ）". Properties with "非公開案件" or other statuses should NOT be clickable.
**Validates: Requirements 1.6, 1.8, 3.1, 3.2**

### Property 4: Property Card Rendering
*For any* valid property object, when rendering a property card, the output should contain the thumbnail image, address, price, property type, and key features.
**Validates: Requirements 1.2**
### Property 5: Search Filtering
*For any* search criteria and property dataset, when applying filters, all returned properties should match the specified criteria.
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 6: Data Sanitization
*For any* property object with both public and sensitive fields, when preparing data for public API response, the output should contain no sensitive fields (seller details, internal notes, employee information).
**Validates: Requirements 3.3, 3.6**

### Property 7: Form Validation
*For any* inquiry form submission with invalid data, the validation should return specific error messages for each invalid field.
**Validates: Requirements 4.3, 9.3**

### Property 8: Rate Limiting
*For any* sequence of inquiry submissions from the same source, when the rate limit is exceeded, subsequent submissions should be rejected until the rate limit window resets.
**Validates: Requirements 4.7**

### Property 9: Meta Tag Generation
*For any* property, when generating SEO metadata, the title and description should be unique and descriptive, containing the property address and key features.
**Validates: Requirements 6.1, 6.2**

### Property 10: Sitemap Completeness
*For any* set of properties, the generated sitemap should contain URLs for all and only those properties with atbb_status containing "公開中", "公開前", or "非公開（配信メールのみ）" (i.e., properties with accessible detail pages). Properties with "非公開案件" should NOT be included in the sitemap.
**Validates: Requirements 6.4**

### Property 11: Image Alt Text
*For any* rendered page with images, all img elements should have non-empty alt attributes.
**Validates: Requirements 6.7**

### Property 12: Image Optimization
*For any* property image, when served to the client, the image should be compressed and appropriately sized for the display context.
**Validates: Requirements 7.3**

### Property 13: Keyboard Navigation
*For any* interactive element on the page, it should be reachable and operable via keyboard alone.
**Validates: Requirements 8.2**

### Property 14: ARIA Labels
*For any* interactive element without visible text, it should have an appropriate ARIA label for screen readers.
**Validates: Requirements 8.3**

### Property 15: Form Field Labels
*For any* form field, it should have an associated label element or aria-label attribute.
**Validates: Requirements 8.6**

## Error Handling

### Frontend Error Handling

**API Errors:**
- Network failures: Display "接続エラーが発生しました。しばらくしてから再度お試しください。"
- 404 errors: Redirect to custom 404 page
- 500 errors: Display generic error message with retry option
- Timeout errors: Display timeout message with retry option

**Form Validation Errors:**
- Display inline error messages below each invalid field
- Highlight invalid fields with red border
- Prevent submission until all errors are resolved
- Show summary of errors at top of form

**Rate Limiting:**
- Display message: "送信回数が上限に達しました。しばらくしてから再度お試しください。"
- Show countdown timer until rate limit resets
- Disable submit button during rate limit period

**Image Loading Errors:**
- Display placeholder image
- Log error for monitoring
- Don't break page layout

### Backend Error Handling

**Invalid Requests:**
- Return 400 Bad Request with validation errors
- Log invalid requests for security monitoring

**Rate Limit Exceeded:**
- Return 429 Too Many Requests
- Include Retry-After header
- Log rate limit violations

**Database Errors:**
- Return 500 Internal Server Error
- Log error details for debugging
- Don't expose internal error details to client

**Property Not Found:**
- Return 404 Not Found
- Log access attempts to non-existent properties

## Testing Strategy

### Unit Testing

**Frontend:**
- Component rendering tests (React Testing Library)
- Form validation logic tests
- Data transformation/sanitization tests
- Utility function tests
- Filter logic tests

**Backend:**
- API endpoint tests
- Data sanitization tests
- Rate limiting logic tests
- Validation logic tests

### Property-Based Testing

Each correctness property should be implemented as a property-based test with minimum 100 iterations:

**Property 1 Test:**
```typescript
// Feature: public-property-site, Property 1: All Properties Display
test('all properties are returned regardless of atbb_status', () => {
  fc.assert(
    fc.property(
      fc.array(propertyGenerator()),
      (properties) => {
        const result = getPublicProperties(properties);
        return result.length === properties.length;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 2 Test:**
```typescript
// Feature: public-property-site, Property 2: Badge Display Logic
test('properties display correct badge based on atbb_status', () => {
  fc.assert(
    fc.property(
      propertyGenerator(),
      (property) => {
        const expectedBadge = getBadgeType(property.atbb_status);
        const rendered = renderPropertyCard(property);
        
        // Verify badge type matches
        if (expectedBadge !== rendered.badgeType) return false;
        
        // Verify badge text matches expected display text
        const expectedText = BADGE_TEXT_MAP[expectedBadge];
        if (expectedText === null) {
          return rendered.badgeText === null;
        }
        
        // Special case: "非公開案件" should display "成約済み" badge
        if (property.atbb_status?.includes('非公開案件')) {
          return rendered.badgeType === 'sold' && rendered.badgeText === '成約済み';
        }
        
        return rendered.badgeText === expectedText;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 3 Test:**
```typescript
// Feature: public-property-site, Property 3: Clickable Property Logic
test('properties are clickable only for specific atbb_status values', () => {
  fc.assert(
    fc.property(
      propertyGenerator(),
      (property) => {
        const expectedClickable = isPropertyClickable(property.atbb_status);
        const rendered = renderPropertyCard(property);
        
        // Verify clickability matches expected
        if (expectedClickable !== rendered.isClickable) return false;
        
        // Special case: "非公開案件" should NOT be clickable
        if (property.atbb_status?.includes('非公開案件')) {
          return rendered.isClickable === false;
        }
        
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 6 Test:**
```typescript
// Feature: public-property-site, Property 6: Data Sanitization
test('sensitive fields are excluded from public API response', () => {
  fc.assert(
    fc.property(
      propertyWithSensitiveDataGenerator(),
      (property) => {
        const sanitized = sanitizePropertyForPublic(property);
        return !hasSensitiveFields(sanitized);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 8 Test:**
```typescript
// Feature: public-property-site, Property 8: Rate Limiting
test('rate limiting rejects excessive submissions', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 4, max: 20 }),
      (numSubmissions) => {
        const rateLimiter = new RateLimiter({ limit: 3, window: 3600 });
        const results = Array.from({ length: numSubmissions }, () =>
          rateLimiter.checkLimit('test-ip')
        );
        const allowed = results.filter(r => r.allowed).length;
        return allowed === 3;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

- API endpoint integration tests
- Frontend-backend integration tests
- Form submission flow tests
- Error handling flow tests

### End-to-End Testing

- User journey tests (browse → view detail → submit inquiry)
- Cross-browser testing
- Mobile device testing
- Accessibility testing (axe-core)
- Performance testing (Lighthouse)

### SEO Testing

- Meta tags validation
- Sitemap validation
- Structured data validation (Google Rich Results Test)
- Page speed testing
- Mobile-friendliness testing

## Performance Optimization

### Frontend Optimization

**Code Splitting:**
- Route-based code splitting with Next.js
- Dynamic imports for heavy components (map, gallery)
- Separate vendor bundles

**Image Optimization:**
- Next.js Image component with automatic optimization
- WebP format with fallbacks
- Responsive images (srcset)
- Lazy loading below the fold
- Blur placeholder for loading state

**Caching Strategy:**
- React Query for server state caching
- Stale-while-revalidate for property data
- Cache property list for 5 minutes
- Cache property details for 10 minutes

**Bundle Optimization:**
- Tree shaking
- Minification
- Compression (gzip/brotli)
- Remove unused CSS (PurgeCSS via Tailwind)

### Backend Optimization

**API Caching:**
- Cache public property list for 5 minutes
- Cache individual property details for 10 minutes
- Use Redis or in-memory cache
- Implement cache invalidation on property updates

**Database Optimization:**
- Index on atbb_status column for filtering clickable properties
- Index on property_number for lookups
- Optimize query to fetch only public fields
- Use database views for public data

**Response Optimization:**
- Compress responses (gzip)
- Implement pagination (default 20 items per page)
- Return only necessary fields
- Use ETags for conditional requests

## Security Considerations

### Data Protection

- Never expose sensitive fields in public API
- Implement data sanitization at API layer
- Validate all user inputs
- Sanitize user-generated content (inquiry messages)

### Rate Limiting

- Implement rate limiting on inquiry endpoint
- Track by IP address
- Consider CAPTCHA for additional protection
- Log suspicious activity

### CORS Configuration

- Configure CORS to allow only frontend domain
- Implement CSRF protection for form submissions

### Input Validation

- Validate all form inputs on both client and server
- Sanitize inputs to prevent XSS
- Implement email validation
- Implement phone number format validation

## Accessibility Implementation

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Use semantic elements (nav, main, article, section)
- Use button elements for clickable actions
- Use anchor elements for navigation

### ARIA Implementation

- Add ARIA labels to icon buttons
- Add ARIA live regions for dynamic content updates
- Add ARIA expanded/collapsed states for accordions
- Add ARIA current for active navigation items

### Keyboard Navigation

- Ensure all interactive elements are focusable
- Implement logical tab order
- Add visible focus indicators
- Support keyboard shortcuts (Esc to close modals)

### Color and Contrast

- Maintain 4.5:1 contrast ratio for normal text
- Maintain 3:1 contrast ratio for large text
- Don't rely solely on color to convey information
- Test with color blindness simulators

## SEO Implementation

### Meta Tags

```typescript
// Example for property detail page
<Head>
  <title>{property.address} - {property.price}万円 | 不動産サイト名</title>
  <meta name="description" content={generateDescription(property)} />
  <meta property="og:title" content={property.address} />
  <meta property="og:description" content={generateDescription(property)} />
  <meta property="og:image" content={property.thumbnailImage} />
  <meta property="og:type" content="website" />
  <link rel="canonical" href={`https://example.com/properties/${property.id}`} />
</Head>
```

### Structured Data

```typescript
// JSON-LD for property listing
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": property.address,
  "description": property.description,
  "price": property.price,
  "priceCurrency": "JPY",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": property.location.city,
    "addressRegion": property.location.prefecture,
    "streetAddress": property.address
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": property.location.latitude,
    "longitude": property.location.longitude
  },
  "image": property.images.map(img => img.url)
}
```

### Sitemap Generation

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/properties/{id}</loc>
    <lastmod>{property.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

## Analytics Implementation

### Google Analytics 4 Setup

**Events to Track:**
- Page views (automatic)
- Property card clicks
- Filter usage
- Search queries
- Inquiry form submissions
- Inquiry form errors
- Map interactions
- Image gallery interactions

**Custom Dimensions:**
- Property type
- Price range
- Area
- Device type

**Example Event:**
```typescript
gtag('event', 'property_view', {
  property_id: property.id,
  property_type: property.propertyType,
  price: property.price,
  area: property.location.area
});
```

### Privacy Compliance

- Implement cookie consent banner
- Respect Do Not Track headers
- Provide opt-out mechanism
- Anonymize IP addresses
- Document data collection in privacy policy

## Deployment Strategy

### Build Process

1. Run tests (unit, integration, property-based)
2. Run linting and type checking
3. Build Next.js application
4. Optimize assets
5. Generate sitemap
6. Deploy to Vercel/hosting platform

### Environment Configuration

**Development:**
- API URL: http://localhost:3001
- Analytics: Disabled
- Error reporting: Console only

**Staging:**
- API URL: https://staging-api.example.com
- Analytics: Test property
- Error reporting: Sentry (staging)

**Production:**
- API URL: https://api.example.com
- Analytics: Production property
- Error reporting: Sentry (production)
- CDN: Enabled

### Monitoring

- Error tracking (Sentry)
- Performance monitoring (Vercel Analytics)
- Uptime monitoring
- API response time monitoring
- User analytics (Google Analytics)

## Future Enhancements

1. **Advanced Search:**
   - Map-based search
   - Saved searches
   - Email alerts for new properties

2. **User Accounts:**
   - Save favorite properties
   - Inquiry history
   - Personalized recommendations

3. **Virtual Tours:**
   - 360° property tours
   - Video walkthroughs

4. **Multilingual Support:**
   - English version
   - Internationalization (i18n)

5. **Progressive Web App:**
   - Offline support
   - Install to home screen
   - Push notifications
