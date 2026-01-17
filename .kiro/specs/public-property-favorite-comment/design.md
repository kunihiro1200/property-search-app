# Design Document

## Architecture Overview

この機能は、既存の「おすすめコメント」機能を拡張し、画像上にオーバーレイ表示する形で実装します。

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Public Property Detail Page                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         PropertyImageGallery Component                │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Image with Overlay                      │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │  Favorite Comment Text (Overlay)          │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  │                                                 │  │  │
│  │  │         [Property Image]                        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                         │
│  GET /api/public/properties/:id/favorite-comment            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FavoriteCommentService                          │
│  - Retrieve spreadsheet URL from property_listings          │
│  - Determine cell position based on property type           │
│  - Fetch comment from Google Sheets                         │
│  - Cache results                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GoogleSheetsClient (Existing)                   │
│  - Authenticate with Google Sheets API                      │
│  - Read specific cell value                                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Frontend Request Flow

```
User visits detail page
    ↓
PropertyImageGallery component mounts
    ↓
useQuery fetches favorite comment
    ↓
API call: GET /api/public/properties/:id/favorite-comment
    ↓
Display overlay on image if comment exists
```

### 2. Backend Processing Flow

```
API endpoint receives request
    ↓
FavoriteCommentService.getFavoriteComment(propertyId)
    ↓
Query property_listings table for:
  - property_number
  - property_type
  - spreadsheet_url (from storage_location column)
    ↓
Determine cell position based on property_type:
  - 土地 → B53
  - 戸建て → B142
  - マンション → B150
    ↓
GoogleSheetsClient.getCellValue(spreadsheetUrl, 'athome', cellPosition)
    ↓
Cache result (5 minutes)
    ↓
Return { comment: string | null, propertyType: string }
```

## Component Design

### Frontend Components

#### 1. PropertyImageGallery (Enhanced)

既存のコンポーネントを拡張し、画像上にお気に入り文言を表示する機能を追加します。

```typescript
interface PropertyImageGalleryProps {
  propertyId: string;
  canDelete?: boolean;
  canHide?: boolean;
  showHiddenImages?: boolean;
  showFavoriteComment?: boolean; // NEW
}
```

**Key Features:**
- 画像の上にテキストオーバーレイを表示
- レスポンシブデザイン対応
- 読みやすいテキストスタイル（影、背景）

#### 2. FavoriteCommentOverlay (New Component)

画像上にオーバーレイ表示する専用コンポーネント。

```typescript
interface FavoriteCommentOverlayProps {
  comment: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}
```

**Styling:**
- Semi-transparent background
- High contrast text
- Text shadow for readability
- Responsive font size

### Backend Services

#### 1. FavoriteCommentService (New)

お気に入り文言の取得を担当する新しいサービス。

```typescript
class FavoriteCommentService {
  async getFavoriteComment(propertyId: string): Promise<FavoriteCommentResult>
  private getCellPosition(propertyType: string): string | null
  private fetchCommentFromSpreadsheet(spreadsheetUrl: string, cellPosition: string): Promise<string | null>
}

interface FavoriteCommentResult {
  comment: string | null;
  propertyType: string;
}
```

**Key Responsibilities:**
- Property data retrieval from database
- Cell position mapping
- Google Sheets API integration
- Error handling and graceful degradation
- Caching

#### 2. GoogleSheetsClient (Existing - Minor Enhancement)

既存のクライアントに、特定のスプレッドシートURLから単一セルを読み取る機能を追加。

```typescript
class GoogleSheetsClient {
  // NEW METHOD
  async getCellValueFromUrl(
    spreadsheetUrl: string,
    sheetName: string,
    cellPosition: string
  ): Promise<string | null>
}
```

## API Design

### Endpoint

```
GET /api/public/properties/:id/favorite-comment
```

**Response:**

```json
{
  "comment": "駅近で生活便利！スーパー・コンビニ徒歩5分圏内",
  "propertyType": "マンション"
}
```

**Error Response:**

```json
{
  "comment": null,
  "propertyType": "マンション",
  "error": "Spreadsheet URL not found"
}
```

## Database Schema

既存のテーブルを使用します。変更は不要です。

### property_listings table

```sql
-- 使用するカラム:
-- - id (UUID)
-- - property_number (VARCHAR)
-- - property_type (VARCHAR)
-- - storage_location (TEXT) -- スプレッドシートURLを含む
```

## Cell Position Mapping

物件種別とセル位置のマッピング:

| 物件種別 | セル位置 | 説明 |
|---------|---------|------|
| 土地 | B53 | 土地物件のお気に入り文言 |
| 戸建て | B142 | 戸建て物件のお気に入り文言 |
| 戸建 | B142 | 「戸建」表記も対応 |
| マンション | B150 | マンション物件のお気に入り文言 |

## Caching Strategy

### Cache Configuration

- **Cache Duration:** 5 minutes
- **Cache Key:** `favorite-comment:${propertyId}`
- **Cache Storage:** Redis (existing infrastructure)

### Cache Invalidation

- Time-based expiration (5 minutes)
- Manual invalidation not required (content rarely changes)

## Error Handling

### Graceful Degradation

すべてのエラーケースで、ページの表示を妨げないようにします。

1. **Spreadsheet URL not found**
   - Log warning
   - Return null comment
   - Display page without overlay

2. **Google Sheets API error**
   - Log error
   - Return null comment
   - Display page without overlay

3. **Cell not found or empty**
   - Log info
   - Return null comment
   - Display page without overlay

4. **Network timeout**
   - Set timeout: 5 seconds
   - Log error
   - Return null comment
   - Display page without overlay

## Performance Considerations

### Optimization Strategies

1. **Caching:** 5-minute cache reduces API calls
2. **Async Loading:** Comment loads independently of page
3. **Timeout:** 5-second timeout prevents blocking
4. **Rate Limiting:** Respect Google Sheets API limits
5. **Lazy Loading:** Only fetch when image is visible

### Expected Performance

- **Cache Hit:** < 50ms
- **Cache Miss:** < 2 seconds (Google Sheets API call)
- **Timeout:** 5 seconds maximum

## Security Considerations

1. **API Access:** Public endpoint (no authentication required)
2. **Data Validation:** Sanitize spreadsheet URLs
3. **Rate Limiting:** Prevent abuse of Google Sheets API
4. **Error Messages:** Don't expose internal details

## Testing Strategy

### Unit Tests

- FavoriteCommentService cell position mapping
- Error handling scenarios
- Cache behavior

### Integration Tests

- End-to-end API call
- Google Sheets integration
- Database query

### Manual Testing

- Visual verification of overlay display
- Different property types
- Error scenarios (missing data, API failures)

## Deployment Considerations

### Environment Variables

```bash
# Existing (no changes needed)
GYOMU_LIST_SPREADSHEET_ID=<spreadsheet_id>
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=<path_to_key>
```

### Rollout Plan

1. Deploy backend service
2. Test API endpoint
3. Deploy frontend component
4. Monitor error logs
5. Verify cache performance

## Future Enhancements

1. **Admin UI:** Allow editing favorite comments without accessing spreadsheet
2. **A/B Testing:** Test different comment positions
3. **Analytics:** Track which comments drive more inquiries
4. **Multi-language:** Support English comments
5. **Rich Text:** Support formatted text (bold, colors)
