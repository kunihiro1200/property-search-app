# Design Document

## Overview

物件リストページに「Gmailで配信」機能を追加し、条件に合致する買主のメールアドレスをBCCに自動追加してGmailを立ち上げます。複数のメールテンプレートをサポートし、初期テンプレートとして「値下げメール配信」を提供します。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PropertyListingsPage                                 │  │
│  │  - "Gmailで配信" Button                              │  │
│  │  - Template Selection Menu                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GmailDistributionService (Frontend)                  │  │
│  │  - Template Management                                │  │
│  │  - Gmail URL Generation                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Request
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/property-listings/:propertyNumber/             │  │
│  │  distribution-buyers                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BuyerDistributionService                             │  │
│  │  - Filter buyers by criteria                          │  │
│  │  - Geographic distance calculation                    │  │
│  │  - Email address collection                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GeolocationService                                   │  │
│  │  - Extract coordinates from Google Maps URL          │  │
│  │  - Calculate distance between two points             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Database Query
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  buyers table                                         │  │
│  │  - desired_area (★エリア)                            │  │
│  │  - distribution_type (配信種別)                      │  │
│  │  - email (●メアド)                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  property_listings table                              │  │
│  │  - google_map_url                                     │  │
│  │  - address                                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. GmailDistributionButton Component

新しいボタンコンポーネントを作成します。

```typescript
interface GmailDistributionButtonProps {
  propertyNumber: string;
  propertyAddress?: string;
}

// Usage in PropertyListingsPage
<GmailDistributionButton 
  propertyNumber={listing.property_number}
  propertyAddress={listing.address}
/>
```

#### 2. EmailTemplateSelector Component

テンプレート選択用のメニューコンポーネント。

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: EmailTemplate) => void;
  templates: EmailTemplate[];
}
```

#### 3. GmailDistributionService (Frontend)

```typescript
class GmailDistributionService {
  // テンプレート定義
  private templates: EmailTemplate[] = [
    {
      id: 'price-reduction',
      name: '値下げメール配信',
      subject: '【価格変更】{{address}}',
      body: `お世話になっております。\n\n{{address}}の物件価格が変更となりました。\n\n詳細はお問い合わせください。\n\nよろしくお願いいたします。`
    }
  ];

  // 買主メールアドレス取得
  async fetchQualifiedBuyerEmails(propertyNumber: string): Promise<string[]>;

  // Gmail URL生成
  generateGmailUrl(params: {
    to?: string;
    bcc: string[];
    subject: string;
    body: string;
  }): string;

  // テンプレート取得
  getTemplates(): EmailTemplate[];

  // プレースホルダー置換
  replacePlaceholders(template: string, data: Record<string, string>): string;
}
```

### Backend Services

#### 1. BuyerDistributionService

```typescript
interface BuyerFilterCriteria {
  propertyNumber: string;
  includeRadiusFilter: boolean;
}

interface QualifiedBuyer {
  buyer_number: string;
  email: string;
  desired_area: string;
  distribution_type: string;
}

class BuyerDistributionService {
  // 条件に合致する買主を取得
  async getQualifiedBuyers(criteria: BuyerFilterCriteria): Promise<QualifiedBuyer[]>;

  // ★エリアに①を含むかチェック
  private hasCircleOneInArea(desiredArea: string): boolean;

  // 配信が「要」かチェック
  private isDistributionRequired(distributionType: string): boolean;

  // 半径フィルター適用
  private async applyRadiusFilter(
    buyers: QualifiedBuyer[],
    propertyCoords: { lat: number; lng: number }
  ): Promise<QualifiedBuyer[]>;
}
```

#### 2. GeolocationService

```typescript
interface Coordinates {
  lat: number;
  lng: number;
}

class GeolocationService {
  // Google Maps URLから座標を抽出
  extractCoordinatesFromUrl(googleMapsUrl: string): Coordinates | null;

  // 2点間の距離を計算（km）
  calculateDistance(point1: Coordinates, point2: Coordinates): number;

  // 基準地点の座標（固定値）
  private readonly REFERENCE_LOCATION: Coordinates = {
    lat: 33.2382, // 例: 大分市の座標
    lng: 131.6126
  };

  // 半径内かチェック
  isWithinRadius(
    propertyCoords: Coordinates,
    radiusKm: number = 3
  ): boolean;
}
```

### API Endpoints

#### GET /api/property-listings/:propertyNumber/distribution-buyers

条件に合致する買主のメールアドレスリストを取得します。

**Request:**
```
GET /api/property-listings/AA12345/distribution-buyers
```

**Response:**
```json
{
  "emails": [
    "buyer1@example.com",
    "buyer2@example.com",
    "buyer3@example.com"
  ],
  "count": 3,
  "appliedFilters": {
    "areaFilter": true,
    "distributionFilter": true,
    "radiusFilter": true
  }
}
```

**Error Response:**
```json
{
  "error": "Property not found",
  "code": "PROPERTY_NOT_FOUND"
}
```

## Data Models

### Buyer Table (既存)

```sql
-- 関連フィールド
desired_area TEXT,           -- ★エリア
distribution_type VARCHAR,   -- 配信種別
email TEXT                   -- ●メアド
```

### Property Listing Table (既存)

```sql
-- 関連フィールド
google_map_url TEXT,         -- GoogleMap URL
address TEXT,                -- 所在地
property_number VARCHAR(50)  -- 物件番号
```

### Email Template Configuration (Frontend)

```typescript
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  placeholders?: string[];  // 利用可能なプレースホルダー
}
```

## Error Handling

### Frontend Error Handling

1. **No Qualified Buyers**
   - メッセージ: 「配信対象の買主が見つかりませんでした」
   - アクション: Gmailを開かない

2. **API Request Failed**
   - メッセージ: 「買主情報の取得に失敗しました」
   - アクション: エラーダイアログ表示

3. **Gmail URL Too Long**
   - メッセージ: 「受信者が多すぎます。一部の買主のみ追加されました」
   - アクション: 制限内の買主でGmailを開く

### Backend Error Handling

1. **Property Not Found**
   - Status: 404
   - Response: `{ error: "Property not found" }`

2. **Database Query Error**
   - Status: 500
   - Response: `{ error: "Failed to fetch buyers" }`
   - ログ: エラー詳細をログに記録

3. **Geolocation Calculation Error**
   - フォールバック: 半径フィルターをスキップ
   - ログ: 警告レベルでログ記録

## Testing Strategy

### Unit Tests

1. **GeolocationService**
   - Google Maps URL解析のテスト
   - 距離計算の精度テスト
   - 半径内判定のテスト

2. **BuyerDistributionService**
   - ★エリアフィルターのテスト
   - 配信フィルターのテスト
   - 複合条件のテスト

3. **GmailDistributionService (Frontend)**
   - Gmail URL生成のテスト
   - プレースホルダー置換のテスト
   - テンプレート管理のテスト

### Integration Tests

1. **API Endpoint Test**
   - 正常系: 条件に合致する買主が返される
   - 異常系: 物件が存在しない場合
   - 境界値: 買主が0件の場合

2. **End-to-End Test**
   - ボタンクリックからGmail起動までの流れ
   - テンプレート選択の動作確認
   - BCC追加の確認

## Implementation Notes

### Gmail URL Format

Gmailの新規作成URLは以下の形式を使用します：

```
https://mail.google.com/mail/?view=cm&fs=1&to=&bcc=email1@example.com,email2@example.com&su=Subject&body=Body
```

パラメータ:
- `view=cm`: 新規作成モード
- `fs=1`: フルスクリーン
- `to`: 宛先（空）
- `bcc`: BCC（カンマ区切り）
- `su`: 件名（URLエンコード）
- `body`: 本文（URLエンコード）

### URL Length Limitation

- Gmail URLの最大長: 約2000文字
- 1メールアドレス平均: 30文字
- 推定最大BCC数: 約50-60件
- 超過時の対応: 先頭から制限数まで追加し、ユーザーに通知

### Geolocation Calculation

Haversine公式を使用して2点間の距離を計算：

```typescript
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // 地球の半径 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

### Google Maps URL Parsing

Google Maps URLから座標を抽出するパターン：

1. `/@33.2382,131.6126,15z` 形式
2. `?q=33.2382,131.6126` 形式
3. Short URL (`maps.app.goo.gl`) の場合はリダイレクト先を取得

### Reference Location

基準地点のURLから座標を抽出して定数として保存：
```typescript
const REFERENCE_LOCATION = {
  lat: 33.2382,  // 実際の座標に置き換え
  lng: 131.6126
};
```

## Security Considerations

1. **Email Address Protection**
   - BCCを使用することで、受信者間でメールアドレスが見えないようにする
   - フロントエンドでメールアドレスをログに出力しない

2. **Input Validation**
   - 物件番号の形式チェック
   - メールアドレスの形式検証

3. **Rate Limiting**
   - API呼び出しの頻度制限（1ユーザーあたり10回/分）

4. **Authorization**
   - 認証済みユーザーのみがAPIを呼び出せる
   - 担当者権限のチェック

