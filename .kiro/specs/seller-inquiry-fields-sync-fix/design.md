# Design Document: 売主反響フィールド同期修正

## Overview

売主リストにおいて、反響年（inquiry_year）、反響日付（inquiry_date）、サイト（inquiry_site）のフィールドがスプレッドシートからデータベースへ正しく同期されていない問題を解決します。

### 現状の問題

1. **column-mapping.jsonに反響年のマッピングが欠けている**
   - 「反響年」カラムがマッピングされていないため、スプレッドシートの反響年がデータベースに同期されない

2. **サイトフィールドのマッピングが不正確**
   - スプレッドシートの「サイト」カラムが`site`としてマッピングされているが、データベースカラム名は`inquiry_site`
   - SellerServiceの`decryptSeller`メソッドでは`site`フィールドを使用しているが、これは`inquiry_site`であるべき

3. **フロントエンドでの表示が不完全**
   - 反響年とサイトが一覧・詳細画面で正しく表示されていない可能性がある

### 解決策

1. column-mapping.jsonに反響年のマッピングを追加
2. サイトのマッピングを`site`から`inquiry_site`に修正
3. SellerServiceの`decryptSeller`メソッドで`inquiry_site`を正しくマッピング
4. フロントエンドで反響年とサイトを表示

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Spreadsheet                            │
│  ┌─────────┐  ┌──────────┐  ┌────────┐                          │
│  │ 反響年   │  │ 反響日付  │  │ サイト │                          │
│  └─────────┘  └──────────┘  └────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    column-mapping.json                           │
│  spreadsheetToDatabase: {                                        │
│    "反響年": "inquiry_year",          ← 追加                     │
│    "反響日付": "inquiry_date",                                   │
│    "サイト": "inquiry_site"            ← 修正（site → inquiry_site）│
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (sellers table)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ inquiry_year │  │ inquiry_date │  │ inquiry_site │          │
│  │ (VARCHAR)    │  │ (DATE)       │  │ (VARCHAR)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SellerService.supabase.ts                     │
│  decryptSeller(): {                                              │
│    inquiryYear: seller.inquiry_year,                             │
│    inquiryDate: seller.inquiry_date,                             │
│    inquirySite: seller.inquiry_site,    ← 修正（site → inquiry_site）│
│    site: seller.inquiry_site            ← 後方互換性のため残す   │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (SellersPage.tsx)                    │
│  表示:                                                           │
│  - 反響年: seller.inquiryYear                                    │
│  - 反響日付: seller.inquiryDate                                  │
│  - サイト: seller.inquirySite || seller.site                     │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. column-mapping.json の更新

```json
{
  "spreadsheetToDatabase": {
    "反響年": "inquiry_year",
    "反響日付": "inquiry_date",
    "サイト": "inquiry_site"
  },
  "databaseToSpreadsheet": {
    "inquiry_year": "反響年",
    "inquiry_date": "反響日付",
    "inquiry_site": "サイト"
  },
  "typeConversions": {
    "inquiry_date": "date"
  }
}
```

### 2. SellerService.supabase.ts - decryptSeller メソッドの更新

```typescript
private decryptSeller(seller: any): Seller {
  try {
    const decrypted = {
      // ... existing fields
      inquiryYear: seller.inquiry_year,
      inquiryDate: seller.inquiry_date ? new Date(seller.inquiry_date) : undefined,
      inquirySite: seller.inquiry_site,  // 修正: site → inquiry_site
      site: seller.inquiry_site,          // 後方互換性のため残す
      // ... other fields
    };
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error for seller:', seller.id, seller.seller_number);
    throw error;
  }
}
```

### 3. フロントエンド - SellersPage.tsx の更新

```typescript
// テーブルカラムの定義
const columns = [
  {
    key: 'sellerNumber',
    label: '売主番号',
    sortable: true,
  },
  {
    key: 'inquiryYear',
    label: '反響年',
    sortable: true,
    render: (seller: Seller) => seller.inquiryYear || '-',
  },
  {
    key: 'inquiryDate',
    label: '反響日付',
    sortable: true,
    render: (seller: Seller) => 
      seller.inquiryDate 
        ? new Date(seller.inquiryDate).toLocaleDateString('ja-JP')
        : '-',
  },
  {
    key: 'inquirySite',
    label: 'サイト',
    sortable: true,
    render: (seller: Seller) => seller.inquirySite || seller.site || '-',
  },
  // ... other columns
];
```

### 4. フロントエンド - SellerDetailPage.tsx の更新

```typescript
// 反響情報セクション
<div className="info-section">
  <h3>反響情報</h3>
  <div className="info-row">
    <label>反響年:</label>
    <span>{seller.inquiryYear || '-'}</span>
  </div>
  <div className="info-row">
    <label>反響日付:</label>
    <span>
      {seller.inquiryDate 
        ? new Date(seller.inquiryDate).toLocaleDateString('ja-JP')
        : '-'}
    </span>
  </div>
  <div className="info-row">
    <label>サイト:</label>
    <span>{seller.inquirySite || seller.site || '-'}</span>
  </div>
</div>
```

## Data Models

### Seller Interface (既存の型定義)

```typescript
export interface Seller {
  // ... existing fields
  inquiryYear: number;              // 反響年（YYYY形式）
  inquiryDate?: string | Date;      // 反響日付
  inquirySite?: string;             // サイト（問い合わせ元）
  site?: string;                    // 後方互換性のため残す
  // ... other fields
}
```

### Database Schema (既存)

```sql
-- sellers table
inquiry_year VARCHAR(4),      -- 反響年（YYYY形式の文字列）
inquiry_date DATE,            -- 反響日付
inquiry_site VARCHAR(255)     -- サイト（問い合わせ元）
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 反響年マッピング

*For any* スプレッドシートの行において、「反響年」カラムが存在する場合、ColumnMapperはそれをinquiry_yearフィールドにマッピングする

**Validates: Requirements 1.1**

### Property 2: サイトマッピング

*For any* スプレッドシートの行において、「サイト」カラムが存在する場合、ColumnMapperはそれをinquiry_siteフィールドにマッピングする

**Validates: Requirements 1.2**

### Property 3: 反響年同期

*For any* スプレッドシートで反響年が変更された売主において、同期後のデータベースのinquiry_yearは変更後の値と一致する

**Validates: Requirements 3.1**

### Property 4: サイト同期

*For any* スプレッドシートでサイトが変更された売主において、同期後のデータベースのinquiry_siteは変更後の値と一致する

**Validates: Requirements 3.2**

### Property 5: APIレスポンス完全性

*For any* 売主データのAPIレスポンスにおいて、inquiry_yearとinquiry_siteフィールドが含まれる

**Validates: Requirements 4.1, 4.2**

### Property 6: フロントエンド表示一貫性

*For any* 売主データにおいて、フロントエンドで表示される反響年とサイトは、APIレスポンスの値と一致する

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

## Error Handling

### 1. 空の反響年・サイト

```typescript
// ColumnMapper.ts
mapToDatabase(sheetRow: SheetRow): SellerData {
  const dbData: any = {};

  for (const [sheetColumn, dbColumn] of Object.entries(this.spreadsheetToDb)) {
    const value = sheetRow[sheetColumn];
    
    if (value === null || value === undefined || value === '') {
      dbData[dbColumn] = null;
      continue;
    }
    
    // ... 型変換処理
  }

  return dbData as SellerData;
}
```

### 2. フロントエンドでの欠損値処理

```typescript
// SellersPage.tsx
const formatInquiryYear = (seller: Seller): string => {
  return seller.inquiryYear?.toString() || '-';
};

const formatInquirySite = (seller: Seller): string => {
  return seller.inquirySite || seller.site || '-';
};
```

### 3. 同期エラーのログ記録

```typescript
// SpreadsheetSyncService.ts
try {
  const mappedData = this.columnMapper.mapToDatabase(row);
  await this.updateSeller(sellerId, mappedData);
} catch (error) {
  console.error(`Failed to sync seller ${sellerId}:`, error);
  // エラーログを記録して続行
}
```

## Testing Strategy

### Unit Tests

1. **ColumnMapper Tests**
   - 「反響年」カラムが正しくinquiry_yearにマッピングされることを確認
   - 「サイト」カラムが正しくinquiry_siteにマッピングされることを確認
   - 空の値がnullとして処理されることを確認

2. **SellerService Tests**
   - `decryptSeller`がinquiry_yearを正しく変換することを確認
   - `decryptSeller`がinquiry_siteを正しく変換することを確認
   - APIレスポンスにinquiryYearとinquirySiteが含まれることを確認

3. **Frontend Display Tests**
   - 反響年が正しく表示されることを確認
   - サイトが正しく表示されることを確認
   - 欠損値が'-'として表示されることを確認

### Property-Based Tests

Property-based testing library: **fast-check**

1. **Property 1-2: マッピングテスト**
   - ランダムなスプレッドシートデータを生成し、マッピングが正しく動作することを確認

2. **Property 3-4: 同期テスト**
   - ランダムな売主データを生成し、同期後のデータベースの値が正しいことを確認

3. **Property 5-6: 表示テスト**
   - ランダムな売主データを生成し、フロントエンドの表示が正しいことを確認

### Integration Tests

1. **End-to-End Sync Test**
   - スプレッドシートのデータを変更
   - 同期を実行
   - データベースの値を確認
   - APIレスポンスを確認
   - フロントエンドの表示を確認

## Implementation Notes

### 後方互換性

- `site`フィールドは後方互換性のため残す
- フロントエンドでは`inquirySite || site`のようにフォールバックを使用
- 既存のコードが`site`を参照している場合でも動作するようにする

### マイグレーション不要

- データベーススキーマの変更は不要（inquiry_year、inquiry_date、inquiry_siteは既に存在）
- 既存のデータは次回の同期時に自動的に更新される

### 同期タイミング

- 自動同期サービス（EnhancedAutoSyncService）が5分ごとに実行される
- 手動同期も可能

## Performance Considerations

- マッピングの追加による性能への影響は最小限
- 既存の同期プロセスに変更なし
- フロントエンドの表示ロジックは軽量
