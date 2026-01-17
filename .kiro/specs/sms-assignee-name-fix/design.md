# Design Document

## Overview

SMSテンプレート生成機能において、訪問後お礼メールの担当者名（営担）がUUIDとして表示される問題を修正する。現在、`seller.visitAssignee`または`seller.assignedTo`フィールドには従業員のUUIDまたはinitialsコードが格納されているが、テンプレート生成時に適切に名前に変換されていない。

この設計では、フロントエンドで従業員データを取得し、UUIDまたはinitialsコードを実際の名前にマッピングする機能を実装する。

## Architecture

### Current State

```
Seller Data (visitAssignee/assignedTo)
  ↓
  UUID or Initials Code
  ↓
generatePostVisitThankYouSMS()
  ↓
  Static Mapping (Initials → Name)
  ↓
  SMS Template with Name
```

**問題点:**
- UUIDが渡された場合、静的マッピングでは変換できない
- 従業員データがフロントエンドで利用可能だが、活用されていない

### Target State

```
Seller Data (visitAssignee/assignedTo)
  ↓
  UUID or Initials Code
  ↓
getEmployeeName(identifier, employees)
  ↓
  Dynamic Lookup (UUID → Employee → Name)
  ↓
generatePostVisitThankYouSMS()
  ↓
  SMS Template with Name
```

## Components and Interfaces

### 1. Employee Name Resolver

従業員識別子（UUIDまたはinitials）から名前を取得するユーティリティ関数。

```typescript
/**
 * 従業員識別子から名前を取得
 * @param identifier - 従業員のUUIDまたはinitialsコード
 * @param employees - 従業員リスト（オプション）
 * @returns 従業員名、見つからない場合は「担当者」
 */
function getEmployeeName(
  identifier: string | undefined,
  employees?: Employee[]
): string;
```

**処理フロー:**
1. identifierが空の場合 → デフォルト値「担当者」を返す
2. identifierがUUID形式の場合:
   - employeesリストから検索
   - 見つかった場合 → employee.nameを返す
   - 見つからない場合 → デフォルト値「担当者」を返す
3. identifierがinitialsコードの場合:
   - 静的マッピングで変換
   - マッピングに存在する場合 → 名前を返す
   - マッピングに存在しない場合 → identifierをそのまま返す

### 2. Updated SMS Template Generator

`generatePostVisitThankYouSMS`関数を更新して、新しいemployee name resolverを使用する。

```typescript
/**
 * 5. 訪問後御礼メール
 * 訪問査定後の御礼メッセージ（担当者名を含む）
 */
export const generatePostVisitThankYouSMS = (
  seller: Seller,
  property: PropertyInfo | null,
  employees?: Employee[]
): string;
```

### 3. CallModePage Integration

CallModePageコンポーネントで従業員データを取得し、SMSテンプレート生成時に渡す。

```typescript
// 従業員データの取得
const [employees, setEmployees] = useState<Employee[]>([]);

useEffect(() => {
  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };
  fetchEmployees();
}, []);

// SMSテンプレート生成時に従業員データを渡す
const smsText = generatePostVisitThankYouSMS(seller, property, employees);
```

## Data Models

### Employee Interface

```typescript
export interface Employee {
  id: string;              // UUID
  googleId: string;
  email: string;
  name: string;            // 表示名（例：「生野陸斗」）
  role: EmployeeRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  initials?: string;       // イニシャルコード（例：「生」）
  lastName?: string;
  firstName?: string;
  chatWebhookUrl?: string;
  phoneNumber?: string;
}
```

### Initials Mapping

静的マッピングは後方互換性のために保持する。

```typescript
const INITIALS_TO_NAME_MAP: Record<string, string> = {
  'U': '裏',
  'M': '河野',
  'Y': '山本',
  'W': '和田',
  'K': '国広',
  '生': '生野',
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: UUID Resolution Correctness

*For any* valid employee UUID and employee list containing that UUID, `getEmployeeName` should return the employee's name from the list.

**Validates: Requirements 1.3**

### Property 2: Initials Resolution Correctness

*For any* initials code in the static mapping, `getEmployeeName` should return the corresponding name from the mapping.

**Validates: Requirements 1.2**

### Property 3: Fallback Behavior

*For any* invalid or missing identifier, `getEmployeeName` should return the default value「担当者」.

**Validates: Requirements 1.4**

### Property 4: SMS Template Contains Name

*For any* seller with a valid assignee identifier and employee list, the generated SMS template should contain the resolved employee name, not the UUID or initials code.

**Validates: Requirements 1.1**

### Property 5: Field Priority

*For any* seller with both `visitAssignee` and `assignedTo` fields, the SMS generator should prioritize `visitAssignee` over `assignedTo`.

**Validates: Requirements 1.5**

## Error Handling

### 1. API Errors

従業員データの取得に失敗した場合:
- エラーをコンソールにログ
- 空の従業員リストで続行
- 静的マッピングまたはデフォルト値にフォールバック

### 2. Invalid Identifiers

無効な識別子が渡された場合:
- デフォルト値「担当者」を使用
- エラーをスローしない（graceful degradation）

### 3. Missing Employee Data

従業員リストに該当するUUIDが見つからない場合:
- デフォルト値「担当者」を使用
- 警告をコンソールにログ

## Testing Strategy

### Unit Tests

1. **getEmployeeName Function Tests**
   - UUID形式の識別子で正しい名前を返すことを確認
   - initialsコードで正しい名前を返すことを確認
   - 無効な識別子でデフォルト値を返すことを確認
   - 空の識別子でデフォルト値を返すことを確認
   - 従業員リストが空の場合の動作を確認

2. **generatePostVisitThankYouSMS Tests**
   - 従業員データありで正しい名前が含まれることを確認
   - 従業員データなしで静的マッピングが使用されることを確認
   - visitAssigneeが優先されることを確認
   - assignedToがフォールバックとして使用されることを確認

### Property-Based Tests

Property-based testingライブラリ: **fast-check** (TypeScript/JavaScript用)

各プロパティベーステストは最低100回の反復を実行する。

1. **Property 1: UUID Resolution Correctness**
   - ランダムな従業員リストとその中のUUIDを生成
   - `getEmployeeName`が正しい名前を返すことを検証

2. **Property 2: Initials Resolution Correctness**
   - マッピング内のすべてのinitialsコードをテスト
   - `getEmployeeName`が正しい名前を返すことを検証

3. **Property 3: Fallback Behavior**
   - ランダムな無効識別子を生成
   - `getEmployeeName`がデフォルト値を返すことを検証

4. **Property 4: SMS Template Contains Name**
   - ランダムなsellerと従業員データを生成
   - 生成されたSMSテンプレートに名前が含まれることを検証
   - UUIDが含まれていないことを検証

5. **Property 5: Field Priority**
   - visitAssigneeとassignedToの両方を持つsellerを生成
   - visitAssigneeの名前が使用されることを検証

### Integration Tests

1. **CallModePage Integration**
   - 従業員データの取得が正しく動作することを確認
   - SMSテンプレート生成時に従業員データが渡されることを確認
   - 生成されたSMSに正しい名前が表示されることを確認

## Implementation Notes

### UUID Detection

UUIDの検出には正規表現を使用:

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}
```

### Performance Considerations

- 従業員データは一度だけ取得し、コンポーネントの状態に保存
- 従業員リストの検索はO(n)だが、リストサイズは小さい（<20）ため問題なし
- 必要に応じて、Map<UUID, Employee>を使用してO(1)検索に最適化可能

### Backward Compatibility

- 既存の静的マッピングは保持
- initialsコードを使用している既存データも引き続き動作
- 従業員データが取得できない場合でも、静的マッピングにフォールバック

## Migration Path

1. **Phase 1**: ユーティリティ関数の実装
   - `getEmployeeName`関数を実装
   - ユニットテストを追加

2. **Phase 2**: SMSテンプレート生成の更新
   - `generatePostVisitThankYouSMS`を更新
   - プロパティベーステストを追加

3. **Phase 3**: UI統合
   - CallModePageで従業員データを取得
   - SMSテンプレート生成時に従業員データを渡す

4. **Phase 4**: 検証とデプロイ
   - 統合テストを実行
   - 本番環境でテスト
   - デプロイ
