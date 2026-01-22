# Design Document

## Overview

通話モードページのステータス更新セクションにおいて、除外アクションフィールドを追加し、除外日フィールドの直下に配置する。ユーザーが除外理由を選択すると、次電日が自動的に除外日に設定され、選択した除外理由が通話メモ入力欄の右隣に赤字で表示される。これにより、除外処理の可視性と操作性を向上させる。

## Architecture

### Component Structure

```
CallModePage
├── Status Update Section
│   ├── Status Field
│   ├── Confidence Field
│   ├── Exclusion Date Field (read-only)
│   ├── Exclusion Action Field (NEW) ← 除外日フィールドの直下に配置
│   ├── Next Call Date Field
│   └── Update Button
└── Call Memo Section
    ├── Call Memo Input
    └── Exclusion Action Indicator (NEW) ← 赤字表示
```

### Data Flow

1. **ユーザーが除外アクションを選択**
   - `exclusionAction` stateが更新される
   - 除外日が設定されている場合、次電日が自動的に除外日の値に設定される
   - 選択した除外理由が通話メモ入力欄の右隣に赤字で表示される

2. **ステータス更新時**
   - 選択された除外アクションがバックエンドに送信される
   - データベースに保存される

3. **データ読み込み時**
   - 保存された除外アクションが復元される
   - 除外アクションが設定されている場合、赤字表示が復元される

## Components and Interfaces

### Frontend Components

#### 1. Exclusion Action Field

**Location**: `frontend/src/pages/CallModePage.tsx`

**State Management**:
```typescript
const [exclusionAction, setExclusionAction] = useState<string>('');
```

**UI Component**:
```typescript
<FormControl fullWidth size="small">
  <InputLabel>除外日にすること</InputLabel>
  <Select
    value={exclusionAction}
    label="除外日にすること"
    onChange={handleExclusionActionChange}
  >
    <MenuItem value="">
      <em>未選択</em>
    </MenuItem>
    <MenuItem value="除外日に不通であれば除外">除外日に不通であれば除外</MenuItem>
    <MenuItem value="除外日に何もせず除外">除外日に何もせず除外</MenuItem>
  </Select>
</FormControl>
```

#### 2. Exclusion Action Indicator

**Location**: 通話メモ入力欄の右隣

**UI Component**:
```typescript
{exclusionAction && (
  <Typography
    variant="body2"
    sx={{
      color: 'error.main',
      fontWeight: 'bold',
      ml: 2,
    }}
  >
    {exclusionAction}
  </Typography>
)}
```

### Backend API

#### Update Seller Endpoint

**Endpoint**: `PUT /sellers/:id`

**Request Body** (追加フィールド):
```typescript
{
  exclusionAction?: string | null;
}
```

**Database Schema** (追加カラム):
```sql
ALTER TABLE sellers ADD COLUMN exclusion_action VARCHAR(255);
```

## Data Models

### Seller Model (Updated)

```typescript
interface Seller {
  // ... existing fields
  exclusionAction?: string | null;
}
```

### Database Schema

```sql
-- sellers テーブルに exclusion_action カラムを追加
ALTER TABLE sellers 
ADD COLUMN exclusion_action VARCHAR(255);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Field positioning consistency

*For any* call mode page render, the Exclusion Action Field should be positioned immediately below the Exclusion Date Field in the DOM structure

**Validates: Requirements 1.1**

### Property 2: Next call date auto-update

*For any* exclusion action selection when exclusion date is set, the Next Call Date value should be automatically updated to match the Exclusion Date value

**Validates: Requirements 2.1, 2.2**

### Property 3: Red text display consistency

*For any* selected exclusion action, the exact text of the selected action should be displayed in red color to the right of the Call Memo Input field

**Validates: Requirements 3.1, 3.2**

### Property 4: Data persistence round-trip

*For any* saved exclusion action value, loading the seller data should restore the same exclusion action value and display state

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Empty exclusion date handling

*For any* exclusion action selection when exclusion date is empty, the Next Call Date should remain unchanged

**Validates: Requirements 2.3**

## Error Handling

### Frontend Validation

1. **除外アクション選択時**
   - 除外日が空の場合、次電日は更新しない
   - エラーメッセージは表示しない（警告のみ）

2. **ステータス更新時**
   - 除外アクションは任意項目
   - バリデーションエラーは発生しない

### Backend Validation

1. **データ保存時**
   - `exclusionAction`は任意フィールド
   - 最大255文字まで許可
   - NULL値を許可

### Error Messages

- フロントエンドでのエラーメッセージは不要
- バックエンドでのエラーは標準的なHTTPエラーレスポンスで返す

## Testing Strategy

### Unit Tests

1. **Exclusion Action Field Rendering**
   - 除外アクションフィールドが除外日フィールドの直下に表示されることを確認
   - 選択肢が正しく表示されることを確認

2. **Next Call Date Auto-Update**
   - 除外アクション選択時に次電日が自動更新されることを確認
   - 除外日が空の場合、次電日が更新されないことを確認

3. **Red Text Display**
   - 除外アクション選択時に赤字表示が表示されることを確認
   - 除外アクション未選択時に赤字表示が表示されないことを確認

4. **Data Persistence**
   - 除外アクションが保存されることを確認
   - 保存された除外アクションが復元されることを確認

### Property-Based Tests

Property-based testing will use **fast-check** library for TypeScript/React.

Each property-based test should run a minimum of 100 iterations.

1. **Property 1: Field positioning consistency**
   - Generate random seller data
   - Render CallModePage
   - Verify Exclusion Action Field is positioned immediately after Exclusion Date Field

2. **Property 2: Next call date auto-update**
   - Generate random exclusion dates and exclusion actions
   - Select exclusion action
   - Verify next call date equals exclusion date

3. **Property 3: Red text display consistency**
   - Generate random exclusion actions
   - Select exclusion action
   - Verify red text matches selected action text

4. **Property 4: Data persistence round-trip**
   - Generate random exclusion action values
   - Save seller with exclusion action
   - Load seller data
   - Verify exclusion action is restored

5. **Property 5: Empty exclusion date handling**
   - Generate random exclusion actions with empty exclusion date
   - Select exclusion action
   - Verify next call date remains unchanged

### Integration Tests

1. **End-to-End Flow**
   - ユーザーが除外アクションを選択
   - 次電日が自動更新される
   - 赤字表示が表示される
   - ステータスを更新
   - データが保存される
   - ページをリロード
   - 除外アクションと赤字表示が復元される

## Implementation Notes

### Frontend Implementation

1. **State Management**
   - `exclusionAction` stateを追加
   - `useEffect`で除外アクション選択時の処理を実装

2. **UI Layout**
   - 除外日フィールドの直後に除外アクションフィールドを配置
   - Grid layoutを使用して適切な間隔を確保

3. **Event Handlers**
   - `handleExclusionActionChange`: 除外アクション選択時の処理
   - 次電日の自動更新
   - 赤字表示の更新

### Backend Implementation

1. **Database Migration**
   - `exclusion_action`カラムを追加
   - VARCHAR(255)型、NULL許可

2. **API Endpoint**
   - `PUT /sellers/:id`エンドポイントを更新
   - `exclusionAction`フィールドを受け取る
   - データベースに保存

3. **Data Retrieval**
   - `GET /sellers/:id`エンドポイントで`exclusionAction`を返す

## Performance Considerations

- 除外アクション選択時の次電日自動更新は即座に実行される
- データベースへの保存は「ステータスを更新」ボタンクリック時のみ
- 赤字表示の更新はReactの再レンダリングで処理される

## Security Considerations

- 除外アクションの値は定義された選択肢のみ許可
- SQLインジェクション対策: パラメータ化されたクエリを使用
- XSS対策: Reactの自動エスケープを利用

## Accessibility

- 除外アクションフィールドには適切なラベルを設定
- キーボード操作でアクセス可能
- スクリーンリーダーで読み上げ可能
- 赤字表示は色だけでなくテキストでも情報を伝える
