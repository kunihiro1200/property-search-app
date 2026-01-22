# Design Document

## Overview

本設計では、物件詳細画面に表示される買主候補リストの絞り込みロジックを改善する。現在の実装では希望条件が空欄の買主を含めているが、新しい実装では、希望種別・価格帯・エリアの各条件を適切に評価し、より精度の高いマッチングを実現する。

### Design Goals

1. **正確性**: 希望条件を持つ買主のみを候補として抽出する
2. **柔軟性**: 「指定なし」や空欄の条件を適切に処理する
3. **効率性**: 評価順序を最適化し、不要な処理を削減する
4. **保守性**: 条件の追加・変更が容易な設計とする

### Key Design Decisions

1. **評価順序の最適化**: 除外条件を先に評価し、早期リターンで処理を効率化
2. **条件の分離**: 各絞り込み条件を独立したメソッドとして実装
3. **問い合わせ履歴の活用**: エリアマッチングで過去の問い合わせ履歴を考慮
4. **価格帯の柔軟な解釈**: 「指定なし」と空欄を区別し、適切に処理

## Architecture

### Component Structure

```
BuyerCandidateService
├── getCandidatesForProperty() - メインエントリーポイント
├── filterCandidates() - 絞り込みロジックの統括
├── shouldExcludeBuyer() - 除外条件の評価
├── matchesPropertyType() - 希望種別の評価
├── matchesPriceRange() - 価格帯の評価
├── matchesArea() - エリアの評価
├── hasInquiryHistory() - 問い合わせ履歴の確認
└── Helper Methods
    ├── extractAreaNumbers()
    ├── normalizePropertyType()
    └── parsePriceRange()
```

### Data Flow

1. 物件情報の取得（property_number → property_listings）
2. 買主リストの取得（buyers テーブル）
3. 絞り込み処理の実行
   - 除外条件の評価（業者問合せ、完全除外条件、配信種別）
   - マッチング条件の評価（最新状況、希望種別、価格帯、エリア）
4. 結果の返却（最大50件）

## Components and Interfaces

### BuyerCandidateService

既存のサービスクラスを拡張し、新しい絞り込みロジックを実装する。

#### Public Methods

```typescript
async getCandidatesForProperty(propertyNumber: string): Promise<BuyerCandidateResponse>
```

#### Private Methods

```typescript
// 絞り込みロジック
private filterCandidates(buyers: any[], property: PropertyInfo): any[]

// 除外条件
private shouldExcludeBuyer(buyer: any): boolean
private isBusinessInquiry(buyer: any): boolean
private hasMinimumCriteria(buyer: any): boolean
private hasDistributionRequired(buyer: any): boolean

// マッチング条件
private matchesStatus(buyer: any): boolean
private matchesPropertyType(buyer: any, propertyType: string | null): boolean
private matchesPriceRange(buyer: any, salesPrice: number | null, propertyType: string | null): boolean
private matchesArea(buyer: any, distributionAreas: string | null): boolean

// 問い合わせ履歴
private async hasInquiryHistory(buyerId: string, propertyType: string, areas: string[]): Promise<boolean>
```

### Data Models

#### PropertyInfo

```typescript
interface PropertyInfo {
  property_number: string;
  property_type: string | null;
  sales_price: number | null;
  distribution_areas: string | null;
}
```

#### BuyerInfo

```typescript
interface BuyerInfo {
  id: string;
  buyer_number: string;
  name: string | null;
  latest_status: string | null;
  inquiry_confidence: string | null;
  desired_area: string | null;
  desired_property_type: string | null;
  price_range_house: string | null;
  price_range_apartment: string | null;
  price_range_land: string | null;
  distribution_type: string | null;
  broker_inquiry: boolean | null;
  reception_date: string | null;
  email: string | null;
  phone_number: string | null;
}
```

## Correctness Properties

### Property 1: 業者問合せの除外

**Invariant**: 業者問合せフラグがtrueの買主は、候補リストに含まれない

**Verification**:
- GIVEN buyer.broker_inquiry = true
- WHEN filterCandidates() is called
- THEN shouldExcludeBuyer() returns true
- AND buyer is not included in candidates

### Property 2: 完全除外条件

**Invariant**: 希望エリアと希望種別が両方空欄の買主は、候補リストに含まれない

**Verification**:
- GIVEN buyer.desired_area = null AND buyer.desired_property_type = null
- WHEN filterCandidates() is called
- THEN shouldExcludeBuyer() returns true
- AND buyer is not included in candidates

### Property 3: 配信種別の必須条件

**Invariant**: 配信種別が「要」でない買主は、候補リストに含まれない

**Verification**:
- GIVEN buyer.distribution_type ≠ "要"
- WHEN filterCandidates() is called
- THEN shouldExcludeBuyer() returns true
- AND buyer is not included in candidates

### Property 4: 最新状況による絞り込み

**Invariant**: 最新状況が「A」または「B」を含む、または最新状況が空欄で問い合わせ時確度が「A」または「B」の買主のみが候補となる

**Verification**:
- GIVEN buyer.latest_status contains "A" OR "B"
- OR (buyer.latest_status is empty AND buyer.inquiry_confidence = "A" OR "B")
- WHEN matchesStatus() is called
- THEN returns true

### Property 5: 希望種別のマッチング

**Invariant**: 希望種別が「指定なし」または物件種別と一致する買主のみが候補となる（希望種別が空欄の場合は除外）

**Verification**:
- GIVEN buyer.desired_property_type = "指定なし" OR matches property.property_type
- WHEN matchesPropertyType() is called
- THEN returns true
- AND buyer is included in candidates (if other conditions are met)

### Property 6: 価格帯のマッチング

**Invariant**: 希望価格帯が「指定なし」、空欄、または物件価格が範囲内の買主のみが候補となる

**Verification**:
- GIVEN buyer.price_range = "指定なし" OR empty OR property.sales_price in range
- WHEN matchesPriceRange() is called
- THEN returns true

### Property 7: エリアのマッチング

**Invariant**: 希望エリアが物件のエリアと一致する、または過去に同じエリア・種別の物件を問い合わせた履歴がある買主のみが候補となる（希望エリアが空欄の場合は除外）

**Verification**:
- GIVEN buyer.desired_area matches property.distribution_areas
- OR hasInquiryHistory(buyer.id, property.property_type, property.areas) = true
- WHEN matchesArea() is called
- THEN returns true

### Property 8: 評価順序の保証

**Invariant**: 除外条件は、マッチング条件よりも先に評価される

**Verification**:
- GIVEN filterCandidates() is called
- WHEN processing each buyer
- THEN shouldExcludeBuyer() is evaluated first
- AND if true, no further evaluation occurs
- AND if false, matching conditions are evaluated

## Error Handling

### Database Errors

- **Property Not Found**: 物件番号が存在しない場合、エラーメッセージを返す
- **Database Connection Error**: データベース接続エラーの場合、適切なエラーメッセージを返す
- **Query Timeout**: クエリタイムアウトの場合、リトライまたはエラーを返す

### Data Validation

- **Invalid Property Number**: 物件番号の形式が不正な場合、バリデーションエラーを返す
- **Missing Required Fields**: 必須フィールドが欠落している場合、デフォルト値を使用または除外

### Edge Cases

- **Empty Buyer List**: 買主が0件の場合、空の配列を返す
- **All Buyers Excluded**: すべての買主が除外条件に該当する場合、空の配列を返す
- **Null/Undefined Values**: null/undefinedの値を適切に処理し、空文字列として扱う

## Testing Strategy

### Unit Tests

1. **除外条件のテスト**
   - 業者問合せフラグがtrueの買主が除外されることを確認
   - 希望エリアと希望種別が両方空欄の買主が除外されることを確認
   - 配信種別が「要」でない買主が除外されることを確認

2. **マッチング条件のテスト**
   - 最新状況が「A」「B」を含む買主がマッチすることを確認
   - 希望種別が「指定なし」または物件種別と一致する買主がマッチすることを確認
   - 価格帯が範囲内の買主がマッチすることを確認
   - エリアが一致する買主がマッチすることを確認

3. **問い合わせ履歴のテスト**
   - 過去に同じエリア・種別の物件を問い合わせた買主がマッチすることを確認
   - 問い合わせ履歴がない買主が除外されることを確認

4. **評価順序のテスト**
   - 除外条件が先に評価されることを確認
   - 除外された買主に対してマッチング条件が評価されないことを確認

### Integration Tests

1. **エンドツーエンドのテスト**
   - 実際の物件番号を使用して、候補リストが正しく取得されることを確認
   - 複数の絞り込み条件が組み合わさった場合の動作を確認

2. **パフォーマンステスト**
   - 大量の買主データに対して、処理時間が許容範囲内であることを確認
   - 最大50件の制限が正しく機能することを確認

### Test Data

- **正常系**: すべての条件を満たす買主
- **異常系**: 各除外条件に該当する買主
- **境界値**: 価格帯の境界値、エリアの境界値
- **エッジケース**: null/undefined値、空文字列、特殊文字
