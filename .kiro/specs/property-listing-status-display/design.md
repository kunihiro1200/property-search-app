# Design Document

## Overview

物件リストの「atbb成約済み/非公開」カラムの値に基づいて、ユーザーフレンドリーなステータスバッジを表示する機能を実装します。既存の`atbbStatusDisplayMapper`を活用し、物件リストページにバッジを追加表示します。また、公開物件サイトのURLが表示されなくなった問題を修正します。

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
├─────────────────────────────────────────────────────────────┤
│  PropertyListingsPage                                        │
│  ├─ atbbStatusDisplayMapper (既存)                          │
│  │  └─ mapAtbbStatusToDisplayStatus()                       │
│  ├─ StatusBadge (新規コンポーネント)                        │
│  │  └─ バッジの表示ロジック                                │
│  └─ PublicUrlCell (既存)                                    │
│     └─ URL表示ロジック                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API呼び出し
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
├─────────────────────────────────────────────────────────────┤
│  PropertyListingSyncService (既存)                          │
│  └─ syncUpdatedPropertyListings()                           │
│     └─ atbb_statusの同期                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ データ取得/更新
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
├─────────────────────────────────────────────────────────────┤
│  property_listings テーブル                                 │
│  ├─ atbb_status (既存カラム)                                │
│  └─ updated_at (既存カラム)                                 │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ 定期同期
                              │
┌─────────────────────────────────────────────────────────────┐
│                Google Spreadsheet                            │
├─────────────────────────────────────────────────────────────┤
│  物件リストシート                                            │
│  └─ 「atbb成約済み/非公開」カラム                           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. StatusBadge コンポーネント（新規）

物件のステータスバッジを表示するReactコンポーネント。

```typescript
interface StatusBadgeProps {
  atbbStatus: string | null;
  size?: 'small' | 'medium';
}

interface BadgeConfig {
  label: string;
  color: string;
  backgroundColor: string;
}

function StatusBadge({ atbbStatus, size = 'small' }: StatusBadgeProps): JSX.Element | null
```

**責務**:
- `atbbStatusDisplayMapper`を使用してステータスを判定
- 適切なバッジを表示
- バッジが不要な場合はnullを返す

**バッジ設定**:
```typescript
const BADGE_CONFIGS: Record<StatusType, BadgeConfig> = {
  pre_publish: {
    label: '公開前情報',
    color: '#fff',
    backgroundColor: '#ff9800', // オレンジ
  },
  private: {
    label: '非公開物件',
    color: '#fff',
    backgroundColor: '#f44336', // 赤
  },
  sold: {
    label: '成約済み',
    color: '#fff',
    backgroundColor: '#9e9e9e', // グレー
  },
  other: {
    label: '',
    color: '',
    backgroundColor: '',
  },
};
```

### 2. atbbStatusDisplayMapper（既存）

既存のユーティリティを活用。変更不要。

```typescript
export function mapAtbbStatusToDisplayStatus(
  atbbStatus: string | null | undefined
): DisplayStatusResult {
  // 既存の実装を使用
}
```

### 3. PropertyListingsPage の更新

物件リストページにバッジを追加表示。

**変更箇所**:
```typescript
// テーブルヘッダーに「バッジ」列を追加
<TableCell>バッジ</TableCell>

// テーブル行にバッジを表示
<TableCell>
  <StatusBadge atbbStatus={listing.atbb_status} />
</TableCell>
```

### 4. publicUrlGenerator の修正（既存）

URL生成ロジックの修正。

**問題**: 現在の実装は公開中の物件のみURLを表示
**修正**: すべての物件に対してURLを表示

```typescript
// 修正前
export const generatePublicPropertyUrl = (
  propertyId: string,
  atbbStatus: string | null
): string | null => {
  if (!isPublicProperty(atbbStatus)) {
    return null;
  }
  
  const baseUrl = getBaseUrl();
  return `${baseUrl}/public/properties/${propertyId}`;
};

// 修正後
export const generatePublicPropertyUrl = (
  propertyNumber: string
): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/public/properties/${propertyNumber}`;
};
```

**重要な変更点**:
1. `atbbStatus`パラメータを削除（ステータスに関わらずURLを生成）
2. `propertyId`（UUID）から`propertyNumber`（物件番号）に変更
3. 戻り値を`string | null`から`string`に変更（常にURLを返す）
4. `isPublicProperty`関数は削除

## Data Models

### property_listings テーブル（既存）

```sql
CREATE TABLE property_listings (
  id UUID PRIMARY KEY,
  property_number VARCHAR(50),
  atbb_status TEXT, -- 「atbb成約済み/非公開」カラムの値
  -- ... 他のカラム
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**使用するカラム**:
- `atbb_status`: ステータス判定に使用
- `id`: 公開URL生成に使用

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: バッジ表示の正確性

*For any* property listing with atbb_status containing "公開前", the system should display a "公開前情報" badge

**Validates: Requirements 1.1**

### Property 2: 非公開物件バッジの正確性

*For any* property listing with atbb_status containing "配信メールのみ", the system should display a "非公開物件" badge

**Validates: Requirements 2.1**

### Property 3: 成約済みバッジの正確性

*For any* property listing with atbb_status containing "非公開" but not "配信メール", the system should display a "成約済み" badge

**Validates: Requirements 3.1**

### Property 4: バッジの排他性

*For any* property listing, at most one status badge should be displayed

**Validates: Requirements 6.2**

### Property 5: URL表示の正確性

*For any* property listing with a valid property_number, the public URL should be displayed

**Validates: Requirements 4.1, 4.2**

### Property 6: URL形式の正確性

*For any* property listing, the generated URL should use the property_number (not UUID) in the format /public/properties/{property_number}

**Validates: Requirements 4.4**

## Error Handling

### 1. atbb_statusがnullまたは空の場合

```typescript
if (!atbbStatus || atbbStatus === '') {
  // バッジを表示しない
  return null;
}
```

### 2. 予期しないステータス値の場合

```typescript
// mapAtbbStatusToDisplayStatus は常に有効な結果を返す
// statusType が 'other' の場合はバッジを表示しない
if (result.statusType === 'other') {
  return null;
}
```

### 3. データ同期エラー

```typescript
// PropertyListingSyncService の既存エラーハンドリングを使用
try {
  await this.syncUpdatedPropertyListings();
} catch (error) {
  console.error('Sync failed:', error);
  await this.logSyncError('property_listing_update', error);
}
```

## Testing Strategy

### Unit Tests

**StatusBadge コンポーネント**:
```typescript
describe('StatusBadge', () => {
  it('should display "公開前情報" badge for pre-publish status', () => {
    const { getByText } = render(<StatusBadge atbbStatus="公開前" />);
    expect(getByText('公開前情報')).toBeInTheDocument();
  });

  it('should display "非公開物件" badge for private status', () => {
    const { getByText } = render(<StatusBadge atbbStatus="配信メールのみ" />);
    expect(getByText('非公開物件')).toBeInTheDocument();
  });

  it('should display "成約済み" badge for sold status', () => {
    const { getByText } = render(<StatusBadge atbbStatus="非公開" />);
    expect(getByText('成約済み')).toBeInTheDocument();
  });

  it('should not display badge for public status', () => {
    const { container } = render(<StatusBadge atbbStatus="専任・公開中" />);
    expect(container.firstChild).toBeNull();
  });

  it('should not display badge for null status', () => {
    const { container } = render(<StatusBadge atbbStatus={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

**publicUrlGenerator の修正**:
```typescript
describe('generatePublicPropertyUrl', () => {
  it('should generate URL for all property numbers', () => {
    expect(generatePublicPropertyUrl('AA9313')).toContain('/public/properties/AA9313');
    expect(generatePublicPropertyUrl('AA1234')).toContain('/public/properties/AA1234');
  });

  it('should use property number, not UUID', () => {
    const url = generatePublicPropertyUrl('AA9313');
    expect(url).toMatch(/\/public\/properties\/AA\d+/);
    expect(url).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/); // UUIDではない
  });

  it('should always return a valid URL', () => {
    const url = generatePublicPropertyUrl('AA9313');
    expect(url).toBeTruthy();
    expect(url).toContain('http');
  });
});
```

### Property-Based Tests

**Property 1: Badge Display Accuracy**:
```typescript
import fc from 'fast-check';

describe('Property: Badge Display Accuracy', () => {
  it('should display correct badge for all pre-publish statuses', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.includes('公開前')),
        (atbbStatus) => {
          const result = mapAtbbStatusToDisplayStatus(atbbStatus);
          return result.statusType === 'pre_publish' && 
                 result.displayStatus === '公開前情報';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display correct badge for all private statuses', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.includes('配信メールのみ')),
        (atbbStatus) => {
          const result = mapAtbbStatusToDisplayStatus(atbbStatus);
          return result.statusType === 'private' && 
                 result.displayStatus === '非公開物件';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display correct badge for all sold statuses', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.includes('非公開') && !s.includes('配信メール')),
        (atbbStatus) => {
          const result = mapAtbbStatusToDisplayStatus(atbbStatus);
          return result.statusType === 'sold' && 
                 result.displayStatus === '成約済み';
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 2: URL Display Logic**:
```typescript
describe('Property: URL Display Logic', () => {
  it('should generate URL for all property numbers', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => /^AA\d+$/.test(s)), // AA + 数字の形式
        (propertyNumber) => {
          const url = generatePublicPropertyUrl(propertyNumber);
          return url.includes(`/public/properties/${propertyNumber}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always return a valid URL string', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length > 0),
        (propertyNumber) => {
          const url = generatePublicPropertyUrl(propertyNumber);
          return typeof url === 'string' && url.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

**物件リストページの統合テスト**:
```typescript
describe('PropertyListingsPage Integration', () => {
  it('should display badge and URL for pre-publish property', async () => {
    const mockProperty = {
      id: 'test-uuid',
      property_number: 'AA9313',
      atbb_status: '公開前',
    };

    render(<PropertyListingsPage />);
    
    // バッジが表示されることを確認
    expect(await screen.findByText('公開前情報')).toBeInTheDocument();
    
    // URLが表示されることを確認
    expect(screen.getByText(/public\/properties\/AA9313/)).toBeInTheDocument();
  });

  it('should display badge and URL for private property', async () => {
    const mockProperty = {
      id: 'test-uuid',
      property_number: 'AA9313',
      atbb_status: '配信メールのみ',
    };

    render(<PropertyListingsPage />);
    
    expect(await screen.findByText('非公開物件')).toBeInTheDocument();
    expect(screen.getByText(/public\/properties\/AA9313/)).toBeInTheDocument();
  });

  it('should display badge and URL for sold property', async () => {
    const mockProperty = {
      id: 'test-uuid',
      property_number: 'AA9313',
      atbb_status: '非公開',
    };

    render(<PropertyListingsPage />);
    
    expect(await screen.findByText('成約済み')).toBeInTheDocument();
    expect(screen.getByText(/public\/properties\/AA9313/)).toBeInTheDocument();
  });

  it('should not display badge but show URL for public property', async () => {
    const mockProperty = {
      id: 'test-uuid',
      property_number: 'AA9313',
      atbb_status: '専任・公開中',
    };

    render(<PropertyListingsPage />);
    
    // バッジが表示されないことを確認
    expect(screen.queryByText('公開前情報')).not.toBeInTheDocument();
    expect(screen.queryByText('非公開物件')).not.toBeInTheDocument();
    expect(screen.queryByText('成約済み')).not.toBeInTheDocument();
    
    // URLが表示されることを確認
    expect(await screen.findByText(/public\/properties\/AA9313/)).toBeInTheDocument();
  });
});
```

## Implementation Notes

### 1. 既存コードの活用

- `atbbStatusDisplayMapper`は既に実装済みで、テスト済み
- `PropertyListingSyncService`の同期機能は既に動作中
- 新規コンポーネントは最小限に抑える

### 2. パフォーマンス考慮

- バッジの表示判定は軽量（文字列比較のみ）
- メモ化は不要（計算コストが低い）
- 既存のページネーション機能を活用

### 3. レスポンシブデザイン

```typescript
// バッジのサイズをデバイスに応じて調整
const badgeSize = useMediaQuery('(max-width:600px)') ? 'small' : 'medium';
```

### 4. アクセシビリティ

```typescript
// バッジにaria-labelを追加
<Chip
  label={config.label}
  aria-label={`ステータス: ${config.label}`}
  sx={{ ... }}
/>
```

## Deployment Considerations

### 1. データベース変更

不要。既存の`atbb_status`カラムを使用。

### 2. 環境変数

不要。既存の設定を使用。

### 3. デプロイ手順

1. フロントエンドのビルド
2. バックエンドの再起動（不要、変更なし）
3. ブラウザキャッシュのクリア推奨

### 4. ロールバック計画

- フロントエンドのみの変更のため、ロールバックは容易
- 以前のビルドに戻すだけで復元可能
