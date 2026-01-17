# Design Document

## Overview

公開物件サイトで「お気に入り文言」が表示されない問題を解決するため、スプレッドシートから取得した `favorite_comment` を `property_details` テーブルに同期します。既存の `recommended_comments` と `athome_data` の同期と同じパターンを使用します。

## Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│                  property_details Table                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ property_number                                        │ │
│  │ recommended_comments  ✅ 100% populated                │ │
│  │ athome_data          ✅ 100% populated                │ │
│  │ property_about       ⚠️  30% populated                 │ │
│  │ favorite_comment     ❌  0% populated (PROBLEM!)       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Target State

```
┌─────────────────────────────────────────────────────────────┐
│                  property_details Table                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ property_number                                        │ │
│  │ recommended_comments  ✅ 100% populated                │ │
│  │ athome_data          ✅ 100% populated                │ │
│  │ property_about       ⚠️  30% populated                 │ │
│  │ favorite_comment     ✅ 100% populated (FIXED!)        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Sync Process

```
┌─────────────────────────────────────────────────────────────┐
│                    Batch Sync Script                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Query property_listings for public properties           │
│     WHERE atbb_status IN (                                   │
│       '一般・公開中',                                         │
│       '専任・公開中',                                         │
│       '非公開（配信メールのみ）'                              │
│     )                                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. For each property:                                       │
│     - Get property_id and property_number                    │
│     - Check if favorite_comment already exists               │
│     - If not exists (or force update):                       │
│       → Call FavoriteCommentService.getFavoriteComment()     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FavoriteCommentService                          │
│  - Get storage_location from property_listings              │
│  - Extract spreadsheet URL                                   │
│  - Determine cell position based on property_type:          │
│    • 土地: B53                                               │
│    • 戸建て: B142                                            │
│    • マンション: B150                                        │
│  - Fetch from Google Sheets                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Save to property_details table:                          │
│     INSERT INTO property_details (                           │
│       property_number,                                       │
│       favorite_comment                                       │
│     )                                                        │
│     ON CONFLICT (property_number)                            │
│     DO UPDATE SET                                            │
│       favorite_comment = EXCLUDED.favorite_comment,          │
│       updated_at = NOW()                                     │
└─────────────────────────────────────────────────────────────┘
```

### Display Process (Already Implemented)

```
┌─────────────────────────────────────────────────────────────┐
│              PublicPropertyDetailPage                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GET /api/public/properties/:id/complete                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  PropertyListingService.getPropertyDetails()                │
│  → PropertyDetailsService.getPropertyDetails()              │
│  → Query property_details table                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Return {                                                    │
│    favoriteComment: "...",  ← Now populated!                │
│    recommendedComments: [...],                               │
│    athomeData: [...],                                        │
│    propertyAbout: "..."                                      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend displays favorite comment above images            │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Batch Sync Script (New)

**File:** `backend/sync-favorite-comments-to-database.ts`

**Purpose:** スプレッドシートから `favorite_comment` を取得し、`property_details` テーブルに保存

**Key Features:**
- 公開中物件のみを対象
- 既存データをスキップ（force update オプションあり）
- 進捗表示
- エラーハンドリング
- サマリーレポート

**Usage:**
```bash
# 通常実行
npx ts-node sync-favorite-comments-to-database.ts

# 強制更新（既存データも上書き）
npx ts-node sync-favorite-comments-to-database.ts --force

# ドライラン（実際には保存しない）
npx ts-node sync-favorite-comments-to-database.ts --dry-run
```

### 2. PropertyDetailsService (Existing - No Changes)

既存のサービスをそのまま使用します。変更は不要です。

**Relevant Methods:**
- `getPropertyDetails(propertyNumber)` - データベースから取得
- `savePropertyDetails(propertyNumber, details)` - データベースに保存

### 3. FavoriteCommentService (Existing - No Changes)

既存のサービスをそのまま使用します。変更は不要です。

**Relevant Methods:**
- `getFavoriteComment(propertyId)` - スプレッドシートから取得

### 4. Complete Endpoint (Existing - No Changes)

既存のエンドポイントは正しく実装されています。変更は不要です。

**Current Implementation:**
```typescript
router.get('/properties/:id/complete', async (req, res) => {
  // ...
  const dbDetails = await propertyListingService.getPropertyDetails(property.property_number);
  
  // データベース優先（既に実装済み）
  const favoriteComment = dbDetails.favorite_comment 
    ? { comment: dbDetails.favorite_comment, propertyType: property.property_type }
    : await favoriteCommentService.getFavoriteComment(id);
  
  res.json({
    favoriteComment: favoriteComment.comment,
    // ...
  });
});
```

### 5. Frontend (Existing - No Changes)

フロントエンドは正しく実装されています。変更は不要です。

**Current Implementation:**
```tsx
{completeData?.favoriteComment && (
  <Box className="favorite-comment-container">
    <Box className="favorite-comment-bubble">
      <Box component="span">⭐</Box>
      <Box component="span">{completeData.favoriteComment}</Box>
    </Box>
  </Box>
)}
```

## Database Schema

### property_details Table (Existing)

```sql
CREATE TABLE property_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_number VARCHAR NOT NULL UNIQUE,
  property_about TEXT,
  recommended_comments JSONB,
  athome_data JSONB,
  favorite_comment TEXT,  -- ← This column exists but is empty
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**No schema changes required!**

## Implementation Strategy

### Phase 1: Create Batch Sync Script

1. Create `sync-favorite-comments-to-database.ts`
2. Query public properties
3. For each property:
   - Check if `favorite_comment` exists in `property_details`
   - If not (or force update), fetch from spreadsheet
   - Save to `property_details`
4. Log progress and results

### Phase 2: Test and Verify

1. Run sync script on a few test properties
2. Verify data is saved to `property_details`
3. Verify `/complete` endpoint returns the data
4. Verify frontend displays the data

### Phase 3: Full Sync

1. Run sync script on all public properties
2. Monitor for errors
3. Generate summary report

## Error Handling

### Graceful Degradation

すべてのエラーケースで、他の物件の処理を継続します。

**Error Scenarios:**
1. **Spreadsheet URL not found**
   - Log warning
   - Skip property
   - Continue with next property

2. **Google Sheets API error**
   - Log error
   - Skip property
   - Continue with next property

3. **Cell not found or empty**
   - Log info
   - Skip property (no data to save)
   - Continue with next property

4. **Database save error**
   - Log error
   - Skip property
   - Continue with next property

## Performance Considerations

### Batch Processing

- Process properties in batches of 10
- Use `pLimit` to control concurrency
- Avoid overwhelming Google Sheets API

### Caching

- FavoriteCommentService already has Redis caching
- No additional caching needed

### Expected Performance

- **Per property:** 1-2 seconds (with cache miss)
- **100 properties:** ~10-20 minutes
- **All public properties (~100):** ~10-20 minutes

## Testing Strategy

### Manual Testing

1. **Test with single property:**
   ```bash
   npx ts-node sync-favorite-comments-to-database.ts --property-number AA2387
   ```

2. **Verify database:**
   ```sql
   SELECT property_number, favorite_comment 
   FROM property_details 
   WHERE property_number = 'AA2387';
   ```

3. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/public/properties/{id}/complete
   ```

4. **Test frontend:**
   - Open property detail page
   - Verify favorite comment is displayed

### Dry Run Testing

```bash
npx ts-node sync-favorite-comments-to-database.ts --dry-run
```

- Fetches data from spreadsheets
- Does NOT save to database
- Shows what would be saved

## Rollout Plan

### Step 1: Test with 5 properties
```bash
npx ts-node sync-favorite-comments-to-database.ts --limit 5
```

### Step 2: Verify results
- Check database
- Check API
- Check frontend

### Step 3: Full sync
```bash
npx ts-node sync-favorite-comments-to-database.ts
```

### Step 4: Monitor
- Check error logs
- Verify success rate
- Generate summary report

## Success Criteria

1. ✅ All public properties have `favorite_comment` in `property_details`
2. ✅ `/complete` endpoint returns `favorite_comment`
3. ✅ Frontend displays `favorite_comment`
4. ✅ No errors in production logs
5. ✅ Performance is acceptable (< 20 minutes for full sync)

## Future Enhancements

1. **Automatic sync:** Run sync script daily via cron job
2. **Incremental sync:** Only sync new/updated properties
3. **Admin UI:** Allow manual sync from admin panel
4. **Validation:** Validate favorite comment format/length
5. **Analytics:** Track which comments drive more inquiries

