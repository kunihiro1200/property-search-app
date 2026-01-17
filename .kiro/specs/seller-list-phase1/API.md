# Phase 1 API Documentation

## Overview

This document describes the Phase 1 enhancements to the Seller Management API, including new fields, endpoints, and functionality for seller number generation, inquiry tracking, and duplicate detection.

## New Fields

### Seller Object - Phase 1 Fields

```typescript
{
  // Existing fields...
  
  // Phase 1 additions
  sellerNumber?: string;           // Auto-generated unique identifier (AA1, AA2, etc.)
  inquirySource?: string;          // Source of inquiry (e.g., "ウ", "L", "紹介")
  inquiryYear?: number;            // Year of inquiry
  inquiryDate?: Date;              // Date of inquiry
  inquiryDatetime?: Date;          // Full datetime of inquiry (optional)
  isUnreachable?: boolean;         // Phone unreachable flag
  unreachableSince?: Date;         // When marked unreachable
  firstCallerInitials?: string;    // First contact person initials
  firstCallerEmployeeId?: string;  // First contact person ID
  confidenceLevel?: 'high' | 'medium' | 'low';  // Sale confidence
  duplicateConfirmed?: boolean;    // Duplicate review status
  duplicateConfirmedAt?: Date;     // When duplicate confirmed
  duplicateConfirmedBy?: string;   // Who confirmed duplicate
}
```

## Endpoints

### POST /sellers

Create a new seller with Phase 1 fields and automatic duplicate detection.

**Request Body:**
```json
{
  "name": "山田太郎",
  "address": "東京都渋谷区...",
  "phoneNumber": "090-1234-5678",
  "email": "yamada@example.com",
  "inquirySource": "ウ",
  "inquiryDate": "2024-12-02",
  "confidenceLevel": "high",
  "firstCallerInitials": "TK",
  "property": {
    "address": "東京都渋谷区...",
    "prefecture": "東京都",
    "city": "渋谷区",
    "propertyType": "detached_house"
  }
}
```

**Response:**
```json
{
  "seller": {
    "id": "uuid",
    "sellerNumber": "AA15",
    "name": "山田太郎",
    // ... other fields
  },
  "duplicateWarning": {
    "hasDuplicates": true,
    "matches": [
      {
        "sellerId": "uuid",
        "matchType": "phone",
        "sellerInfo": {
          "name": "山田太郎",
          "phoneNumber": "090-1234-5678",
          "sellerNumber": "AA10"
        },
        "propertyInfo": {
          "address": "東京都渋谷区...",
          "propertyType": "detached_house"
        }
      }
    ],
    "canProceed": true
  }
}
```

**Status Codes:**
- `201 Created` - Seller created successfully
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Server error

### GET /sellers

List sellers with Phase 1 filtering support.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 50, max: 100)
- `status` (string): Filter by status
- `inquirySource` (string): Filter by inquiry source
- `inquiryYearFrom` (number): Filter by inquiry year (from)
- `inquiryYearTo` (number): Filter by inquiry year (to)
- `isUnreachable` (boolean): Filter unreachable sellers
- `confidenceLevel` (string): Filter by confidence level ('high', 'medium', 'low')
- `firstCaller` (string): Filter by first caller initials
- `duplicateConfirmed` (boolean): Filter by duplicate confirmation status

**Example Request:**
```
GET /sellers?page=1&pageSize=50&inquirySource=ウ&confidenceLevel=high
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sellerNumber": "AA15",
      "name": "山田太郎",
      "inquirySource": "ウ",
      "inquiryDate": "2024-12-02",
      "confidenceLevel": "high",
      // ... other fields
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 50,
  "totalPages": 2
}
```

### GET /sellers/:id

Get seller details including Phase 1 fields.

**Response:**
```json
{
  "id": "uuid",
  "sellerNumber": "AA15",
  "name": "山田太郎",
  "inquirySource": "ウ",
  "inquiryDate": "2024-12-02",
  "confidenceLevel": "high",
  "firstCallerInitials": "TK",
  "isUnreachable": false,
  // ... other fields
}
```

### PATCH /sellers/:id

Update seller with Phase 1 field support.

**Request Body:**
```json
{
  "inquirySource": "L",
  "confidenceLevel": "medium",
  "isUnreachable": true
}
```

**Note:** `firstCallerInitials` cannot be modified once set.

**Response:**
```json
{
  "id": "uuid",
  "sellerNumber": "AA15",
  // ... updated fields
}
```

**Error Response (First Caller Immutability):**
```json
{
  "error": {
    "code": "UPDATE_SELLER_ERROR",
    "message": "First caller cannot be modified once set",
    "retryable": false
  }
}
```

### POST /sellers/:id/mark-unreachable

Mark a seller as unreachable.

**Response:**
```json
{
  "id": "uuid",
  "isUnreachable": true,
  "unreachableSince": "2024-12-02T10:30:00Z",
  // ... other fields
}
```

### POST /sellers/:id/clear-unreachable

Clear unreachable status.

**Response:**
```json
{
  "id": "uuid",
  "isUnreachable": false,
  "unreachableSince": null,
  // ... other fields
}
```

### POST /sellers/:id/confirm-duplicate

Confirm a seller as a duplicate.

**Response:**
```json
{
  "id": "uuid",
  "duplicateConfirmed": true,
  "duplicateConfirmedAt": "2024-12-02T10:30:00Z",
  "duplicateConfirmedBy": "employee-uuid",
  // ... other fields
}
```

### GET /sellers/:id/duplicate-history

Get duplicate history for a seller.

**Response:**
```json
[
  {
    "sellerId": "past-seller-uuid",
    "matchType": "phone",
    "sellerInfo": {
      "name": "山田太郎",
      "phoneNumber": "090-1234-5678",
      "inquiryDate": "2024-11-01"
    },
    "propertyInfo": {
      "address": "東京都渋谷区...",
      "propertyType": "detached_house"
    }
  }
]
```

### GET /sellers/check-duplicate

Check for duplicate sellers before creation.

**Query Parameters:**
- `phone` (string, required): Phone number to check
- `email` (string, optional): Email to check
- `excludeId` (string, optional): Seller ID to exclude from results

**Response:**
```json
{
  "hasDuplicates": true,
  "matches": [
    {
      "sellerId": "uuid",
      "matchType": "both",
      "sellerInfo": {
        "name": "山田太郎",
        "phoneNumber": "090-1234-5678",
        "email": "yamada@example.com",
        "sellerNumber": "AA10"
      }
    }
  ],
  "canProceed": true
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [],  // Optional validation details
    "retryable": false
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `CREATE_SELLER_ERROR` - Failed to create seller
- `UPDATE_SELLER_ERROR` - Failed to update seller
- `DUPLICATE_DETECTION_ERROR` - Duplicate detection failed

## Validation Rules

### Seller Number
- Format: `AA{number}` (e.g., AA1, AA2, AA100)
- Auto-generated on creation
- Cannot be manually set or modified

### Inquiry Source
- Optional string field
- Common values: "ウ" (Web), "L" (LINE), "紹介" (Referral), "チラシ" (Flyer)

### Inquiry Date
- Optional ISO 8601 date string
- Must be a valid date

### Confidence Level
- Optional enum: 'high', 'medium', 'low'
- Represents likelihood of sale

### First Caller Initials
- Optional string (max 10 characters)
- Immutable once set
- Represents the employee who first contacted the seller

## Examples

### Creating a Seller with Phase 1 Fields

```bash
curl -X POST http://localhost:3000/sellers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "山田太郎",
    "address": "東京都渋谷区1-2-3",
    "phoneNumber": "090-1234-5678",
    "email": "yamada@example.com",
    "inquirySource": "ウ",
    "inquiryDate": "2024-12-02",
    "confidenceLevel": "high",
    "firstCallerInitials": "TK",
    "property": {
      "address": "東京都渋谷区1-2-3",
      "prefecture": "東京都",
      "city": "渋谷区",
      "propertyType": "detached_house"
    }
  }'
```

### Filtering Sellers by Phase 1 Fields

```bash
curl -X GET "http://localhost:3000/sellers?inquirySource=ウ&confidenceLevel=high&isUnreachable=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Marking a Seller as Unreachable

```bash
curl -X POST http://localhost:3000/sellers/SELLER_ID/mark-unreachable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Checking for Duplicates

```bash
curl -X GET "http://localhost:3000/sellers/check-duplicate?phone=090-1234-5678&email=yamada@example.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- All dates are in ISO 8601 format
- Phone numbers and emails are encrypted in the database
- Seller numbers are generated sequentially and cannot have gaps
- First caller initials are immutable to maintain audit trail
- Duplicate detection runs automatically on seller creation
