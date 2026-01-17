# Design Document

## Overview

通話モードページの査定計算セクションに、手入力可能な査定額フィールド（査定額1、査定額2、査定額3）を追加し、これらが入力されている場合は自動計算された査定額よりも優先して使用する機能を実装します。この機能により、マンション物件など固定資産税路線価による自動計算が適切でない場合でも、営業担当者の専門知識に基づいた査定額を入力し、システム全体で使用できるようになります。

## Architecture

### System Components

1. **Frontend (React/TypeScript)**
   - CallModePage: 通話モードページのメインコンポーネント
   - Valuation Section: 査定計算セクションのUI
   - Manual Input Fields: 手入力用の査定額フィールド

2. **Backend (Node.js/Express)**
   - Sellers API: 売主情報の更新エンドポイント
   - Email Service: 査定メール送信サービス
   - SMS Template Generator: SMSテンプレート生成サービス

3. **Database (PostgreSQL)**
   - sellers table: 既存の`valuation_amount_1`, `valuation_amount_2`, `valuation_amount_3`フィールドを使用
   - `valuation_assignee`: 査定担当者名を記録

### Data Flow

```
User Input (Manual Valuation)
    ↓
Frontend State Update
    ↓
API Request (PUT /sellers/:id)
    ↓
Backend Validation
    ↓
Database Update (sellers table)
    ↓
Response to Frontend
    ↓
UI Update (Display Manual Valuation)
    ↓
Email/SMS Generation (Use Manual Valuation)
```

## Components and Interfaces

### Frontend Components

#### 1. Manual Valuation Input Fields

**Location**: `frontend/src/pages/CallModePage.tsx` - Valuation Section

**State Variables**:
```typescript
const [editedManualValuationAmount1, setEditedManualValuationAmount1] = useState<string>('');
const [editedManualValuationAmount2, setEditedManualValuationAmount2] = useState<string>('');
const [editedManualValuationAmount3, setEditedManualValuationAmount3] = useState<string>('');
const [isManualValuation, setIsManualValuation] = useState<boolean>(false);
```

**UI Structure**:
- 3つの数値入力フィールド（査定額1、査定額2、査定額3）
- 各フィールドは円単位で入力
- 手入力モードと自動計算モードの視覚的な区別
- 保存ボタン
- クリアボタン（手入力値を削除して自動計算に戻す）

#### 2. Valuation Display Logic

**Priority Logic**:
```typescript
const getDisplayValuation = () => {
  // 手入力値が存在する場合は手入力値を優先
  if (seller?.valuationAmount1 && isManualValuation) {
    return {
      amount1: seller.valuationAmount1,
      amount2: seller.valuationAmount2,
      amount3: seller.valuationAmount3,
      source: 'manual',
      assignee: seller.valuationAssignee
    };
  }
  
  // 自動計算値を使用
  return {
    amount1: calculatedAmount1,
    amount2: calculatedAmount2,
    amount3: calculatedAmount3,
    source: 'auto',
    assignee: seller.valuationAssignee
  };
};
```

#### 3. Visual Indicators

**Manual Valuation Indicator**:
- バッジまたはアイコンで「手入力」を表示
- 背景色を変更して視覚的に区別
- ツールチップで詳細情報を表示

**Auto-calculated Valuation Indicator**:
- バッジまたはアイコンで「自動計算」を表示
- 計算根拠を表示

### Backend API

#### 1. Update Seller Endpoint

**Endpoint**: `PUT /api/sellers/:id`

**Request Body**:
```typescript
{
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  valuationAssignee?: string;
  isManualValuation?: boolean; // フラグとして使用（オプション）
}
```

**Response**:
```typescript
{
  seller: Seller;
  message: string;
}
```

**Validation**:
- 査定額は正の数値であること
- 査定額1 ≤ 査定額2 ≤ 査定額3 の順序を推奨（警告のみ）
- valuationAssigneeは現在のユーザー名を自動設定

#### 2. Email Service Integration

**Location**: `backend/src/services/EmailService.ts`

**Method**: `sendValuationEmail(sellerId: string)`

**Logic**:
```typescript
async sendValuationEmail(sellerId: string) {
  const seller = await this.getSeller(sellerId);
  
  // 手入力値が存在する場合は手入力値を使用
  const valuation = {
    amount1: seller.valuationAmount1 || calculatedAmount1,
    amount2: seller.valuationAmount2 || calculatedAmount2,
    amount3: seller.valuationAmount3 || calculatedAmount3,
  };
  
  // メールテンプレートに査定額を埋め込む
  const emailContent = this.generateEmailContent(seller, valuation);
  
  // メール送信
  await this.sendEmail(seller.email, emailContent);
}
```

#### 3. SMS Template Generator Integration

**Location**: `frontend/src/utils/smsTemplateGenerators.ts`

**Update**: 各テンプレート生成関数で手入力査定額を優先使用

```typescript
export const generateValuationSMS = (
  seller: Seller,
  property: PropertyInfo | null
): string => {
  // 手入力値が存在する場合は手入力値を使用
  const amount1 = seller.valuationAmount1 || calculatedAmount1;
  const amount2 = seller.valuationAmount2 || calculatedAmount2;
  const amount3 = seller.valuationAmount3 || calculatedAmount3;
  
  // SMSテンプレート生成
  return `査定結果: ${Math.round(amount1 / 10000)}万円 ～ ${Math.round(amount2 / 10000)}万円 ～ ${Math.round(amount3 / 10000)}万円`;
};
```

## Data Models

### Seller Model (既存)

```typescript
interface Seller {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address: string;
  
  // 査定情報（既存フィールドを使用）
  valuationAmount1?: number;  // 手入力または自動計算
  valuationAmount2?: number;  // 手入力または自動計算
  valuationAmount3?: number;  // 手入力または自動計算
  valuationAssignee?: string; // 査定担当者名
  fixedAssetTaxRoadPrice?: number; // 固定資産税路線価（自動計算用）
  
  // その他のフィールド...
}
```

### Database Schema (既存)

```sql
-- sellers table (既存)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_1 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_2 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_3 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_assignee VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS fixed_asset_tax_road_price BIGINT;
```

**Note**: これらのフィールドは既にマイグレーション009で追加されているため、新しいマイグレーションは不要です。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN a User views the Valuation Section THEN the System SHALL display three input fields for manual valuation amounts (査定額1, 査定額2, 査定額3)
Thoughts: This is about the UI displaying specific elements. We can test this by rendering the component and checking that the three input fields are present in the DOM.
Testable: yes - example

1.2 WHEN a User enters values into the manual valuation input fields THEN the System SHALL accept numeric values representing Japanese Yen
Thoughts: This is about input validation. We can test this by generating random numeric values and ensuring they are accepted, and generating non-numeric values and ensuring they are rejected.
Testable: yes - property

1.3 WHEN a User saves manual valuation amounts THEN the System SHALL store these values in the database associated with the Seller record
Thoughts: This is about data persistence. We can test this by creating a random seller, saving manual valuation amounts, then querying the database to verify the values were stored correctly.
Testable: yes - property

1.4 WHEN manual valuation amounts exist for a Seller THEN the System SHALL display these amounts in the Valuation Section
Thoughts: This is about displaying stored data. We can test this by creating a seller with manual valuation amounts, then rendering the component and verifying the amounts are displayed.
Testable: yes - property

1.5 WHEN a User clears manual valuation amounts THEN the System SHALL remove these values from the database
Thoughts: This is about data deletion. We can test this by creating a seller with manual valuation amounts, clearing them, then verifying they are null in the database.
Testable: yes - property

2.1 WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts instead of auto-calculated valuation amounts for all displays
Thoughts: This is about priority logic. We can test this by creating a seller with both manual and auto-calculated amounts, then verifying that manual amounts are displayed in all locations.
Testable: yes - property

2.2 WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts in the Call Mode Page header display
Thoughts: This is a specific instance of 2.1. We can test this by rendering the header with a seller that has manual amounts and verifying the correct amounts are displayed.
Testable: yes - property

2.3 WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts in email templates
Thoughts: This is about email generation. We can test this by generating an email for a seller with manual amounts and verifying the email contains the manual amounts.
Testable: yes - property

2.4 WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts in SMS templates
Thoughts: This is about SMS generation. We can test this by generating an SMS for a seller with manual amounts and verifying the SMS contains the manual amounts.
Testable: yes - property

2.5 WHEN manual valuation amounts do not exist for a Seller THEN the System SHALL fall back to auto-calculated valuation amounts
Thoughts: This is about fallback logic. We can test this by creating a seller without manual amounts but with auto-calculated amounts, then verifying auto-calculated amounts are used.
Testable: yes - property

3.1 WHEN a User views the Valuation Section for any Property type THEN the System SHALL display manual valuation input fields
Thoughts: This is about UI consistency across property types. We can test this by rendering the component for each property type and verifying the input fields are present.
Testable: yes - property

3.2 WHEN a Property type is apartment THEN the System SHALL display manual valuation input fields without requiring fixed asset tax road price input
Thoughts: This is about conditional UI display. We can test this by rendering the component for an apartment property and verifying the manual input fields are present and the road price field is optional.
Testable: yes - example

3.3 WHEN a Property type is not apartment THEN the System SHALL display both fixed asset tax road price input and manual valuation input fields
Thoughts: This is about conditional UI display. We can test this by rendering the component for non-apartment properties and verifying both field types are present.
Testable: yes - property

3.4 WHEN a User enters manual valuation amounts for any Property type THEN the System SHALL prioritize manual values over auto-calculated values
Thoughts: This is the same as 2.1, testing priority logic across property types.
Testable: yes - property

3.5 WHEN a User views the Valuation Section THEN the System SHALL clearly indicate which valuation source is being used (manual or auto-calculated)
Thoughts: This is about UI indicators. We can test this by rendering the component and verifying the presence of visual indicators for the valuation source.
Testable: yes - example

4.1 WHEN manual valuation amounts are displayed THEN the System SHALL show a visual indicator that these are manually entered values
Thoughts: This is about UI indicators. We can test this by rendering the component with manual amounts and verifying the indicator is present.
Testable: yes - example

4.2 WHEN auto-calculated valuation amounts are displayed THEN the System SHALL show a visual indicator that these are automatically calculated values
Thoughts: This is about UI indicators. We can test this by rendering the component with auto-calculated amounts and verifying the indicator is present.
Testable: yes - example

4.3 WHEN a User is editing valuation amounts THEN the System SHALL display labels that clearly distinguish manual input fields from auto-calculation fields
Thoughts: This is about UI labels. We can test this by rendering the component in edit mode and verifying the labels are distinct.
Testable: yes - example

4.4 WHEN manual valuation amounts override auto-calculated amounts THEN the System SHALL display a message indicating that manual values are being used
Thoughts: This is about UI messaging. We can test this by rendering the component with both manual and auto-calculated amounts and verifying the message is displayed.
Testable: yes - example

4.5 WHEN the Valuation Section is in view mode THEN the System SHALL display the valuation source (manual or auto-calculated) alongside the amounts
Thoughts: This is about UI display. We can test this by rendering the component in view mode and verifying the source is displayed.
Testable: yes - example

5.1 WHEN a User saves manual valuation amounts THEN the System SHALL record the User's identity as the valuation assignee
Thoughts: This is about audit trail. We can test this by saving manual amounts and verifying the current user's name is stored in valuationAssignee.
Testable: yes - property

5.2 WHEN a User saves manual valuation amounts THEN the System SHALL record the timestamp of the entry
Thoughts: This is about audit trail. We can test this by saving manual amounts and verifying the updated_at timestamp is updated.
Testable: yes - property

5.3 WHEN manual valuation amounts are displayed THEN the System SHALL show the valuation assignee name
Thoughts: This is about UI display. We can test this by rendering the component with manual amounts and verifying the assignee name is displayed.
Testable: yes - example

5.4 WHEN manual valuation amounts are displayed THEN the System SHALL show the timestamp of when they were entered
Thoughts: This is about UI display. However, the current design doesn't include displaying the timestamp in the UI, only the assignee name.
Testable: no

5.5 WHEN a User updates existing manual valuation amounts THEN the System SHALL update the valuation assignee and timestamp to reflect the most recent change
Thoughts: This is about update logic. We can test this by updating manual amounts and verifying the assignee and timestamp are updated.
Testable: yes - property

6.1 WHEN a User enters a fixed asset tax road price THEN the System SHALL auto-calculate valuation amounts after a 1-second delay
Thoughts: This is about auto-calculation trigger. We can test this by entering a road price and verifying auto-calculation occurs after the delay.
Testable: yes - example

6.2 WHEN a User enters manual valuation amounts THEN the System SHALL not trigger auto-calculation
Thoughts: This is about preventing auto-calculation. We can test this by entering manual amounts and verifying auto-calculation is not triggered.
Testable: yes - property

6.3 WHEN a User clears manual valuation amounts THEN the System SHALL display auto-calculated amounts if they exist
Thoughts: This is about fallback display. We can test this by clearing manual amounts and verifying auto-calculated amounts are displayed.
Testable: yes - property

6.4 WHEN a User enters both fixed asset tax road price and manual valuation amounts THEN the System SHALL prioritize manual valuation amounts
Thoughts: This is the same as 2.1, testing priority logic.
Testable: yes - property

6.5 WHEN the Valuation Section is in edit mode THEN the System SHALL allow the User to switch between manual and auto-calculated values by clearing or entering data in the respective fields
Thoughts: This is about UI interaction. We can test this by simulating user interactions and verifying the correct values are displayed.
Testable: yes - example

### Property Reflection

After reviewing all properties, the following redundancies were identified:

- **Property 2.1, 3.4, and 6.4** all test the same priority logic (manual values override auto-calculated values). These can be combined into a single comprehensive property.
- **Property 2.2, 2.3, 2.4** are specific instances of the general priority logic. They can be tested as part of the comprehensive priority property.
- **Properties 4.1-4.5 and 5.3** are all UI display tests that can be verified through examples rather than properties.
- **Property 6.2 and 6.3** are related to the priority logic and can be combined with the comprehensive priority property.

### Correctness Properties

Property 1: Manual valuation input acceptance
*For any* numeric value representing Japanese Yen, when entered into a manual valuation input field, the system should accept and store the value
**Validates: Requirements 1.2, 1.3**

Property 2: Manual valuation persistence round trip
*For any* seller and any set of manual valuation amounts, saving the amounts and then retrieving the seller should return the same valuation amounts
**Validates: Requirements 1.3, 1.4**

Property 3: Manual valuation deletion
*For any* seller with manual valuation amounts, clearing the amounts should result in the database storing null values for those fields
**Validates: Requirements 1.5**

Property 4: Manual valuation priority
*For any* seller with both manual and auto-calculated valuation amounts, the system should use manual amounts in all displays (header, email, SMS) and only fall back to auto-calculated amounts when manual amounts are null
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 6.4**

Property 5: Manual valuation availability across property types
*For any* property type, the valuation section should display manual valuation input fields
**Validates: Requirements 3.1, 3.3**

Property 6: Valuation assignee tracking
*For any* user saving manual valuation amounts, the system should record the user's identity as the valuation assignee and update it on subsequent changes
**Validates: Requirements 5.1, 5.5**

Property 7: Valuation timestamp tracking
*For any* manual valuation save operation, the system should update the seller's updated_at timestamp
**Validates: Requirements 5.2, 5.5**

Property 8: Auto-calculation prevention with manual input
*For any* seller, when manual valuation amounts are entered, auto-calculation should not be triggered
**Validates: Requirements 6.2**

Property 9: Fallback to auto-calculated values
*For any* seller with auto-calculated amounts but no manual amounts, the system should display auto-calculated amounts
**Validates: Requirements 2.5, 6.3**

## Error Handling

### Frontend Error Handling

1. **Input Validation Errors**
   - 非数値入力の検出とエラーメッセージ表示
   - 負の数値の検出と警告表示
   - 査定額の順序チェック（査定額1 ≤ 査定額2 ≤ 査定額3）と警告表示

2. **API Error Handling**
   - ネットワークエラー時のリトライ機能
   - タイムアウト処理
   - エラーメッセージの表示

3. **State Management Errors**
   - 状態の不整合を検出して修正
   - ローカルストレージへのバックアップ（オプション）

### Backend Error Handling

1. **Validation Errors**
   - 入力値の型チェック
   - 範囲チェック
   - 必須フィールドチェック

2. **Database Errors**
   - トランザクション管理
   - ロールバック処理
   - エラーログの記録

3. **Business Logic Errors**
   - 売主が存在しない場合のエラー
   - 権限チェック
   - 競合状態の処理

## Testing Strategy

### Unit Testing

**Frontend Unit Tests**:
- Manual valuation input field rendering
- Input validation logic
- State management functions
- Display priority logic
- Visual indicator rendering

**Backend Unit Tests**:
- API endpoint validation
- Database query functions
- Email template generation
- SMS template generation

### Property-Based Testing

**Property Testing Framework**: fast-check (JavaScript/TypeScript)

**Configuration**: Each property-based test should run a minimum of 100 iterations.

**Property Tests**:

1. **Property 1: Manual valuation input acceptance**
   - **Feature: manual-valuation-input, Property 1: Manual valuation input acceptance**
   - Generator: Random positive integers representing Yen amounts
   - Test: Input → Save → Verify stored value matches input

2. **Property 2: Manual valuation persistence round trip**
   - **Feature: manual-valuation-input, Property 2: Manual valuation persistence round trip**
   - Generator: Random seller data with random valuation amounts
   - Test: Save → Retrieve → Verify amounts match

3. **Property 3: Manual valuation deletion**
   - **Feature: manual-valuation-input, Property 3: Manual valuation deletion**
   - Generator: Random seller with valuation amounts
   - Test: Clear → Verify database contains null values

4. **Property 4: Manual valuation priority**
   - **Feature: manual-valuation-input, Property 4: Manual valuation priority**
   - Generator: Random seller with both manual and auto-calculated amounts
   - Test: Verify manual amounts are used in header, email, SMS

5. **Property 5: Manual valuation availability across property types**
   - **Feature: manual-valuation-input, Property 5: Manual valuation availability across property types**
   - Generator: Random property types
   - Test: Render component → Verify input fields are present

6. **Property 6: Valuation assignee tracking**
   - **Feature: manual-valuation-input, Property 6: Valuation assignee tracking**
   - Generator: Random user and valuation amounts
   - Test: Save → Verify assignee is recorded → Update → Verify assignee is updated

7. **Property 7: Valuation timestamp tracking**
   - **Feature: manual-valuation-input, Property 7: Valuation timestamp tracking**
   - Generator: Random valuation amounts
   - Test: Save → Verify timestamp is updated

8. **Property 8: Auto-calculation prevention with manual input**
   - **Feature: manual-valuation-input, Property 8: Auto-calculation prevention with manual input**
   - Generator: Random manual valuation amounts
   - Test: Enter manual amounts → Verify auto-calculation is not triggered

9. **Property 9: Fallback to auto-calculated values**
   - **Feature: manual-valuation-input, Property 9: Fallback to auto-calculated values**
   - Generator: Random seller with auto-calculated amounts only
   - Test: Verify auto-calculated amounts are displayed

### Integration Testing

1. **End-to-End User Flow**
   - 通話モードページを開く
   - 手入力査定額を入力
   - 保存
   - ヘッダー表示を確認
   - メール送信を実行
   - メール内容を確認

2. **API Integration**
   - Frontend → Backend API → Database
   - データの整合性確認

3. **Email/SMS Integration**
   - 査定メール送信
   - SMSテンプレート生成
   - 正しい査定額が使用されているか確認

## Implementation Notes

### Phase 1: UI Implementation
- 手入力フィールドの追加
- 視覚的インジケーターの実装
- 状態管理の実装

### Phase 2: Backend Integration
- API エンドポイントの更新
- バリデーションロジックの実装
- データベース操作の実装

### Phase 3: Email/SMS Integration
- メールサービスの更新
- SMSテンプレートジェネレーターの更新
- 優先順位ロジックの実装

### Phase 4: Testing
- ユニットテストの作成
- プロパティベーステストの作成
- 統合テストの実行

## Security Considerations

1. **Input Validation**
   - XSS攻撃の防止
   - SQLインジェクションの防止
   - 入力値のサニタイゼーション

2. **Authorization**
   - ユーザー認証の確認
   - 権限チェック
   - セッション管理

3. **Data Protection**
   - 個人情報の暗号化
   - アクセスログの記録
   - 監査証跡の保持

## Performance Considerations

1. **Frontend Performance**
   - 状態更新の最適化
   - 不要な再レンダリングの防止
   - デバウンス処理の実装

2. **Backend Performance**
   - データベースクエリの最適化
   - インデックスの活用
   - キャッシング戦略

3. **Network Performance**
   - APIリクエストの最小化
   - レスポンスサイズの最適化
   - 圧縮の活用
