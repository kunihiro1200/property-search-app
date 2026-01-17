# Design Document

## Overview

本設計では、売主詳細画面（SellerDetailPage）に存在する「査定計算」セクションを通話モード画面（CallModePage）に移動させます。これにより、オペレーターが通話中に売主から物件情報を聞き取りながら、リアルタイムで査定額を計算・提示できるようになります。

移動対象のコンポーネントは以下の通りです：
- 固定資産税路線価入力フィールド
- 査定額1〜3の自動計算機能（デバウンス付き）
- 査定担当者の自動設定
- 計算根拠の詳細表示（建物価格・土地価格）
- 査定メール送信ボタン
- 簡潔表示モードと詳細編集モードの切り替え

## Architecture

### Component Structure

```
CallModePage
├── Header (既存)
│   ├── Navigation buttons
│   ├── Valuation display (査定額表示 - 既存)
│   └── Template selectors
├── Main Content (2-column layout)
│   ├── Left Column (情報表示エリア)
│   │   ├── Property Info (物件情報 - 既存)
│   │   ├── Seller Info (売主情報 - 既存)
│   │   ├── Status Update (ステータス更新 - 既存)
│   │   ├── Appointment Section (訪問予約 - 既存)
│   │   ├── Site Section (サイト - 既存)
│   │   └── **Valuation Calculation Section (査定計算 - NEW)**  ← ここに追加
│   └── Right Column (通話メモ入力エリア - 既存)
│       ├── Call Summary (AI要約 - 既存)
│       ├── Call Memo Input (通話メモ入力 - 既存)
│       └── Activity History (活動履歴 - 既存)
```

### Data Flow

```
User Input (固定資産税路線価)
    ↓
Debounced Auto Calculate (1秒後)
    ↓
API Calls (並列実行)
    ├── PUT /sellers/:id (固定資産税路線価を保存)
    ├── POST /sellers/:id/calculate-valuation-amount1
    ├── POST /sellers/:id/calculate-valuation-amount2
    └── POST /sellers/:id/calculate-valuation-amount3
    ↓
State Update (査定額1〜3、査定担当者)
    ↓
PUT /sellers/:id (査定額と査定担当者を保存)
    ↓
UI Update (計算根拠を表示)
```

## Components and Interfaces

### 1. Valuation Calculation Section Component

**Location**: `frontend/src/pages/CallModePage.tsx` の左カラム内、サイトセクションの後

**State Variables** (SellerDetailPageから移動):
```typescript
// 査定計算用の状態
const [editingValuation, setEditingValuation] = useState(false);
const [editedFixedAssetTaxRoadPrice, setEditedFixedAssetTaxRoadPrice] = useState<string>('');
const [valuationAssignedBy, setValuationAssignedBy] = useState<string>('');
const [editedValuationAmount1, setEditedValuationAmount1] = useState<string>('');
const [editedValuationAmount2, setEditedValuationAmount2] = useState<string>('');
const [editedValuationAmount3, setEditedValuationAmount3] = useState<string>('');
const [autoCalculating, setAutoCalculating] = useState(false);
const [sendingEmail, setSendingEmail] = useState(false);
const calculationTimerRef = useRef<NodeJS.Timeout | null>(null);
```

**Functions** (SellerDetailPageから移動):
```typescript
// 自動計算関数
const autoCalculateValuations = useCallback(async (roadPrice: string) => {
  // 実装はSellerDetailPageと同じ
}, [id, employee, property]);

// デバウンス付き自動計算関数
const debouncedAutoCalculate = useCallback((roadPrice: string) => {
  // 実装はSellerDetailPageと同じ
}, [autoCalculateValuations]);

// 査定メール送信関数
const handleSendValuationEmail = async () => {
  // 実装はSellerDetailPageと同じ
};
```

**UI Structure**:
```tsx
<Box sx={{ mb: 3 }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
    <Typography variant="h6">💰 査定計算</Typography>
    {editedValuationAmount1 && (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={() => setEditingValuation(!editingValuation)}>
          {editingValuation ? '完了' : '編集'}
        </Button>
        {!editingValuation && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<Email />}
            onClick={handleSendValuationEmail}
            disabled={sendingEmail}
          >
            査定メール送信
          </Button>
        )}
      </Box>
    )}
  </Box>
  <Paper sx={{ p: 2 }}>
    {/* 簡潔表示モード or 詳細編集モード */}
  </Paper>
</Box>
```

### 2. SellerDetailPage Modifications

**Changes**:
1. 査定計算セクション全体を削除（行860〜1120）
2. 簡潔な査定額表示を残す（ヘッダー部分に既に存在）
3. 通話モードへのリンクを追加

**New UI**:
```tsx
{/* 査定額表示（簡潔版） */}
<Grid item xs={12}>
  <Paper sx={{ p: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h6">査定情報</Typography>
      <Button
        variant="outlined"
        onClick={() => navigate(`/sellers/${id}/call`)}
      >
        通話モードで編集
      </Button>
    </Box>
    <Divider sx={{ my: 2 }} />
    {editedValuationAmount1 ? (
      <Box>
        <Typography variant="h5">
          {Math.round(parseInt(editedValuationAmount1) / 10000)}万円 ～ 
          {editedValuationAmount2 ? Math.round(parseInt(editedValuationAmount2) / 10000) : '-'}万円 ～ 
          {editedValuationAmount3 ? Math.round(parseInt(editedValuationAmount3) / 10000) : '-'}万円
        </Typography>
        {valuationAssignedBy && (
          <Typography variant="caption" color="text.secondary">
            査定担当: {valuationAssignedBy}
          </Typography>
        )}
      </Box>
    ) : (
      <Alert severity="info">
        査定額が未設定です。通話モードで計算してください。
      </Alert>
    )}
  </Paper>
</Grid>
```

## Data Models

既存のデータモデルを使用します。変更はありません。

```typescript
interface Seller {
  // ... 既存フィールド
  fixedAssetTaxRoadPrice?: number;
  valuationAmount1?: number;
  valuationAmount2?: number;
  valuationAmount3?: number;
  valuationAssignedBy?: string;
}

interface PropertyInfo {
  // ... 既存フィールド
  landArea?: number;
  buildingArea?: number;
  buildYear?: number;
  structure?: string;
  propertyType: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

査定計算の移動に関する多くのプロパティを特定しましたが、以下の観点で冗長性を排除します：

**冗長性の分析**:
- Property 4.1〜4.5（計算式の検証）は、実際には単一の「査定額計算の正確性」プロパティとして統合できます
- Property 5.1〜5.3（計算根拠の表示）は、「計算根拠の完全性」として統合できます
- Property 3.1〜3.3（メール送信ボタンの状態）は、「メール送信機能の可用性」として統合できます

以下、統合後のプロパティを記載します。

### Property 1: Valuation auto-calculation completeness

*For any* 固定資産税路線価の値、*when* オペレーターが通話モード画面で入力する、*then* システムは1秒後に査定額1、査定額2、査定額3を自動的に計算し、査定担当者を現在のログインユーザーに設定する

**Validates: Requirements 1.2, 1.4**

### Property 2: Valuation calculation accuracy

*For any* 物件情報（土地面積、建物面積、築年、構造）と固定資産税路線価、*when* 査定額を計算する、*then* システムは以下の計算式に従って正確に計算する：
- 土地価格 = 土地面積 × 固定資産税路線価 ÷ 0.6
- 建物価格 = 建築単価 × 建物面積 - 減価償却
- 査定額1 = 土地価格 + 建物価格
- 査定額2 = 査定額1 × 1.1
- 査定額3 = 査定額1 × 1.2

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 3: Calculation basis display completeness

*For any* 計算された査定額、*when* 通話モード画面で表示する、*then* システムは建物価格の計算根拠（物件種別、構造、建物面積、築年、築年数、建築単価、基準価格、減価償却）と土地価格の計算根拠（土地面積、固定資産税路線価、計算式）を段階的に表示する

**Validates: Requirements 1.3, 5.1, 5.2, 5.3**

### Property 4: Display mode toggle availability

*For any* 査定額が既に存在する状態、*when* 通話モード画面を表示する、*then* システムは簡潔な表示モード（査定額のみ）と詳細な編集モードを切り替え可能にする

**Validates: Requirements 1.5**

### Property 5: Email send button availability

*For any* 売主、*when* 通話モード画面で査定額の状態を確認する、*then* システムは査定額が計算されている場合のみ査定メール送信ボタンを有効化し、未計算の場合は無効化する

**Validates: Requirements 3.1, 3.3**

### Property 6: Email send functionality

*For any* 査定額が計算されている売主、*when* オペレーターが査定メール送信ボタンをクリックする、*then* システムは売主のメールアドレスに査定結果を送信する

**Validates: Requirements 3.2**


## Error Handling

### 1. API Error Handling

**Scenario**: 査定額計算APIが失敗した場合
- エラーメッセージを表示
- 計算中の状態をリセット
- ユーザーに再試行を促す

**Implementation**:
```typescript
try {
  setAutoCalculating(true);
  // API calls...
} catch (err: any) {
  console.error('Auto calculation failed:', err);
  setError('査定額の計算に失敗しました: ' + (err.response?.data?.error?.message || err.message));
} finally {
  setAutoCalculating(false);
}
```

### 2. Validation Error Handling

**Scenario**: 固定資産税路線価が無効な値の場合
- 負の値や0の場合は計算を実行しない
- 数値以外の入力は無視

**Implementation**:
```typescript
if (value && parseFloat(value) > 0) {
  debouncedAutoCalculate(value);
}
```

### 3. Missing Data Handling

**Scenario**: 物件情報が存在しない場合
- 査定計算セクションに警告メッセージを表示
- 計算機能を無効化

**Implementation**:
```tsx
{!property && (
  <Alert severity="info">
    物件情報が登録されていないため、査定を実行できません
  </Alert>
)}
```

### 4. Email Send Error Handling

**Scenario**: 査定メール送信が失敗した場合
- エラーメッセージを表示
- 送信中の状態をリセット
- ユーザーに再試行を促す

**Implementation**:
```typescript
try {
  setSendingEmail(true);
  await api.post(`/sellers/${id}/send-valuation-email`);
  setSuccessMessage('査定メールを送信しました');
} catch (err: any) {
  setError(err.response?.data?.error?.message || 'メール送信に失敗しました');
} finally {
  setSendingEmail(false);
}
```

## Testing Strategy

### Unit Testing

本機能は主にUIコンポーネントの移動であり、既存のロジックを維持するため、以下の観点でユニットテストを実施します：

1. **Component Rendering Tests**
   - 通話モード画面に査定計算セクションが表示されること
   - 売主詳細画面から査定計算セクションが削除されていること
   - 簡潔表示モードと詳細編集モードが正しく切り替わること

2. **State Management Tests**
   - 固定資産税路線価の入力が正しくstateに反映されること
   - デバウンス機能が正しく動作すること（1秒後に計算が実行される）
   - 査定額の計算結果が正しくstateに反映されること

3. **API Integration Tests**
   - 査定額計算APIが正しく呼び出されること
   - 査定メール送信APIが正しく呼び出されること
   - エラーハンドリングが正しく動作すること

### Property-Based Testing

本機能では、**Jest**と**fast-check**を使用してプロパティベーステストを実施します。

**Testing Framework**: Jest + fast-check (TypeScript/React用)
**Minimum Iterations**: 100回

各プロパティベーステストは、以下の形式でタグ付けします：
```typescript
// **Feature: valuation-to-call-mode, Property 1: Valuation auto-calculation completeness**
```

#### Property Test 1: Valuation auto-calculation completeness

```typescript
import fc from 'fast-check';

// **Feature: valuation-to-call-mode, Property 1: Valuation auto-calculation completeness**
test('Property 1: Valuation auto-calculation completeness', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.float({ min: 1000, max: 1000000 }), // 固定資産税路線価
      async (roadPrice) => {
        // テストロジック：
        // 1. 固定資産税路線価を入力
        // 2. 1秒待機
        // 3. 査定額1〜3が計算されていることを確認
        // 4. 査定担当者が設定されていることを確認
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property Test 2: Valuation calculation accuracy

```typescript
// **Feature: valuation-to-call-mode, Property 2: Valuation calculation accuracy**
test('Property 2: Valuation calculation accuracy', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        landArea: fc.float({ min: 50, max: 1000 }),
        buildingArea: fc.float({ min: 50, max: 500 }),
        buildYear: fc.integer({ min: 1950, max: 2024 }),
        roadPrice: fc.float({ min: 1000, max: 1000000 }),
      }),
      async ({ landArea, buildingArea, buildYear, roadPrice }) => {
        // テストロジック：
        // 1. 物件情報と路線価を設定
        // 2. 査定額を計算
        // 3. 計算式に従って期待値を算出
        // 4. 実際の計算結果と期待値が一致することを確認
        
        const expectedLandPrice = landArea * roadPrice / 0.6;
        const unitPrice = 176200;
        const buildingAge = 2025 - buildYear;
        const basePrice = unitPrice * buildingArea;
        const depreciation = basePrice * 0.9 * buildingAge * 0.031;
        const expectedBuildingPrice = basePrice - depreciation;
        const expectedAmount1 = expectedLandPrice + expectedBuildingPrice;
        const expectedAmount2 = expectedAmount1 * 1.1;
        const expectedAmount3 = expectedAmount1 * 1.2;
        
        // Assert: 実際の計算結果が期待値と一致
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property Test 3: Calculation basis display completeness

```typescript
// **Feature: valuation-to-call-mode, Property 3: Calculation basis display completeness**
test('Property 3: Calculation basis display completeness', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        landArea: fc.float({ min: 50, max: 1000 }),
        buildingArea: fc.float({ min: 50, max: 500 }),
        buildYear: fc.integer({ min: 1950, max: 2024 }),
        roadPrice: fc.float({ min: 1000, max: 1000000 }),
        propertyType: fc.constantFrom('detached_house', 'apartment', 'land'),
        structure: fc.constantFrom('木造', '軽量鉄骨', '鉄骨', '他'),
      }),
      async (propertyData) => {
        // テストロジック：
        // 1. 査定額を計算
        // 2. 計算根拠が表示されることを確認
        // 3. 必須項目（物件種別、構造、建物面積、築年、築年数、建築単価、基準価格、減価償却、土地面積、固定資産税路線価、計算式）が全て含まれることを確認
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property Test 4: Display mode toggle availability

```typescript
// **Feature: valuation-to-call-mode, Property 4: Display mode toggle availability**
test('Property 4: Display mode toggle availability', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        valuationAmount1: fc.float({ min: 1000000, max: 100000000 }),
        valuationAmount2: fc.float({ min: 1000000, max: 100000000 }),
        valuationAmount3: fc.float({ min: 1000000, max: 100000000 }),
      }),
      async (valuationData) => {
        // テストロジック：
        // 1. 査定額が存在する状態を設定
        // 2. 簡潔表示モードが表示されることを確認
        // 3. 編集ボタンをクリック
        // 4. 詳細編集モードに切り替わることを確認
        // 5. 完了ボタンをクリック
        // 6. 簡潔表示モードに戻ることを確認
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property Test 5: Email send button availability

```typescript
// **Feature: valuation-to-call-mode, Property 5: Email send button availability**
test('Property 5: Email send button availability', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.option(fc.float({ min: 1000000, max: 100000000 }), { nil: null }),
      async (valuationAmount1) => {
        // テストロジック：
        // 1. 査定額の有無を設定
        // 2. 査定メール送信ボタンの状態を確認
        // 3. 査定額がある場合：ボタンが有効
        // 4. 査定額がない場合：ボタンが無効
      }
    ),
    { numRuns: 100 }
  );
});
```

#### Property Test 6: Email send functionality

```typescript
// **Feature: valuation-to-call-mode, Property 6: Email send functionality**
test('Property 6: Email send functionality', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        sellerEmail: fc.emailAddress(),
        valuationAmount1: fc.float({ min: 1000000, max: 100000000 }),
        valuationAmount2: fc.float({ min: 1000000, max: 100000000 }),
        valuationAmount3: fc.float({ min: 1000000, max: 100000000 }),
      }),
      async (testData) => {
        // テストロジック：
        // 1. 売主情報と査定額を設定
        // 2. 査定メール送信ボタンをクリック
        // 3. APIが正しく呼び出されることを確認
        // 4. 成功メッセージが表示されることを確認
      }
    ),
    { numRuns: 100 }
  );
});
```

### Manual Testing Checklist

以下の項目を手動でテストします：

1. **通話モード画面での査定計算**
   - [ ] 固定資産税路線価を入力すると1秒後に査定額が自動計算される
   - [ ] 査定担当者が現在のログインユーザーに設定される
   - [ ] 計算根拠が詳細に表示される
   - [ ] 簡潔表示モードと詳細編集モードが切り替わる
   - [ ] 査定メール送信ボタンが正しく動作する

2. **売主詳細画面での表示**
   - [ ] 査定計算セクションが表示されない
   - [ ] 簡潔な査定額表示が表示される
   - [ ] 通話モードへのリンクが表示される

3. **エラーハンドリング**
   - [ ] 物件情報がない場合、警告メッセージが表示される
   - [ ] API エラー時、エラーメッセージが表示される
   - [ ] 無効な入力値の場合、計算が実行されない

4. **レスポンシブデザイン**
   - [ ] 通話モード画面のレイアウトが崩れない
   - [ ] 査定計算セクションが適切に配置される

## Implementation Notes

### 1. Code Migration Strategy

既存のコードを最小限の変更で移動させるため、以下の戦略を採用します：

1. **State Variables**: SellerDetailPageからCallModePageに完全にコピー
2. **Functions**: SellerDetailPageからCallModePageに完全にコピー
3. **JSX**: SellerDetailPageからCallModePageに完全にコピー（スタイリング含む）
4. **Dependencies**: 必要なimportを追加

### 2. Placement in CallModePage

査定計算セクションは、左カラムの以下の位置に配置します：

```
Left Column
├── Property Info (物件情報)
├── Seller Info (売主情報)
├── Status Update (ステータス更新)
├── Appointment Section (訪問予約)
├── Site Section (サイト)
└── **Valuation Calculation Section (査定計算)** ← ここに追加
```

この配置により、オペレーターは上から順に情報を確認・入力でき、最後に査定計算を実行できます。

### 3. SellerDetailPage Simplification

売主詳細画面では、査定計算セクションを削除し、以下の簡潔な表示に置き換えます：

- 査定額の表示（金額のみ）
- 査定担当者の表示
- 通話モードへのリンク

これにより、売主詳細画面はより簡潔になり、通話モードに機能が集約されます。

### 4. Backward Compatibility

既存のAPIエンドポイントとデータモデルは変更しないため、バックエンドの変更は不要です。

### 5. Testing Priority

以下の優先順位でテストを実施します：

1. **High Priority**: Property Test 2 (計算精度) - 最も重要な機能
2. **High Priority**: Property Test 1 (自動計算) - コア機能
3. **Medium Priority**: Property Test 3 (計算根拠表示) - ユーザー体験
4. **Medium Priority**: Property Test 5, 6 (メール送信) - 重要な機能
5. **Low Priority**: Property Test 4 (表示モード切り替え) - UI機能

## Deployment Considerations

### 1. Feature Flag

本機能は段階的にロールアウトするため、フィーチャーフラグを使用することを推奨します：

```typescript
const ENABLE_VALUATION_IN_CALL_MODE = true; // 環境変数で制御
```

### 2. Rollback Plan

問題が発生した場合、以下の手順でロールバックします：

1. フィーチャーフラグをfalseに設定
2. 売主詳細画面に査定計算セクションを復元
3. 通話モード画面から査定計算セクションを削除

### 3. User Communication

ユーザーに対して、以下の変更を通知します：

- 査定計算機能が通話モード画面に移動したこと
- 売主詳細画面では簡潔な査定額表示のみになること
- 通話モードへのリンクから査定計算ができること

### 4. Performance Monitoring

以下のメトリクスを監視します：

- 査定計算APIのレスポンスタイム
- 査定メール送信の成功率
- 通話モード画面のロード時間
- エラー発生率
