# Design Document

## Architecture Overview

物件公開サイトの詳細画面にathome情報セクションを追加する機能の設計。既存の`RecommendedCommentService`と同様のパターンを使用し、Google Sheets APIを通じて業務リストスプレッドシートの「athome」シートからデータを取得する。

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  PublicPropertyDetailPage                    │
│  (frontend/src/pages/PublicPropertyDetailPage.tsx)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   AthomeSection Component                    │
│  (frontend/src/components/AthomeSection.tsx)                │
│  - Display athome data below basic info                     │
│  - Handle loading/error states                              │
│  - Symbol replacement (★ → ●)                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ API Request
┌─────────────────────────────────────────────────────────────┐
│              Backend API Endpoint                            │
│  GET /api/public-properties/:id/athome                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  AthomeDataService                           │
│  (backend/src/services/AthomeDataService.ts)                │
│  - Fetch cell range based on property type                  │
│  - Cache data (5 minutes)                                   │
│  - Error handling with retry                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  GoogleSheetsClient                          │
│  (backend/src/services/GoogleSheetsClient.ts)               │
│  - Service account authentication                           │
│  - Read cell ranges from athome sheet                       │
└─────────────────────────────────────────────────────────────┘
```

## Backend Design

### AthomeDataService Class

新しいサービスクラス`AthomeDataService`を作成し、athomeシートからのデータ取得ロジックを実装する。

#### Class Structure

```typescript
export interface AthomeDataResult {
  data: string[];  // Non-empty cell values
  propertyType: string;
  cached: boolean;
}

export class AthomeDataService {
  private cache: Map<string, { data: string[]; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  constructor();
  
  async getAthomeData(
    propertyNumber: string,
    propertyType: string,
    spreadsheetUrl: string
  ): Promise<AthomeDataResult>;
  
  private getCellRange(propertyType: string): string | null;
  private fetchFromSheet(
    spreadsheetUrl: string,
    propertyNumber: string,
    cellRange: string
  ): Promise<string[]>;
  private replaceSymbols(values: string[]): string[];
  private getCacheKey(propertyNumber: string): string;
  private getCachedData(cacheKey: string): string[] | null;
  private setCachedData(cacheKey: string, data: string[]): void;
}
```

#### Cell Range Mapping

物件種別に応じたセル範囲のマッピング:

```typescript
private getCellRange(propertyType: string): string | null {
  const cellRangeMap: Record<string, string> = {
    '土地': 'B63:B79',
    '戸建て': 'B152:B166',
    '戸建': 'B152:B166',  // Alternative spelling
    'マンション': 'B149:B163',
  };
  
  return cellRangeMap[propertyType] || null;
}
```

#### Symbol Replacement Logic

文頭の★記号を●に置換:

```typescript
private replaceSymbols(values: string[]): string[] {
  return values.map(value => {
    if (value.startsWith('★')) {
      return '●' + value.substring(1);
    }
    return value;
  });
}
```

#### Caching Strategy

- Cache key: `athome:${propertyNumber}`
- TTL: 5 minutes (300,000 ms)
- In-memory cache using Map
- Cache invalidation on TTL expiry

```typescript
private getCachedData(cacheKey: string): string[] | null {
  const cached = this.cache.get(cacheKey);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > this.CACHE_TTL) {
    this.cache.delete(cacheKey);
    return null;
  }
  
  return cached.data;
}
```

#### Error Handling

1. **Spreadsheet URL validation**: Return empty array if null/invalid
2. **Sheet not found**: Log warning, return empty array
3. **API errors**: Retry once after 1 second
4. **Timeout**: 3 seconds per request
5. **Graceful degradation**: Never throw errors to frontend

```typescript
async getAthomeData(
  propertyNumber: string,
  propertyType: string,
  spreadsheetUrl: string
): Promise<AthomeDataResult> {
  try {
    // Check cache first
    const cacheKey = this.getCacheKey(propertyNumber);
    const cachedData = this.getCachedData(cacheKey);
    
    if (cachedData) {
      return { data: cachedData, propertyType, cached: true };
    }
    
    // Validate inputs
    if (!spreadsheetUrl) {
      console.log(`[AthomeDataService] No spreadsheet URL for ${propertyNumber}`);
      return { data: [], propertyType, cached: false };
    }
    
    const cellRange = this.getCellRange(propertyType);
    if (!cellRange) {
      console.log(`[AthomeDataService] Unknown property type: ${propertyType}`);
      return { data: [], propertyType, cached: false };
    }
    
    // Fetch with retry
    let data: string[] = [];
    try {
      data = await this.fetchFromSheet(spreadsheetUrl, propertyNumber, cellRange);
    } catch (error) {
      console.warn(`[AthomeDataService] First attempt failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      data = await this.fetchFromSheet(spreadsheetUrl, propertyNumber, cellRange);
    }
    
    // Replace symbols
    const processedData = this.replaceSymbols(data);
    
    // Cache the result
    this.setCachedData(cacheKey, processedData);
    
    return { data: processedData, propertyType, cached: false };
  } catch (error: any) {
    console.error(`[AthomeDataService] Failed to get athome data:`, error.message);
    return { data: [], propertyType, cached: false };
  }
}
```

### API Endpoint

新しいエンドポイントを追加:

```typescript
// GET /api/public-properties/:id/athome
router.get('/public-properties/:id/athome', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get property details
    const propertyService = new PropertyListingService();
    const property = await propertyService.getPublicPropertyById(id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Get athome data
    const athomeService = new AthomeDataService();
    const result = await athomeService.getAthomeData(
      property.property_number,
      property.property_type,
      property.storage_location  // Assuming this contains spreadsheet URL
    );
    
    res.json(result);
  } catch (error: any) {
    console.error('[API] Error fetching athome data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Frontend Design

### AthomeSection Component

新しいReactコンポーネントを作成し、athome情報を表示する。

#### Component Structure

```typescript
interface AthomeSectionProps {
  propertyId: string;
}

const AthomeSection: React.FC<AthomeSectionProps> = ({ propertyId }) => {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchAthomeData();
  }, [propertyId]);
  
  const fetchAthomeData = async () => {
    // Fetch with timeout
    // Handle loading/error states
    // Update state
  };
  
  if (loading) return <CircularProgress />;
  if (error || data.length === 0) return null;  // Silent failure
  
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        物件詳細情報
      </Typography>
      <Box component="ul" sx={{ pl: 2 }}>
        {data.map((item, index) => (
          <Typography component="li" key={index} sx={{ mb: 1 }}>
            {item}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};
```

#### Loading States

1. **Initial load**: Show CircularProgress
2. **Data loaded**: Display list items
3. **No data**: Hide section (silent failure)
4. **Error**: Hide section (silent failure)

#### Async Data Fetching

```typescript
const fetchAthomeData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      `/api/public-properties/${propertyId}/athome`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    setData(result.data || []);
  } catch (error: any) {
    console.error('[AthomeSection] Failed to fetch data:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### Integration with PublicPropertyDetailPage

athomeセクションを基本情報セクションの直後に配置:

```typescript
<Paper elevation={2} sx={{ p: 3, mb: 3 }}>
  {/* 基本情報セクション */}
  {/* ... existing basic info code ... */}
</Paper>

{/* Athome情報セクション - 基本情報の直後に配置 */}
<AthomeSection propertyId={property.id} />

{/* 物件画像ギャラリー */}
<Paper elevation={2} sx={{ mb: 3, p: 2 }}>
  {/* ... existing image gallery code ... */}
</Paper>
```

## Data Flow

### Request Flow

1. User loads property detail page
2. `PublicPropertyDetailPage` renders
3. `AthomeSection` component mounts
4. `useEffect` triggers API request
5. Backend receives request with property ID
6. `PropertyListingService` fetches property details
7. `AthomeDataService` checks cache
8. If cache miss, fetch from Google Sheets
9. Process data (filter empty, replace symbols)
10. Cache result for 5 minutes
11. Return data to frontend
12. Frontend displays list items

### Error Flow

1. Any error occurs in backend
2. Log error details for debugging
3. Return empty array to frontend
4. Frontend receives empty array
5. Hide athome section (no error message to user)
6. Page continues to render normally

## Performance Optimization

### Caching Strategy

- **Cache location**: In-memory Map in AthomeDataService
- **Cache key**: `athome:${propertyNumber}`
- **TTL**: 5 minutes
- **Cache hit**: Return immediately without API call
- **Cache miss**: Fetch from Google Sheets, then cache

### Async Loading

- Athome section loads independently
- Does not block main page render
- Uses React Suspense-like pattern
- 3-second timeout prevents hanging

### Batch Fetching (Future Enhancement)

For list pages with multiple properties:

```typescript
async getBatchAthomeData(
  properties: Array<{ propertyNumber: string; propertyType: string; spreadsheetUrl: string }>
): Promise<Map<string, string[]>> {
  // Fetch multiple properties in parallel
  // Use Promise.allSettled to handle partial failures
  // Return Map of propertyNumber -> data
}
```

## Security Considerations

1. **Input validation**: Sanitize property ID and type
2. **Rate limiting**: Apply to athome endpoint
3. **Authentication**: Service account for Google Sheets
4. **Error messages**: Never expose internal details to users
5. **CORS**: Restrict to allowed origins

## Testing Strategy

### Unit Tests

1. `AthomeDataService.getCellRange()` - Test all property types
2. `AthomeDataService.replaceSymbols()` - Test symbol replacement
3. `AthomeDataService.getCachedData()` - Test cache hit/miss/expiry
4. `AthomeDataService.getAthomeData()` - Test full flow with mocks

### Integration Tests

1. API endpoint with valid property ID
2. API endpoint with invalid property ID
3. API endpoint with property without spreadsheet URL
4. Cache behavior across multiple requests

### Manual Testing

1. Load property detail page
2. Verify athome section appears below basic info
3. Verify symbols are replaced correctly
4. Verify section hides when no data
5. Verify page loads normally on errors
6. Test with different property types

## Migration Plan

### Phase 1: Backend Implementation

1. Create `AthomeDataService.ts`
2. Add API endpoint
3. Add unit tests
4. Deploy to staging

### Phase 2: Frontend Implementation

1. Create `AthomeSection.tsx` component
2. Integrate with `PublicPropertyDetailPage`
3. Add loading/error states
4. Test on staging

### Phase 3: Production Deployment

1. Deploy backend changes
2. Deploy frontend changes
3. Monitor logs for errors
4. Verify cache performance

## Rollback Plan

If issues occur:

1. Remove `<AthomeSection />` from `PublicPropertyDetailPage`
2. Redeploy frontend
3. Backend endpoint remains (no harm if unused)
4. Investigate and fix issues
5. Redeploy when ready

## Monitoring and Logging

### Metrics to Track

1. Cache hit rate
2. API response time
3. Error rate
4. Google Sheets API quota usage

### Log Messages

```typescript
// Success
console.log(`[AthomeDataService] Fetched ${data.length} items for ${propertyNumber} (cached: ${cached})`);

// Cache hit
console.log(`[AthomeDataService] Cache hit for ${propertyNumber}`);

// No data
console.log(`[AthomeDataService] No athome data for ${propertyNumber}`);

// Error
console.error(`[AthomeDataService] Failed to fetch athome data for ${propertyNumber}:`, error.message);
```

## Future Enhancements

1. **Batch fetching**: Support multiple properties at once
2. **Redis cache**: Replace in-memory cache for scalability
3. **Prefetching**: Load athome data when listing page loads
4. **Custom formatting**: Support rich text, links, etc.
5. **Admin UI**: Allow editing athome data without spreadsheet
