# Design Document

## Architecture Overview

公開物件サイトにおいて、戸建てとマンションの物件に対して新築年月を表示する機能の設計。既存のPublicPropertyCard、PublicPropertyDetailPageコンポーネントに最小限の変更を加え、新築年月フィールドを追加する。

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  PublicPropertyListingPage                   │
│  (frontend/src/pages/PublicPropertyListingPage.tsx)         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   PublicPropertyCard                         │
│  (frontend/src/components/PublicPropertyCard.tsx)           │
│  - Display construction date for 戸建て/マンション           │
│  - Format date as "YYYY年MM月"                              │
│  - Hide field if data is missing                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              PublicPropertyDetailPage                        │
│  (frontend/src/pages/PublicPropertyDetailPage.tsx)          │
│  - Display construction date in specifications section      │
│  - Format date as "YYYY年MM月"                              │
│  - Hide field if data is missing                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ API Request
┌─────────────────────────────────────────────────────────────┐
│              Backend API Endpoint                            │
│  GET /api/public-properties                                 │
│  GET /api/public-properties/:id                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  PropertyListingService                      │
│  (backend/src/services/PropertyListingService.ts)           │
│  - Include construction_date in response                    │
│  - No additional processing needed                          │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Database Schema

既存の`property_listings`テーブルに`construction_date`カラムが存在することを前提とする。

```sql
-- 既存のカラム（確認のみ）
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS construction_date TEXT;
```

### TypeScript Interface

`PublicProperty`インターフェースに`construction_date`フィールドを追加:

```typescript
export interface PublicProperty {
  id: string;
  property_number: string;
  property_type: string;
  address: string;
  display_address?: string;
  price?: number;
  land_area?: number;
  building_area?: number;
  building_age?: number;
  floor_plan?: string;
  construction_date?: string;  // 新規追加
  description?: string;
  features?: string[];
  images?: string[];
  google_map_url?: string;
  created_at: string;
  updated_at: string;
}
```

## Frontend Design

### Date Formatting Utility

日付フォーマット用のユーティリティ関数を作成:

```typescript
// frontend/src/utils/dateFormatters.ts

/**
 * 新築年月を日本語形式にフォーマット
 * @param constructionDate - YYYY-MM, YYYY/MM, YYYYMM, YYYY年MM月のいずれかの形式
 * @returns YYYY年MM月形式の文字列、または null（無効な場合）
 */
export function formatConstructionDate(constructionDate: string | null | undefined): string | null {
  if (!constructionDate || typeof constructionDate !== 'string') {
    return null;
  }

  const trimmed = constructionDate.trim();
  if (!trimmed) {
    return null;
  }

  // すでに"YYYY年MM月"形式の場合はそのまま返す
  if (/^\d{4}年\d{1,2}月$/.test(trimmed)) {
    return trimmed;
  }

  // YYYY-MM形式
  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
  if (dashMatch) {
    const [, year, month] = dashMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // YYYY/MM形式
  const slashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, year, month] = slashMatch;
    return `${year}年${month.padStart(2, '0')}月`;
  }

  // YYYYMM形式
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})$/);
  if (compactMatch) {
    const [, year, month] = compactMatch;
    return `${year}年${month}月`;
  }

  // 認識できない形式
  console.warn(`[formatConstructionDate] Unrecognized format: ${constructionDate}`);
  return null;
}

/**
 * 物件タイプが新築年月表示対象かどうかを判定
 * @param propertyType - 物件タイプ
 * @returns 表示対象の場合true
 */
export function shouldShowConstructionDate(propertyType: string): boolean {
  const targetTypes = ['戸建', '戸建て', 'マンション'];
  return targetTypes.includes(propertyType);
}
```

### PublicPropertyCard Component

物件カードに新築年月を表示:

```typescript
// frontend/src/components/PublicPropertyCard.tsx

import { formatConstructionDate, shouldShowConstructionDate } from '../utils/dateFormatters';

const PublicPropertyCard: React.FC<PublicPropertyCardProps> = ({ 
  property, 
  animationDelay = 0 
}) => {
  // ... existing code ...

  const formattedConstructionDate = formatConstructionDate(property.construction_date);
  const showConstructionDate = shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  return (
    <Card className="property-card animate-fade-in-up" onClick={handleClick}>
      {/* ... existing image section ... */}
      
      <CardContent className="property-card-content">
        {/* ... existing price and address ... */}
        
        <Box className="property-features">
          {/* 新築年月を最初に表示 */}
          {showConstructionDate && (
            <Box className="property-feature">
              <CalendarIcon className="property-feature-icon" size={16} />
              <span>{formattedConstructionDate}</span>
            </Box>
          )}
          
          {/* ... existing features (土地面積、建物面積など) ... */}
        </Box>
      </CardContent>
    </Card>
  );
};
```

### PublicPropertyDetailPage Component

物件詳細ページに新築年月を表示:

```typescript
// frontend/src/pages/PublicPropertyDetailPage.tsx

import { formatConstructionDate, shouldShowConstructionDate } from '../utils/dateFormatters';

const PublicPropertyDetailPage: React.FC = () => {
  // ... existing code ...

  const formattedConstructionDate = formatConstructionDate(property.construction_date);
  const showConstructionDate = shouldShowConstructionDate(property.property_type) && formattedConstructionDate;

  return (
    <>
      {/* ... existing header and image sections ... */}
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {/* ... existing basic info ... */}
        
        <Grid container spacing={2}>
          {/* 新築年月を最初に表示 */}
          {showConstructionDate && (
            <Grid item xs={6} sm={4}>
              <Typography variant="body2" color="text.secondary">
                新築年月
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {formattedConstructionDate}
              </Typography>
            </Grid>
          )}
          
          {/* ... existing fields (土地面積、建物面積など) ... */}
        </Grid>
      </Paper>
    </>
  );
};
```

## Backend Design

### PropertyListingService

既存のサービスに変更は不要。`construction_date`カラムは既にSELECT文に含まれていることを前提とする。

```typescript
// backend/src/services/PropertyListingService.ts

// 既存のgetPublicProperties()メソッドで自動的にconstruction_dateが含まれる
async getPublicProperties(filters: PublicPropertyFilters): Promise<PublicPropertyListResponse> {
  // ... existing implementation ...
  // SELECT文に construction_date が含まれていることを確認
}

// 既存のgetPublicPropertyById()メソッドで自動的にconstruction_dateが含まれる
async getPublicPropertyById(id: string): Promise<PublicProperty | null> {
  // ... existing implementation ...
  // SELECT文に construction_date が含まれていることを確認
}
```

もしSELECT文に含まれていない場合は、以下のように追加:

```typescript
const query = `
  SELECT 
    id,
    property_number,
    property_type,
    address,
    display_address,
    price,
    land_area,
    building_area,
    building_age,
    floor_plan,
    construction_date,  -- 追加
    description,
    features,
    google_map_url,
    created_at,
    updated_at
  FROM property_listings
  WHERE atbb_status = '専任・公開中'
  ORDER BY created_at DESC
`;
```

## Display Logic

### 表示条件

新築年月を表示する条件:

1. **物件タイプが対象**: `property_type`が「戸建」「戸建て」「マンション」のいずれか
2. **データが存在**: `construction_date`がnull、undefined、空文字列でない
3. **フォーマット可能**: 認識可能な日付形式である

### 表示位置

#### 物件カード
- 物件特徴セクション（`property-features`）の最初に表示
- カレンダーアイコンと共に表示
- 他の特徴（土地面積、建物面積など）と同じスタイル

#### 物件詳細ページ
- 物件詳細グリッドの最初に表示
- ラベル: "新築年月"
- 他のフィールド（土地面積、建物面積など）と同じスタイル

### 非表示条件

以下の場合は新築年月フィールドを表示しない:

1. 物件タイプが「土地」「その他」の場合
2. `construction_date`がnull、undefined、空文字列の場合
3. 日付フォーマットが認識できない場合

## Error Handling

### フロントエンド

1. **無効な日付形式**: 
   - `formatConstructionDate()`がnullを返す
   - フィールドを非表示にする
   - コンソールに警告を出力

2. **データ欠損**:
   - フィールドを非表示にする
   - レイアウトは崩れない（グレースフルデグラデーション）

3. **型エラー**:
   - TypeScriptの型チェックで防止
   - ランタイムでは`typeof`チェックで対応

### バックエンド

1. **データベースエラー**:
   - 既存のエラーハンドリングに従う
   - `construction_date`がnullの場合も正常なレスポンス

2. **データ型不一致**:
   - データベースのTEXT型をそのまま返す
   - フロントエンドでフォーマット処理

## Performance Considerations

### キャッシュ戦略

- 既存のAPIレスポンスキャッシュをそのまま使用
- `construction_date`フィールドの追加による影響は最小限

### レンダリング最適化

- 条件分岐は最小限（`shouldShowConstructionDate()`）
- 日付フォーマットは軽量な文字列操作のみ
- 追加のAPIリクエストは不要

## Testing Strategy

### Unit Tests

#### フロントエンド

```typescript
// frontend/src/utils/__tests__/dateFormatters.test.ts

describe('formatConstructionDate', () => {
  it('formats YYYY-MM correctly', () => {
    expect(formatConstructionDate('2020-03')).toBe('2020年03月');
  });

  it('formats YYYY/MM correctly', () => {
    expect(formatConstructionDate('2020/3')).toBe('2020年03月');
  });

  it('formats YYYYMM correctly', () => {
    expect(formatConstructionDate('202003')).toBe('2020年03月');
  });

  it('returns as-is for YYYY年MM月 format', () => {
    expect(formatConstructionDate('2020年3月')).toBe('2020年3月');
  });

  it('returns null for invalid format', () => {
    expect(formatConstructionDate('invalid')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(formatConstructionDate(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatConstructionDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(formatConstructionDate('')).toBeNull();
  });
});

describe('shouldShowConstructionDate', () => {
  it('returns true for 戸建', () => {
    expect(shouldShowConstructionDate('戸建')).toBe(true);
  });

  it('returns true for 戸建て', () => {
    expect(shouldShowConstructionDate('戸建て')).toBe(true);
  });

  it('returns true for マンション', () => {
    expect(shouldShowConstructionDate('マンション')).toBe(true);
  });

  it('returns false for 土地', () => {
    expect(shouldShowConstructionDate('土地')).toBe(false);
  });

  it('returns false for その他', () => {
    expect(shouldShowConstructionDate('その他')).toBe(false);
  });
});
```

### Integration Tests

1. **物件カード表示**:
   - 戸建て物件で新築年月が表示される
   - マンション物件で新築年月が表示される
   - 土地物件で新築年月が表示されない
   - データがない場合に表示されない

2. **物件詳細ページ表示**:
   - 新築年月が正しくフォーマットされて表示される
   - データがない場合にレイアウトが崩れない

### Manual Testing

1. **様々な日付形式**:
   - YYYY-MM形式のデータ
   - YYYY/MM形式のデータ
   - YYYYMM形式のデータ
   - YYYY年MM月形式のデータ

2. **物件タイプ別**:
   - 戸建て物件
   - マンション物件
   - 土地物件（表示されないことを確認）

3. **エッジケース**:
   - construction_dateがnull
   - construction_dateが空文字列
   - construction_dateが無効な形式

## Migration Plan

### Phase 1: Backend Verification

1. データベースに`construction_date`カラムが存在することを確認
2. PropertyListingServiceのSELECT文に含まれていることを確認
3. 既存データのフォーマットを確認

### Phase 2: Frontend Implementation

1. `dateFormatters.ts`ユーティリティを作成
2. `PublicProperty`インターフェースを更新
3. `PublicPropertyCard`コンポーネントを更新
4. `PublicPropertyDetailPage`コンポーネントを更新
5. ユニットテストを追加

### Phase 3: Testing

1. ユニットテストを実行
2. 手動テストを実施
3. ステージング環境で確認

### Phase 4: Production Deployment

1. フロントエンドをデプロイ
2. 本番環境で動作確認
3. ユーザーフィードバックを収集

## Rollback Plan

問題が発生した場合:

1. `PublicPropertyCard`と`PublicPropertyDetailPage`から新築年月表示コードを削除
2. フロントエンドを再デプロイ
3. バックエンドは変更不要（影響なし）

## Future Enhancements

1. **築年数との連携**: 新築年月から自動的に築年数を計算
2. **フィルタリング**: 新築年月による検索・フィルタリング機能
3. **ソート**: 新築年月順でのソート機能
4. **表示形式の選択**: ユーザーが日付表示形式を選択可能に
