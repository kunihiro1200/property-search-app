# Quick Start Guide - Property URL Manual Edit

## Overview

This feature adds manual editing capability for two URL fields in property listings:
1. **Google Map URL** (`google_map_url`) - Location map link
2. **Storage Location** (`storage_location`) - Google Drive folder link

## What You Need to Know

### Current State
- Both URL fields exist in the `property_listings` table
- Currently displayed as read-only in the property detail page
- `google_map_url` is used for distribution area calculation
- `storage_location` is used for image retrieval

### What's Being Added
- Inline editing UI for both URL fields
- URL validation (format checking)
- API endpoints for updating URLs
- Automatic distribution area recalculation when map URL changes

## Quick Implementation Steps

### Step 1: Backend (2-3 hours)

1. **Create URL Validator** (`backend/src/utils/urlValidator.ts`)
   - Validates Google Map URL patterns
   - Validates Google Drive folder URL patterns
   - Sanitizes input

2. **Add API Endpoints** (`backend/src/routes/propertyListings.ts`)
   - `PATCH /:propertyNumber/google-map-url`
   - `PATCH /:propertyNumber/storage-location`
   - Both endpoints validate and update the database

### Step 2: Frontend (3-4 hours)

1. **Create EditableUrlField Component** (`frontend/src/components/EditableUrlField.tsx`)
   - Reusable component for URL editing
   - Shows link when not editing
   - Shows input field with save/cancel when editing
   - Validates URL format
   - Handles loading and error states

2. **Update Property Detail Page** (`frontend/src/pages/PropertyListingDetailPage.tsx`)
   - Add new "地図・サイトURL" section
   - Use EditableUrlField for both URLs
   - Handle success/error notifications

### Step 3: Testing (2-3 hours)

1. **Manual Testing**
   - Edit Google Map URL → verify distribution areas update
   - Edit Storage Location → verify images update
   - Test invalid URLs → verify error messages
   - Test empty URLs → verify they're accepted

2. **Unit Tests** (optional but recommended)
   - URL validator tests
   - Component tests
   - API endpoint tests

## Example Usage

### User Workflow

1. User opens property detail page
2. Sees "地図・サイトURL" section with two URL fields
3. Clicks edit icon next to Google Map URL
4. Enters new URL: `https://maps.google.com/maps?q=35.6812,139.7671`
5. Clicks "保存" button
6. System validates URL, updates database, recalculates distribution areas
7. Success message appears
8. URL is now displayed as clickable link

### API Example

```bash
# Update Google Map URL
curl -X PATCH http://localhost:3001/api/property-listings/AA12345/google-map-url \
  -H "Content-Type: application/json" \
  -d '{"googleMapUrl": "https://maps.google.com/maps?q=35.6812,139.7671"}'

# Response
{
  "success": true,
  "distributionAreas": "1,2,3,4,5"
}
```

## Key Files to Modify

### Backend
- ✅ `backend/src/utils/urlValidator.ts` (NEW)
- ✅ `backend/src/routes/propertyListings.ts` (MODIFY)
- ⚠️ `backend/src/services/PropertyListingService.ts` (NO CHANGE - already handles distribution area recalculation)

### Frontend
- ✅ `frontend/src/components/EditableUrlField.tsx` (NEW)
- ✅ `frontend/src/pages/PropertyListingDetailPage.tsx` (MODIFY)

## URL Format Requirements

### Google Map URL
**Valid formats**:
- `https://maps.google.com/*`
- `https://www.google.com/maps/*`
- `https://goo.gl/maps/*`

**Examples**:
- ✅ `https://maps.google.com/maps?q=35.6812,139.7671`
- ✅ `https://www.google.com/maps/place/Tokyo`
- ✅ `https://goo.gl/maps/abc123`
- ❌ `http://maps.google.com/...` (must be HTTPS)
- ❌ `https://example.com/map` (wrong domain)

### Storage Location URL
**Valid formats**:
- `https://drive.google.com/drive/folders/*`
- `https://drive.google.com/drive/u/0/folders/*`

**Examples**:
- ✅ `https://drive.google.com/drive/folders/1a2b3c4d5e6f`
- ✅ `https://drive.google.com/drive/u/0/folders/1a2b3c4d5e6f`
- ❌ `https://drive.google.com/file/d/...` (must be folder, not file)
- ❌ `http://drive.google.com/...` (must be HTTPS)

## Common Issues & Solutions

### Issue: Distribution areas not updating after Google Map URL change
**Solution**: The `PropertyListingService.update()` method already handles this automatically. Make sure you're calling the update method with the `google_map_url` field.

### Issue: Images not loading after Storage Location change
**Solution**: The system uses `PropertyImageService` to fetch images from Google Drive. Make sure the URL points to a valid folder with proper permissions.

### Issue: URL validation too strict
**Solution**: Check the regex patterns in `urlValidator.ts`. You can add more patterns if needed.

### Issue: Empty URLs not accepted
**Solution**: Empty URLs should be accepted (optional fields). Check that your validation allows empty strings.

## Next Steps

1. **Start with Backend**: Implement URL validator and API endpoints
2. **Test Backend**: Use curl or Postman to test endpoints
3. **Build Frontend**: Create EditableUrlField component
4. **Integrate**: Add component to property detail page
5. **Test End-to-End**: Verify complete workflow
6. **Polish**: Add error handling, loading states, success messages

## Need Help?

- Check `requirements.md` for detailed requirements
- Check `design.md` for architecture details
- Check `tasks.md` for step-by-step implementation guide
- Refer to existing inline edit components in buyer detail page for UI patterns

## Estimated Timeline

- **Backend**: 2-3 hours
- **Frontend**: 3-4 hours
- **Testing**: 2-3 hours
- **Total**: 7-10 hours

Good luck with the implementation! 🚀
