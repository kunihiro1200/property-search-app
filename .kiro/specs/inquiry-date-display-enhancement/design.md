# Design Document: 反響日付表示の改善

## Overview

売主リストのテーブル一覧UIにおいて、反響日付の表示ロジックを改善します。スプレッドシートの「反響詳細日時」データがある場合はそれを優先的に表示し、ない場合は従来の「反響日付」を表示します。

### 現状の問題
- 現在、売主リストでは`inquiry_date`（反響日付）のみを表示している
- スプレッドシートには「反響詳細日時」カラムが存在し、より正確な問い合わせ日時が記録されている
- データベースには`inquiry_detailed_datetime`カラムが存在するが、スプレッドシート同期時にマッピングされていない
- `SellerService.supabase.ts`の`decryptSeller`メソッドで`inquiry_detailed_datetime`が正しくマッピングされていない

### 解決策
1. ColumnMapperに「反響詳細日時」→`inquiry_detailed_datetime`のマッピングを追加
2. SellerServiceで`inquiry_detailed_datetime`を正しくレスポンスに含める
3. フロントエンドで優先順位に基づいて表示を切り替える

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Spreadsheet                            │
│  ┌─────────────┐  ┌──────────────────┐                          │
│  │ 反響日付     │  │ 反響詳細日時      │                          │
│  └─────────────┘  └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ColumnMapper                                  │
│  spreadsheetToDatabase: {                                        │
│    "反響日付": "inquiry_date",                                    │
│    "反響詳細日時": "inquiry_detailed_datetime"  ← 追加           │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (sellers table)                      │
│  ┌─────────────────┐  ┌────────────────────────────┐            │
│  │ inquiry_date    │  │ inquiry_detailed_datetime   │            │
│  │ (DATE)          │  │ (TIMESTAMP)                 │            │
│  └─────────────────┘  └────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SellerService.supabase.ts                     │
│  decryptSeller(): {                                              │
│    inquiryDate: seller.inquiry_date,                             │
│    inquiryDetailedDatetime: seller.inquiry_detailed_datetime     │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (SellersPage.tsx)                    │
│  表示ロジック:                                                    │
│  inquiryDetailedDatetime ? formatDateTime() : formatDate()       │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. ColumnMapper (backend/src/config/column-mapping.json)

```json
{
  "spreadsheetToDatabase": {
    "反響詳細日時": "inquiry_detailed_datetime"
  },
  "typeConversions": {
    "inquiry_detailed_datetime": "datetime"
  }
}
```

### 2. SellerService.supabase.ts - decryptSeller メソッド

```typescript
private decryptSeller(seller: any): Seller {
  return {
    // ... existing fields
    inquiryDate: seller.inquiry_date ? new Date(seller.inquiry_date) : undefined,
    inquiryDetailedDatetime: seller.inquiry_detailed_datetime 
      ? new Date(seller.inquiry_detailed_datetime) 
      : undefined,
    // ... other fields
  };
}
```

### 3. SellersPage.tsx - 表示ロジック

```typescript
// 反響日付の表示ヘルパー関数
const formatInquiryDate = (seller: Seller): string => {
  if (seller.inquiryDetailedDatetime) {
    // 反響詳細日時がある場合は日時形式で表示
    return new Date(seller.inquiryDetailedDatetime).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } else if (seller.inquiryDate) {
    // 反響日付のみの場合は日付形式で表示
    return new Date(seller.inquiryDate).toLocaleDateString('ja-JP');
  }
  return '-';
};
```

## Data Models

### Seller Interface (既存の型定義を確認)

```typescript
interface Seller {
  // ... existing fields
  inquiryDate: string | Date;
  inquiryDetailedDatetime?: string | Date;  // 既に定義済み
  // ... other fields
}
```

### Database Schema (既存)

```sql
-- sellers table
inquiry_date DATE,
inquiry_detailed_datetime TIMESTAMP  -- 既に存在
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 反響詳細日時優先表示

*For any* 売主データにおいて、反響詳細日時（inquiryDetailedDatetime）が存在する場合、表示される日付は反響詳細日時の値と一致する

**Validates: Requirements 1.1, 3.3**

### Property 2: 反響日付フォールバック

*For any* 売主データにおいて、反響詳細日時がnullで反響日付（inquiryDate）が存在する場合、表示される日付は反響日付の値と一致する

**Validates: Requirements 1.2**

### Property 3: 日時フォーマット一貫性

*For any* 反響詳細日時が存在する売主データにおいて、フォーマットされた表示文字列には時刻情報（時:分）が含まれる

**Validates: Requirements 1.3**

### Property 4: 日付フォーマット一貫性

*For any* 反響詳細日時がnullで反響日付のみ存在する売主データにおいて、フォーマットされた表示文字列には時刻情報が含まれない

**Validates: Requirements 1.4**

### Property 5: TIMESTAMP型パース

*For any* 有効な日時文字列において、ColumnMapperのdatetime型変換は有効なDateオブジェクトを生成する

**Validates: Requirements 2.2**

## Error Handling

### 1. 無効な日時データ

```typescript
// ColumnMapper.ts
private parseDateTime(value: any): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}
```

### 2. フロントエンド表示エラー

```typescript
// SellersPage.tsx
const formatInquiryDate = (seller: Seller): string => {
  try {
    if (seller.inquiryDetailedDatetime) {
      const date = new Date(seller.inquiryDetailedDatetime);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('ja-JP', { ... });
      }
    }
    if (seller.inquiryDate) {
      const date = new Date(seller.inquiryDate);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('ja-JP');
      }
    }
  } catch (error) {
    console.error('Date formatting error:', error);
  }
  return '-';
};
```

## Testing Strategy

### Unit Tests

1. **ColumnMapper Tests**
   - 「反響詳細日時」カラムが正しくマッピングされることを確認
   - datetime型変換が正しく動作することを確認

2. **SellerService Tests**
   - `decryptSeller`が`inquiry_detailed_datetime`を正しく変換することを確認
   - APIレスポンスに`inquiryDetailedDatetime`が含まれることを確認

3. **Frontend Display Tests**
   - 反響詳細日時がある場合に日時形式で表示されることを確認
   - 反響日付のみの場合に日付形式で表示されることを確認

### Property-Based Tests

Property-based testing library: **fast-check** (既存プロジェクトで使用されている場合)

1. **Property 1-2: 優先順位テスト**
   - ランダムな売主データを生成し、表示ロジックが正しい優先順位で動作することを確認

2. **Property 3-4: フォーマットテスト**
   - ランダムな日時/日付を生成し、フォーマット結果が期待通りであることを確認

3. **Property 5: パーステスト**
   - ランダムな日時文字列を生成し、パース結果が有効であることを確認
