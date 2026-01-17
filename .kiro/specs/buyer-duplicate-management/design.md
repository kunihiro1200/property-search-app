# Design Document: 買主関連表示機能

## Overview

本機能は、同一人物による複数の買主レコードを検出し、関連情報として表示する機能です。電話番号またはメールアドレスをキーとして関連買主を検出し、買主詳細ページに統合表示します。

重要な設計方針として、システムは買主レコードを自動的に統合・削除しません。関連情報の表示のみを行い、真の重複（同じ物件への重複問合せ）については、手動でスプレッドシートから削除する運用とします。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Buyer Detail Page                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Buyer Information                                     │  │
│  │  - Name, Phone, Email                                  │  │
│  │  - Notification Badge (if related buyers exist)        │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Related Buyers Section (関連買主)                     │  │
│  │  - List of related buyers                              │  │
│  │  - Property number for each                            │  │
│  │  - Label: "複数問合せ" or "重複の可能性"              │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Unified Inquiry History (統合問合せ履歴)             │  │
│  │  - All inquiries from all related buyers               │  │
│  │  - Sorted by date (newest first)                       │  │
│  │  - Buyer number indicator for each inquiry             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │  RelatedBuyerService  │
                  │  - findRelatedBuyers  │
                  │  - classifyRelation   │
                  └───────────────────────┘
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Database (buyers)   │
                  │   - phone_number      │
                  │   - email             │
                  │   - buyer_number      │
                  └───────────────────────┘
```

### Data Flow

1. ユーザーが買主詳細ページを開く
2. システムが現在の買主の電話番号とメールアドレスを取得
3. RelatedBuyerServiceが同じ電話番号またはメールアドレスを持つ他の買主を検索
4. 検出された関連買主を分類（複数問合せ vs 重複の可能性）
5. 関連買主情報と統合問合せ履歴を表示

## Components and Interfaces

### Backend Components

#### RelatedBuyerService

```typescript
interface RelatedBuyerService {
  /**
   * 関連買主を検索
   * @param buyerId - 現在の買主ID
   * @returns 関連買主のリスト
   */
  findRelatedBuyers(buyerId: string): Promise<RelatedBuyer[]>;

  /**
   * 関連買主を分類
   * @param currentBuyer - 現在の買主
   * @param relatedBuyer - 関連買主
   * @returns 関係の種類
   */
  classifyRelation(
    currentBuyer: Buyer,
    relatedBuyer: Buyer
  ): RelationType;

  /**
   * 統合問合せ履歴を取得
   * @param buyerIds - 買主IDのリスト
   * @returns 統合された問合せ履歴
   */
  getUnifiedInquiryHistory(buyerIds: string[]): Promise<InquiryHistory[]>;
}

interface RelatedBuyer {
  id: string;
  buyer_number: string;
  name: string;
  phone_number: string | null;
  email: string | null;
  property_number: string | null;
  inquiry_date: Date | null;
  relation_type: RelationType;
  match_reason: MatchReason;
}

enum RelationType {
  MULTIPLE_INQUIRY = 'multiple_inquiry',  // 複数問合せ
  POSSIBLE_DUPLICATE = 'possible_duplicate'  // 重複の可能性
}

enum MatchReason {
  PHONE = 'phone',
  EMAIL = 'email',
  BOTH = 'both'
}

interface InquiryHistory {
  buyer_id: string;
  buyer_number: string;
  property_number: string;
  inquiry_date: Date;
  property_address: string | null;
  status: string | null;
}
```

#### API Endpoints

```typescript
// GET /api/buyers/:id/related
// 関連買主を取得
interface GetRelatedBuyersResponse {
  current_buyer: Buyer;
  related_buyers: RelatedBuyer[];
  total_count: number;
}

// GET /api/buyers/:id/unified-inquiry-history
// 統合問合せ履歴を取得
interface GetUnifiedInquiryHistoryResponse {
  inquiries: InquiryHistory[];
  buyer_numbers: string[];  // 含まれる買主番号のリスト
}
```

### Frontend Components

#### RelatedBuyersSection

```typescript
interface RelatedBuyersSectionProps {
  buyerId: string;
}

/**
 * 関連買主セクション
 * - 関連買主のリストを表示
 * - 各買主の物件番号と関係タイプを表示
 */
const RelatedBuyersSection: React.FC<RelatedBuyersSectionProps>;
```

#### UnifiedInquiryHistoryTable

```typescript
interface UnifiedInquiryHistoryTableProps {
  buyerId: string;
}

/**
 * 統合問合せ履歴テーブル
 * - 全関連買主の問合せ履歴を統合表示
 * - 買主番号でグループ化
 * - 日付順にソート
 */
const UnifiedInquiryHistoryTable: React.FC<UnifiedInquiryHistoryTableProps>;
```

#### RelatedBuyerNotificationBadge

```typescript
interface RelatedBuyerNotificationBadgeProps {
  count: number;
  onClick: () => void;
}

/**
 * 関連買主通知バッジ
 * - 関連買主の数を表示
 * - クリックで関連買主セクションにスクロール
 */
const RelatedBuyerNotificationBadge: React.FC<RelatedBuyerNotificationBadgeProps>;
```

## Data Models

### Database Schema

既存の`buyers`テーブルを使用します。新しいテーブルは作成しません。

```sql
-- 既存のbuyersテーブル
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_number TEXT UNIQUE NOT NULL,  -- スプレッドシートのキー
  name TEXT,
  phone_number TEXT,
  email TEXT,
  property_number TEXT,
  inquiry_date TIMESTAMP,
  -- その他のフィールド...
);

-- 関連買主検索用のインデックス（パフォーマンス最適化）
CREATE INDEX idx_buyers_phone_number ON buyers(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_buyers_email ON buyers(email) WHERE email IS NOT NULL;
```

### 検索ロジック

```sql
-- 関連買主を検索するクエリ
SELECT 
  b.*,
  CASE 
    WHEN b.phone_number = $1 AND b.email = $2 THEN 'both'
    WHEN b.phone_number = $1 THEN 'phone'
    WHEN b.email = $2 THEN 'email'
  END as match_reason
FROM buyers b
WHERE 
  b.id != $3  -- 自分自身を除外
  AND (
    (b.phone_number IS NOT NULL AND b.phone_number = $1)
    OR (b.email IS NOT NULL AND b.email = $2)
  )
ORDER BY b.inquiry_date DESC NULLS LAST;
```

### 関係分類ロジック

```typescript
function classifyRelation(
  currentBuyer: Buyer,
  relatedBuyer: Buyer
): RelationType {
  // 物件番号が異なる場合は複数問合せ
  if (currentBuyer.property_number !== relatedBuyer.property_number) {
    return RelationType.MULTIPLE_INQUIRY;
  }
  
  // 物件番号が同じ場合は重複の可能性
  return RelationType.POSSIBLE_DUPLICATE;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 関連買主検出の完全性

*For any* buyer with a phone number or email address, the system should detect all other buyers with the same phone number or email address (excluding the buyer itself).

**Validates: Requirements 1.1, 1.2**

### Property 2: 自己参照の除外

*For any* buyer, the related buyers list should not include the buyer itself.

**Validates: Requirements 1.1, 1.2**

### Property 3: 関係分類の正確性

*For any* pair of related buyers, if they have different property numbers, they should be classified as "複数問合せ", and if they have the same property number, they should be classified as "重複の可能性".

**Validates: Requirements 2.2, 2.3**

### Property 4: 統合履歴の完全性

*For any* buyer with related buyers, the unified inquiry history should include all inquiries from the buyer and all related buyers.

**Validates: Requirements 3.1, 3.2**

### Property 5: 履歴ソート順の正確性

*For any* unified inquiry history, all inquiries should be sorted by date in descending order (newest first).

**Validates: Requirements 3.4**

### Property 6: 通知バッジの表示条件

*For any* buyer, the notification badge should be displayed if and only if the buyer has at least one related buyer.

**Validates: Requirements 4.1, 4.2**

### Property 7: 同期ロジックの不変性

*For any* buyer sync operation, the system should use buyer_number as the primary key, and should not prevent creation of buyers with the same phone number or email address.

**Validates: Requirements 5.1, 5.2, 5.5**

## Error Handling

### Backend Error Handling

```typescript
class RelatedBuyerService {
  async findRelatedBuyers(buyerId: string): Promise<RelatedBuyer[]> {
    try {
      // 買主を取得
      const buyer = await this.getBuyer(buyerId);
      if (!buyer) {
        throw new NotFoundError('Buyer not found');
      }

      // 電話番号もメールアドレスもない場合は空配列を返す
      if (!buyer.phone_number && !buyer.email) {
        return [];
      }

      // 関連買主を検索
      const relatedBuyers = await this.searchRelatedBuyers(buyer);
      
      // 関係を分類
      return relatedBuyers.map(rb => ({
        ...rb,
        relation_type: this.classifyRelation(buyer, rb)
      }));
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error finding related buyers', { buyerId, error });
      throw new InternalServerError('Failed to find related buyers');
    }
  }
}
```

### Frontend Error Handling

```typescript
const RelatedBuyersSection: React.FC<RelatedBuyersSectionProps> = ({ buyerId }) => {
  const [relatedBuyers, setRelatedBuyers] = useState<RelatedBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatedBuyers = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/buyers/${buyerId}/related`);
        setRelatedBuyers(response.data.related_buyers);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch related buyers', err);
        setError('関連買主の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedBuyers();
  }, [buyerId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (relatedBuyers.length === 0) return null;

  return (
    <div className="related-buyers-section">
      {/* 関連買主を表示 */}
    </div>
  );
};
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **RelatedBuyerService Tests**
   - 電話番号が一致する買主を検出
   - メールアドレスが一致する買主を検出
   - 両方が一致する買主を検出
   - 自分自身を除外
   - 電話番号もメールアドレスもない場合は空配列を返す

2. **Classification Tests**
   - 異なる物件番号の場合は"複数問合せ"
   - 同じ物件番号の場合は"重複の可能性"
   - 物件番号がnullの場合の処理

3. **Unified History Tests**
   - 複数の買主の履歴を統合
   - 日付順にソート
   - 買主番号を正しく表示

### Property-Based Tests

Property-based tests will verify universal properties across all inputs (minimum 100 iterations per test):

1. **Property Test 1: 関連買主検出の完全性**
   - **Feature: buyer-duplicate-management, Property 1: For any buyer with a phone number or email address, the system should detect all other buyers with the same phone number or email address (excluding the buyer itself)**
   - Generate random buyers with various phone numbers and emails
   - Verify all matching buyers are detected

2. **Property Test 2: 自己参照の除外**
   - **Feature: buyer-duplicate-management, Property 2: For any buyer, the related buyers list should not include the buyer itself**
   - Generate random buyers
   - Verify the buyer's own ID is never in the related buyers list

3. **Property Test 3: 関係分類の正確性**
   - **Feature: buyer-duplicate-management, Property 3: For any pair of related buyers, if they have different property numbers, they should be classified as "複数問合せ", and if they have the same property number, they should be classified as "重複の可能性"**
   - Generate random pairs of related buyers with various property numbers
   - Verify classification is correct

4. **Property Test 4: 統合履歴の完全性**
   - **Feature: buyer-duplicate-management, Property 4: For any buyer with related buyers, the unified inquiry history should include all inquiries from the buyer and all related buyers**
   - Generate random buyers with inquiry histories
   - Verify all inquiries are included

5. **Property Test 5: 履歴ソート順の正確性**
   - **Feature: buyer-duplicate-management, Property 5: For any unified inquiry history, all inquiries should be sorted by date in descending order (newest first)**
   - Generate random inquiry histories with various dates
   - Verify sorting is correct

6. **Property Test 6: 通知バッジの表示条件**
   - **Feature: buyer-duplicate-management, Property 6: For any buyer, the notification badge should be displayed if and only if the buyer has at least one related buyer**
   - Generate random buyers with and without related buyers
   - Verify badge display logic

7. **Property Test 7: 同期ロジックの不変性**
   - **Feature: buyer-duplicate-management, Property 7: For any buyer sync operation, the system should use buyer_number as the primary key, and should not prevent creation of buyers with the same phone number or email address**
   - Generate random buyer sync operations
   - Verify buyer_number is used as key and duplicates are allowed

### Integration Tests

1. API endpoint tests
2. Database query performance tests
3. Frontend component integration tests

## Performance Considerations

### Database Indexing

```sql
-- 関連買主検索のパフォーマンス最適化
CREATE INDEX idx_buyers_phone_number ON buyers(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_buyers_email ON buyers(email) WHERE email IS NOT NULL;
```

### Caching Strategy

関連買主の検索結果は頻繁に変更されないため、短期間のキャッシュを使用できます：

```typescript
// 5分間のキャッシュ
const CACHE_TTL = 5 * 60 * 1000;

class RelatedBuyerService {
  private cache = new Map<string, { data: RelatedBuyer[], timestamp: number }>();

  async findRelatedBuyers(buyerId: string): Promise<RelatedBuyer[]> {
    const cached = this.cache.get(buyerId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await this.fetchRelatedBuyers(buyerId);
    this.cache.set(buyerId, { data, timestamp: Date.now() });
    return data;
  }
}
```

### Query Optimization

```typescript
// 1回のクエリで関連買主と問合せ履歴を取得
async findRelatedBuyersWithHistory(buyerId: string) {
  const buyer = await this.getBuyer(buyerId);
  
  // 関連買主を検索（インデックスを使用）
  const relatedBuyers = await db.query(`
    SELECT b.*, 
           CASE 
             WHEN b.phone_number = $1 AND b.email = $2 THEN 'both'
             WHEN b.phone_number = $1 THEN 'phone'
             WHEN b.email = $2 THEN 'email'
           END as match_reason
    FROM buyers b
    WHERE b.id != $3
      AND (
        (b.phone_number IS NOT NULL AND b.phone_number = $1)
        OR (b.email IS NOT NULL AND b.email = $2)
      )
  `, [buyer.phone_number, buyer.email, buyerId]);

  return relatedBuyers;
}
```

## UI/UX Design

### 関連買主セクション

```
┌─────────────────────────────────────────────────────────┐
│ 関連買主 (3)                                             │
├─────────────────────────────────────────────────────────┤
│ 📋 買主6647 - 物件AA12345 (2024/01/15)                  │
│    [複数問合せ] 電話番号が一致                          │
├─────────────────────────────────────────────────────────┤
│ 📋 買主6648 - 物件AA12346 (2024/02/20)                  │
│    [複数問合せ] 電話番号・メールアドレスが一致          │
├─────────────────────────────────────────────────────────┤
│ ⚠️ 買主6649 - 物件AA12345 (2024/01/16)                  │
│    [重複の可能性] 電話番号が一致                        │
│    ※同じ物件への問合せです。スプレッドシートを確認      │
└─────────────────────────────────────────────────────────┘
```

### 統合問合せ履歴

```
┌─────────────────────────────────────────────────────────┐
│ 統合問合せ履歴                                           │
├─────────────────────────────────────────────────────────┤
│ 2024/02/20 | 買主6648 | 物件AA12346 | 大分市中央町      │
│ 2024/01/16 | 買主6649 | 物件AA12345 | 別府市北浜        │
│ 2024/01/15 | 買主6647 | 物件AA12345 | 別府市北浜        │
└─────────────────────────────────────────────────────────┘
```

### 通知バッジ

```
┌─────────────────────────────────────────────────────────┐
│ 買主詳細                                    [関連買主: 3]│
│                                                          │
│ 買主番号: 6647                                           │
│ 氏名: 山田太郎                                           │
│ 電話番号: 090-1234-5678                                  │
│ メールアドレス: yamada@example.com                       │
└─────────────────────────────────────────────────────────┘
```

## Implementation Notes

### 重要な設計決定

1. **自動統合しない**: システムは買主レコードを自動的に統合・削除しません
2. **表示のみ**: 関連情報を表示するのみで、データの変更は行いません
3. **手動削除**: 真の重複は手動でスプレッドシートから削除します
4. **buyer_numberをキーとして使用**: 同期時はbuyer_numberを主キーとして使用します
5. **重複を許可**: 同じ電話番号やメールアドレスを持つ買主の作成を許可します

### 段階的な実装

1. **Phase 1**: Backend API実装
   - RelatedBuyerService
   - API endpoints

2. **Phase 2**: Frontend UI実装
   - RelatedBuyersSection
   - UnifiedInquiryHistoryTable
   - NotificationBadge

3. **Phase 3**: パフォーマンス最適化
   - インデックス追加
   - キャッシング実装

4. **Phase 4**: テスト実装
   - Unit tests
   - Property-based tests
   - Integration tests
