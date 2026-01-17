# Tasks Document

## Task Breakdown

### Phase 1: Backend Implementation

#### Task 1.1: Create FavoriteCommentService

**Description:** 新しいサービスクラスを作成し、お気に入り文言の取得ロジックを実装します。

**Files to Create/Modify:**
- `backend/src/services/FavoriteCommentService.ts` (NEW)

**Implementation Details:**
```typescript
export class FavoriteCommentService {
  async getFavoriteComment(propertyId: string): Promise<FavoriteCommentResult>
  private getCellPosition(propertyType: string): string | null
  private fetchCommentFromSpreadsheet(spreadsheetUrl: string, cellPosition: string): Promise<string | null>
}
```

**Acceptance Criteria:**
- [ ] Service class created with proper TypeScript types
- [ ] Cell position mapping implemented for 土地/戸建て/マンション
- [ ] Error handling with graceful degradation
- [ ] Logging for debugging

**Estimated Time:** 2 hours

---

#### Task 1.2: Enhance GoogleSheetsClient

**Description:** 既存のGoogleSheetsClientに、スプレッドシートURLから単一セルを読み取る機能を追加します。

**Files to Modify:**
- `backend/src/services/GoogleSheetsClient.ts`

**Implementation Details:**
```typescript
async getCellValueFromUrl(
  spreadsheetUrl: string,
  sheetName: string,
  cellPosition: string
): Promise<string | null>
```

**Acceptance Criteria:**
- [ ] Method accepts spreadsheet URL (not just ID)
- [ ] Extracts spreadsheet ID from URL
- [ ] Reads single cell value
- [ ] Returns null on error (graceful degradation)
- [ ] Proper error logging

**Estimated Time:** 1.5 hours

---

#### Task 1.3: Create API Endpoint

**Description:** 公開APIエンドポイントを作成し、お気に入り文言を返します。

**Files to Create/Modify:**
- `backend/src/routes/publicProperties.ts` (MODIFY)

**Implementation Details:**
```typescript
router.get('/:id/favorite-comment', async (req, res) => {
  // Implementation
});
```

**Acceptance Criteria:**
- [ ] Endpoint: GET /api/public/properties/:id/favorite-comment
- [ ] Returns JSON with comment and propertyType
- [ ] Handles errors gracefully (returns null comment)
- [ ] No authentication required (public endpoint)
- [ ] Proper HTTP status codes

**Estimated Time:** 1 hour

---

#### Task 1.4: Implement Caching

**Description:** Redisキャッシュを実装し、Google Sheets APIの呼び出しを削減します。

**Files to Modify:**
- `backend/src/services/FavoriteCommentService.ts`

**Implementation Details:**
- Cache key: `favorite-comment:${propertyId}`
- TTL: 5 minutes (300 seconds)
- Use existing Redis infrastructure

**Acceptance Criteria:**
- [ ] Cache implemented with 5-minute TTL
- [ ] Cache hit returns immediately
- [ ] Cache miss fetches from Google Sheets
- [ ] Cache errors don't break functionality

**Estimated Time:** 1 hour

---

#### Task 1.5: Add Unit Tests (Backend)

**Description:** バックエンドサービスのユニットテストを作成します。

**Files to Create:**
- `backend/src/services/__tests__/FavoriteCommentService.test.ts` (NEW)

**Test Cases:**
- [ ] Cell position mapping for each property type
- [ ] Graceful error handling
- [ ] Cache behavior
- [ ] Null handling

**Estimated Time:** 2 hours

---

### Phase 2: Frontend Implementation

#### Task 2.1: Create FavoriteCommentOverlay Component

**Description:** 画像上にテキストをオーバーレイ表示する新しいコンポーネントを作成します。

**Files to Create:**
- `frontend/src/components/FavoriteCommentOverlay.tsx` (NEW)
- `frontend/src/components/FavoriteCommentOverlay.css` (NEW)

**Implementation Details:**
```typescript
interface FavoriteCommentOverlayProps {
  comment: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}
```

**Styling Requirements:**
- Semi-transparent background (rgba(0, 0, 0, 0.6))
- White text with text-shadow
- Responsive font size
- Padding and border-radius
- Position: absolute

**Acceptance Criteria:**
- [ ] Component renders text overlay
- [ ] Supports multiple positions
- [ ] Responsive design
- [ ] High contrast for readability
- [ ] Graceful handling of long text

**Estimated Time:** 2 hours

---

#### Task 2.2: Enhance PropertyImageGallery Component

**Description:** 既存のPropertyImageGalleryコンポーネントを拡張し、お気に入り文言のオーバーレイを表示します。

**Files to Modify:**
- `frontend/src/components/PropertyImageGallery.tsx`

**Implementation Details:**
- Add `showFavoriteComment` prop
- Fetch favorite comment using React Query
- Render FavoriteCommentOverlay on first image
- Handle loading and error states

**Acceptance Criteria:**
- [ ] Fetches favorite comment from API
- [ ] Displays overlay on main image
- [ ] Loading state doesn't block image display
- [ ] Error state doesn't break gallery
- [ ] Only shows on first/main image

**Estimated Time:** 2 hours

---

#### Task 2.3: Update PublicPropertyDetailPage

**Description:** 詳細ページでお気に入り文言機能を有効化します。

**Files to Modify:**
- `frontend/src/pages/PublicPropertyDetailPage.tsx`

**Implementation Details:**
```typescript
<PropertyImageGallery 
  propertyId={property.id}
  showFavoriteComment={true}  // NEW
  // ... other props
/>
```

**Acceptance Criteria:**
- [ ] Pass showFavoriteComment prop to gallery
- [ ] No breaking changes to existing functionality
- [ ] Page loads successfully with or without comment

**Estimated Time:** 0.5 hours

---

#### Task 2.4: Add API Service Method

**Description:** フロントエンドAPIサービスにお気に入り文言取得メソッドを追加します。

**Files to Modify:**
- `frontend/src/services/publicApi.ts`

**Implementation Details:**
```typescript
export const getFavoriteComment = async (propertyId: string) => {
  const response = await publicApi.get(`/properties/${propertyId}/favorite-comment`);
  return response.data;
};
```

**Acceptance Criteria:**
- [ ] Method added to publicApi service
- [ ] Proper TypeScript types
- [ ] Error handling

**Estimated Time:** 0.5 hours

---

#### Task 2.5: Add Unit Tests (Frontend)

**Description:** フロントエンドコンポーネントのユニットテストを作成します。

**Files to Create:**
- `frontend/src/components/__tests__/FavoriteCommentOverlay.test.tsx` (NEW)

**Test Cases:**
- [ ] Component renders with comment
- [ ] Component handles different positions
- [ ] Component handles long text
- [ ] Component doesn't render without comment

**Estimated Time:** 1.5 hours

---

### Phase 3: Integration & Testing

#### Task 3.1: Integration Testing

**Description:** エンドツーエンドの統合テストを実施します。

**Test Scenarios:**
1. 土地物件でB53セルの文言が表示される
2. 戸建て物件でB142セルの文言が表示される
3. マンション物件でB150セルの文言が表示される
4. スプレッドシートURLがない場合、エラーなく表示される
5. セルが空の場合、オーバーレイが表示されない
6. Google Sheets APIエラー時、ページが正常に表示される

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] Page load time acceptable (< 3 seconds)
- [ ] Cache working correctly

**Estimated Time:** 2 hours

---

#### Task 3.2: Manual Testing & UI Verification

**Description:** 実際のブラウザで視覚的な確認を行います。

**Test Cases:**
- [ ] Desktop view: Overlay positioned correctly
- [ ] Mobile view: Overlay responsive
- [ ] Long text: Wraps properly
- [ ] Short text: Centered properly
- [ ] Different image sizes: Overlay scales
- [ ] Dark images: Text readable
- [ ] Light images: Text readable

**Estimated Time:** 1.5 hours

---

#### Task 3.3: Performance Testing

**Description:** パフォーマンスとキャッシュの動作を確認します。

**Test Cases:**
- [ ] First load: < 2 seconds for comment
- [ ] Cached load: < 50ms for comment
- [ ] Cache expiration: Refreshes after 5 minutes
- [ ] Multiple properties: No rate limit issues
- [ ] Concurrent requests: Handled properly

**Estimated Time:** 1 hour

---

### Phase 4: Documentation & Deployment

#### Task 4.1: Update Documentation

**Description:** 機能のドキュメントを作成・更新します。

**Files to Create/Modify:**
- `README.md` (UPDATE - add feature description)
- `.kiro/specs/public-property-favorite-comment/USER_GUIDE.md` (NEW)

**Documentation Sections:**
- Feature overview
- How to use
- Troubleshooting
- Configuration

**Acceptance Criteria:**
- [ ] User guide created
- [ ] README updated
- [ ] Code comments added
- [ ] API documentation updated

**Estimated Time:** 1.5 hours

---

#### Task 4.2: Deployment Preparation

**Description:** デプロイメントの準備を行います。

**Checklist:**
- [ ] Environment variables verified
- [ ] Google Sheets API credentials configured
- [ ] Redis cache configured
- [ ] Database migrations (if any) prepared
- [ ] Rollback plan documented

**Estimated Time:** 1 hour

---

#### Task 4.3: Deploy to Staging

**Description:** ステージング環境にデプロイし、動作確認を行います。

**Verification Steps:**
1. Deploy backend
2. Deploy frontend
3. Verify API endpoint
4. Test with real data
5. Check error logs
6. Verify cache behavior

**Acceptance Criteria:**
- [ ] Staging deployment successful
- [ ] All features working
- [ ] No errors in logs
- [ ] Performance acceptable

**Estimated Time:** 1 hour

---

#### Task 4.4: Deploy to Production

**Description:** 本番環境にデプロイします。

**Deployment Steps:**
1. Create deployment tag
2. Deploy backend
3. Verify backend health
4. Deploy frontend
5. Verify frontend health
6. Monitor error logs
7. Monitor performance metrics

**Acceptance Criteria:**
- [ ] Production deployment successful
- [ ] All features working
- [ ] No increase in error rate
- [ ] Performance within acceptable range

**Estimated Time:** 1 hour

---

## Task Summary

### Total Estimated Time: 24 hours (3 days)

### Phase Breakdown:
- **Phase 1 (Backend):** 7.5 hours
- **Phase 2 (Frontend):** 6.5 hours
- **Phase 3 (Testing):** 4.5 hours
- **Phase 4 (Documentation & Deployment):** 4.5 hours

### Priority Order:
1. Task 1.1 - Create FavoriteCommentService
2. Task 1.2 - Enhance GoogleSheetsClient
3. Task 1.3 - Create API Endpoint
4. Task 2.1 - Create FavoriteCommentOverlay Component
5. Task 2.2 - Enhance PropertyImageGallery Component
6. Task 2.3 - Update PublicPropertyDetailPage
7. Task 1.4 - Implement Caching
8. Task 3.1 - Integration Testing
9. Task 3.2 - Manual Testing & UI Verification
10. Remaining tasks

### Dependencies:
- Task 2.2 depends on Task 2.1
- Task 2.3 depends on Task 2.2
- Task 3.1 depends on all Phase 1 and Phase 2 tasks
- Task 4.3 depends on all previous tasks
- Task 4.4 depends on Task 4.3

## Notes

- 既存のRecommendedCommentServiceとの統合を検討する必要があります
- 画像上のオーバーレイ表示は、既存のRecommendedCommentSectionとは別の実装になります
- キャッシュ戦略は既存のRedis実装を活用します
- エラーハンドリングは常にグレースフルデグラデーションを優先します
