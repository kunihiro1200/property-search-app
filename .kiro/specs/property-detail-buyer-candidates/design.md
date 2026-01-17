# Design Document

## Overview

物件詳細画面に買主候補リストを表示する機能を実装する。物件の条件（エリア、種別、価格帯）に合致し、最新状況または問合せ時確度がA/Bの買主を抽出してリスト化する。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ PropertyListingDetailPage.tsx                                ││
│  │  └── BuyerCandidateList.tsx (新規)                          ││
│  │       - 買主候補リストの表示                                  ││
│  │       - 買主詳細画面へのナビゲーション                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express)                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ routes/propertyListings.ts                                   ││
│  │  └── GET /:propertyNumber/buyer-candidates                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ services/BuyerCandidateService.ts (新規)                     ││
│  │  - フィルタリングロジック                                     ││
│  │  - 条件マッチング                                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                           │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ property_listings │    │     buyers       │                   │
│  │ - property_number │    │ - latest_status  │                   │
│  │ - property_type   │    │ - inquiry_conf.  │                   │
│  │ - sales_price     │    │ - desired_area   │                   │
│  │ - distribution_   │    │ - desired_prop.  │                   │
│  │   areas           │    │ - price_range_*  │                   │
│  └──────────────────┘    │ - reception_date │                   │
│                          └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### BuyerCandidate (Response)

```typescript
interface BuyerCandidate {
  id: string;
  buyer_number: string;
  name: string;
  latest_status: string | null;
  inquiry_confidence: string | null;
  desired_area: string | null;
  desired_property_type: string | null;
  reception_date: string | null;
  email: string | null;
  phone_number: string | null;
}

interface BuyerCandidateResponse {
  candidates: BuyerCandidate[];
  total: number;
  property: {
    property_number: string;
    property_type: string | null;
    sales_price: number | null;
    distribution_areas: string | null;
  };
}
```

### Filtering Criteria

```typescript
interface FilterCriteria {
  // 最新状況フィルタ: A or B を含む、または空欄で問合せ時確度がA/B
  statusFilter: (buyer: Buyer) => boolean;
  
  // エリアフィルタ: 物件の配信エリアと買主の希望エリアが合致
  areaFilter: (buyer: Buyer, propertyAreas: string[]) => boolean;
  
  // 種別フィルタ: 物件種別と買主の希望種別が合致
  propertyTypeFilter: (buyer: Buyer, propertyType: string) => boolean;
  
  // 価格帯フィルタ: 物件価格が買主の希望価格帯内
  priceFilter: (buyer: Buyer, propertyPrice: number, propertyType: string) => boolean;
}
```

## API Design

### GET /api/property-listings/:propertyNumber/buyer-candidates

**Request:**
```
GET /api/property-listings/AA12345/buyer-candidates
```

**Response (200 OK):**
```json
{
  "candidates": [
    {
      "id": "uuid-1",
      "buyer_number": "6789",
      "name": "山田太郎",
      "latest_status": "A",
      "inquiry_confidence": "A",
      "desired_area": "①②③",
      "desired_property_type": "戸建",
      "reception_date": "2025-12-01",
      "email": "yamada@example.com",
      "phone_number": "090-1234-5678"
    }
  ],
  "total": 1,
  "property": {
    "property_number": "AA12345",
    "property_type": "戸建",
    "sales_price": 25000000,
    "distribution_areas": "①②"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Property not found",
  "code": "PROPERTY_NOT_FOUND"
}
```

## Filtering Logic

### 1. 最新状況/問合せ時確度フィルタ

```typescript
function matchesStatusCriteria(buyer: Buyer): boolean {
  const latestStatus = buyer.latest_status?.trim() || '';
  const inquiryConfidence = buyer.inquiry_confidence?.trim() || '';
  
  // 最新状況がA or Bを含む場合
  if (latestStatus && (latestStatus.includes('A') || latestStatus.includes('B'))) {
    return true;
  }
  
  // 最新状況が空欄で、問合せ時確度がA or Bの場合
  if (!latestStatus && (inquiryConfidence === 'A' || inquiryConfidence === 'B')) {
    return true;
  }
  
  return false;
}
```

### 2. エリアフィルタ

```typescript
function matchesAreaCriteria(buyer: Buyer, propertyAreas: string[]): boolean {
  const desiredArea = buyer.desired_area?.trim() || '';
  
  // 希望エリアが空欄の場合は条件を満たす
  if (!desiredArea) {
    return true;
  }
  
  // 物件の配信エリアと買主の希望エリアが1つでも合致すれば条件を満たす
  // エリア番号は①②③...の形式
  const buyerAreas = extractAreaNumbers(desiredArea);
  return propertyAreas.some(area => buyerAreas.includes(area));
}
```

### 3. 種別フィルタ

```typescript
function matchesPropertyTypeCriteria(buyer: Buyer, propertyType: string): boolean {
  const desiredType = buyer.desired_property_type?.trim() || '';
  
  // 希望種別が空欄の場合は条件を満たす
  if (!desiredType) {
    return true;
  }
  
  // 種別の正規化と比較
  const normalizedPropertyType = normalizePropertyType(propertyType);
  const normalizedDesiredType = normalizePropertyType(desiredType);
  
  return normalizedDesiredType.includes(normalizedPropertyType) ||
         normalizedPropertyType.includes(normalizedDesiredType);
}
```

### 4. 価格帯フィルタ

```typescript
function matchesPriceCriteria(
  buyer: Buyer, 
  propertyPrice: number, 
  propertyType: string
): boolean {
  // 物件種別に応じた価格帯フィールドを選択
  let priceRange: string | null = null;
  
  if (propertyType.includes('戸建')) {
    priceRange = buyer.price_range_house;
  } else if (propertyType.includes('マンション')) {
    priceRange = buyer.price_range_apartment;
  } else if (propertyType.includes('土地')) {
    priceRange = buyer.price_range_land;
  }
  
  // 価格帯が空欄の場合は条件を満たす
  if (!priceRange) {
    return true;
  }
  
  // 価格帯をパースして範囲チェック
  const { min, max } = parsePriceRange(priceRange);
  return propertyPrice >= min && propertyPrice <= max;
}
```

## Component Design

### BuyerCandidateList.tsx

```typescript
interface BuyerCandidateListProps {
  propertyNumber: string;
  propertyType?: string;
  salesPrice?: number;
  distributionAreas?: string;
}

// 表示項目
// - 買主番号（リンク）
// - 氏名
// - 最新状況
// - 問合せ時確度
// - 希望エリア
// - 希望種別
// - 受付日
```

## Error Handling

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| PROPERTY_NOT_FOUND | 404 | 指定された物件番号が存在しない |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

## Performance Considerations

1. **クエリ最適化**: 
   - 最新状況/問合せ時確度のフィルタリングはDBレベルで実行
   - エリア/種別/価格帯のフィルタリングはアプリケーションレベルで実行

2. **結果制限**:
   - 最大50件まで返却
   - 受付日の降順でソート

3. **キャッシュ**:
   - 将来的にRedisキャッシュを検討（現時点では不要）

## Security Considerations

1. 認証済みユーザーのみアクセス可能
2. 買主の個人情報（電話番号、メールアドレス）は表示するが、外部への漏洩防止を徹底
