# Quick Start Guide - Phase 1 Seller List Management

## 🚀 Get Started in 3 Steps

### Step 1: Run the Migration (2 minutes)

```bash
cd backend
npx ts-node migrations/migrate.ts
```

**Expected output:**
```
🚀 Starting migration process...
📋 Checking migrations table...
✅ Migrations table ready
📊 Found 0 executed migrations
📁 Found 1 migration files

🔄 Executing migration: 007_phase1_seller_enhancements
   Executing statement 1/50...
   Executing statement 2/50...
   ...
✅ Migration 007_phase1_seller_enhancements completed successfully

✨ Migration process completed!
   Executed: 1 new migrations
   Skipped: 0 existing migrations
```

### Step 2: Verify the Migration (1 minute)

```bash
npx ts-node migrations/verify-migration.ts
```

**Expected output:**
```
🚀 Starting Phase 1 migration verification...

🔍 Verifying sellers table columns...
✅ seller_number
✅ inquiry_source
✅ inquiry_year
✅ is_unreachable
✅ confidence_level
✅ duplicate_confirmed
✅ version
... (all columns)

🔍 Verifying seller_number_sequence table...
✅ seller_number_sequence table exists
   Current number: 0

🔍 Verifying seller_history table...
✅ seller_history table exists

🔍 Verifying generate_seller_number function...
✅ generate_seller_number function works
   Generated: AA00001

🔍 Verifying indexes...
✅ idx_sellers_seller_number
✅ idx_sellers_inquiry_source
... (all indexes)

📊 Verification Summary:
   Seller columns: ✅ PASS
   Sequence table: ✅ PASS
   History table: ✅ PASS
   Function: ✅ PASS
   Indexes: ✅ PASS

✨ All verifications passed! Phase 1 migration is complete.
```

### Step 3: Test the API (2 minutes)

Start the backend server:
```bash
npm run dev
```

Test seller creation:
```bash
curl -X POST http://localhost:3001/api/sellers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "山田太郎",
    "address": "東京都渋谷区1-2-3",
    "phoneNumber": "090-1234-5678",
    "email": "yamada@example.com",
    "inquirySource": "ウ",
    "inquiryYear": 2025,
    "inquiryDate": "2025-01-03",
    "confidenceLevel": "A",
    "firstCallerInitials": "YT",
    "property": {
      "address": "東京都渋谷区1-2-3",
      "prefecture": "東京都",
      "city": "渋谷区",
      "propertyType": "detached_house",
      "landArea": 100.5,
      "buildingArea": 80.0
    }
  }'
```

**Expected response:**
```json
{
  "seller": {
    "id": "uuid-here",
    "sellerNumber": "AA00001",
    "name": "山田太郎",
    "address": "東京都渋谷区1-2-3",
    "phoneNumber": "090-1234-5678",
    "email": "yamada@example.com",
    "inquirySource": "ウ",
    "inquiryYear": 2025,
    "inquiryDate": "2025-01-03",
    "confidenceLevel": "A",
    "firstCallerInitials": "YT",
    "createdAt": "2025-01-03T...",
    "updatedAt": "2025-01-03T..."
  },
  "duplicateWarning": {
    "hasDuplicates": false,
    "matches": [],
    "canProceed": true
  }
}
```

## 📋 Available API Endpoints

### Create Seller
```bash
POST /api/sellers
```

### List Sellers (with filters)
```bash
GET /api/sellers?page=1&pageSize=50&inquirySource=ウ&confidenceLevel=A
```

### Search Sellers
```bash
GET /api/sellers/search?q=山田
```

### Get Seller by ID
```bash
GET /api/sellers/:id
```

### Update Seller
```bash
PUT /api/sellers/:id
```

### Check for Duplicates
```bash
GET /api/sellers/check-duplicate?phone=090-1234-5678&email=yamada@example.com
```

### Mark as Unreachable
```bash
POST /api/sellers/:id/mark-unreachable
```

### Confirm Duplicate
```bash
POST /api/sellers/:id/confirm-duplicate
```

### Get Duplicate History
```bash
GET /api/sellers/:id/duplicate-history
```

## 🔑 Key Features

### 1. Seller Number Generation
- Automatic generation in format AA00001, AA00002, etc.
- Atomic generation (no duplicates even with concurrent requests)
- Unique constraint enforced at database level

### 2. Encryption
- Personal information (name, address, phone, email) encrypted with AES-256-GCM
- Automatic encryption on create/update
- Automatic decryption on read

### 3. Duplicate Detection
- Checks phone number and email for duplicates
- Shows past owner and property information
- Tracks duplicate relationships in seller_history table
- Allows duplicate confirmation workflow

### 4. Filtering & Search
- Filter by inquiry source, year, confidence level, unreachable status
- Search by name, address, phone number, seller number
- Pagination support (default 50 per page)
- Sorting support

### 5. Optimistic Locking
- Version field prevents concurrent update conflicts
- Automatic version increment on update

## 🎯 Common Use Cases

### Create a new seller with duplicate check
```typescript
const response = await fetch('/api/sellers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: '山田太郎',
    phoneNumber: '090-1234-5678',
    // ... other fields
  })
});

const { seller, duplicateWarning } = await response.json();

if (duplicateWarning.hasDuplicates) {
  console.log('Found duplicates:', duplicateWarning.matches);
  // Show warning to user
}
```

### List sellers with filters
```typescript
const response = await fetch(
  '/api/sellers?inquirySource=ウ&confidenceLevel=A&page=1&pageSize=50',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { data, total, page, pageSize, totalPages } = await response.json();
```

### Search sellers
```typescript
const response = await fetch('/api/sellers/search?q=山田', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const sellers = await response.json();
```

### Mark seller as unreachable
```typescript
await fetch(`/api/sellers/${sellerId}/mark-unreachable`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🐛 Troubleshooting

### Migration fails
1. Check Supabase connection:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_KEY
   ```
2. Verify .env file exists in backend directory
3. Check Supabase dashboard for errors

### Verification fails
1. Run migration again: `npx ts-node migrations/migrate.ts`
2. Check which specific verification failed
3. Manually check in Supabase SQL Editor

### API returns 401 Unauthorized
1. Check authentication token is valid
2. Verify authenticate middleware is working
3. Check employee exists in database

### Duplicate detection not working
1. Verify seller_history table exists
2. Check phone/email are encrypted correctly
3. Test with known duplicate data

## 📚 Next Steps

After Phase 1 is working:

1. **Phase 2**: Properties table and PropertyService
2. **Phase 3**: Valuations table and ValuationEngine
3. **Phase 4**: Activity logs and ActivityLogService
4. **Phase 5**: Follow-ups and FollowUpService
5. **Phase 6**: Appointments and CalendarService
6. **Phase 7**: Emails and EmailService
7. **Phase 8**: Google Sheets sync
8. **Phase 9**: Frontend components
9. **Phase 10**: Testing and deployment

## 💡 Tips

- Use seller numbers (AA00001) for user-facing references
- Always check for duplicates before creating sellers
- Use confidence levels to prioritize follow-ups
- Mark sellers as unreachable to track contact attempts
- Use the version field to prevent concurrent update conflicts

## 🆘 Need Help?

If you encounter issues:
1. Check the logs: `tail -f backend/logs/app.log`
2. Review the migration verification output
3. Check Supabase dashboard for database errors
4. Verify environment variables are set correctly
5. Test with curl commands to isolate frontend vs backend issues

---

**Congratulations! Phase 1 is complete and ready to use! 🎉**
