# Design Document

## Overview

追客ログトラッカーは、売主への電話連絡を自動的に記録し、シンプルな履歴として表示する機能です。既存の`activities`テーブルを活用し、`phone_call`タイプのアクティビティから追客ログを生成します。コメント不要のシンプルな表示により、誰がいつ電話したかを一目で把握できます。

## Architecture

### System Components

```
┌─────────────────┐
│  CallModePage   │ ← 既存のコールモードページ
└────────┬────────┘
         │ 通話メモ保存時に自動記録
         ↓
┌─────────────────┐
│ Activities API  │ ← 既存のAPI（拡張）
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Activities DB   │ ← 既存のactivitiesテーブル
└─────────────────┘
         ↑
         │ 追客ログとして取得
┌─────────────────┐
│ CallLogDisplay  │ ← 新規コンポーネント
└─────────────────┘
```

### Data Flow

1. ユーザーがCallModePageで通話メモを保存
2. 既存のActivities APIが`phone_call`タイプのアクティビティを作成
3. 売主詳細ページで追客ログコンポーネントが表示される
4. コンポーネントが`phone_call`タイプのアクティビティを取得
5. シンプルな形式（日時・担当者のみ）で表示

## Components and Interfaces

### 1. CallLogDisplay Component (新規)

売主詳細ページに追加する追客ログ表示コンポーネント。

```typescript
interface CallLogDisplayProps {
  sellerId: string;
}

interface CallLogEntry {
  id: string;
  calledAt: string; // ISO 8601形式
  employeeName: string;
  employeeId: string;
}
```

**主な機能:**
- 売主IDに基づいて追客ログを取得
- 日時降順でソート（最新が上）
- シンプルな表形式で表示
- 総通話回数を表示

### 2. API Endpoints (既存を活用)

既存の`/sellers/:id/activities`エンドポイントを使用し、フロントエンド側で`phone_call`タイプのみをフィルタリング。

**取得例:**
```typescript
GET /sellers/:sellerId/activities
Response: Activity[]

// フロントエンド側でフィルタリング
const callLogs = activities.filter(a => a.type === 'phone_call');
```

### 3. Database Schema (既存を活用)

既存の`activities`テーブルをそのまま使用。

```sql
-- 既存のactivitiesテーブル
CREATE TABLE activities (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'phone_call'を使用
    content TEXT NOT NULL,
    result TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE
);
```

## Data Models

### CallLog (View Model)

フロントエンドで使用する追客ログのビューモデル。

```typescript
interface CallLog {
  id: string;
  sellerId: string;
  employeeId: string;
  employeeName: string;
  calledAt: string; // ISO 8601
}
```

### Activity (既存モデル)

```typescript
interface Activity {
  id: string;
  sellerId: string;
  employeeId: string;
  type: 'phone_call' | 'email' | 'sms' | 'hearing' | 'appointment';
  content: string;
  result?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    email: string;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework

1.1 WHEN a User initiates a Call_Action to a Seller THEN the System SHALL automatically create a Log_Entry with the current timestamp and User information
Thoughts: This is about automatic behavior that should happen for all calls. We can test that when a phone_call activity is created, it contains the required fields (timestamp, user ID, seller ID).
Testable: yes - property

1.2 WHEN a Log_Entry is created THEN the System SHALL store the Seller ID, User ID, and exact date-time without requiring any manual input
Thoughts: This is testing data integrity - that all required fields are present and non-null when a call log is created.
Testable: yes - property

1.3 WHEN a Call_Action is completed THEN the System SHALL persist the Log_Entry to the database immediately
Thoughts: This is about persistence behavior. We can test that after creating a call log, querying the database returns the same log.
Testable: yes - property

1.4 WHEN multiple Users call the same Seller THEN the System SHALL create separate Log_Entry records for each call
Thoughts: This tests that multiple calls create multiple distinct records, not overwriting each other.
Testable: yes - property

2.1 WHEN a User views a Seller's detail page THEN the System SHALL display a list of all Call_Log entries for that Seller
Thoughts: This is testing that the display component shows all call logs for a given seller.
Testable: yes - property

2.2 WHEN displaying Call_Log entries THEN the System SHALL show the date, time, and User name for each entry
Thoughts: This tests that the rendered output contains the required information fields.
Testable: yes - property

2.3 WHEN displaying Call_Log entries THEN the System SHALL NOT include any comment or memo fields
Thoughts: This is testing that the display excludes certain fields. We can verify the rendered output doesn't contain content/memo text.
Testable: yes - property

2.4 WHEN displaying Call_Log entries THEN the System SHALL sort them by date and time in descending order (newest first)
Thoughts: This is a sorting property that should hold for any set of call logs.
Testable: yes - property

2.5 WHEN the Call_Log list is empty THEN the System SHALL display an appropriate empty state message
Thoughts: This is an edge case for when there are no call logs.
Testable: edge-case

3.1 WHEN a Call_Log entry is displayed THEN the System SHALL show the User name or identifier who made the call
Thoughts: This tests that user information is present in the display.
Testable: yes - property

3.2 WHEN multiple Users have called the same Seller THEN the System SHALL clearly distinguish between different Users in the log
Thoughts: This tests that different users are displayed with distinct identifiers.
Testable: yes - property

3.3 WHEN a User's name is displayed THEN the System SHALL use a consistent format across all log entries
Thoughts: This tests formatting consistency across all entries.
Testable: yes - property

4.1 WHEN a User uses the call mode page to make a call THEN the System SHALL trigger automatic Call_Log creation
Thoughts: This is testing integration between the call mode page and log creation.
Testable: yes - property

4.2 WHEN the call mode page saves call notes THEN the System SHALL create both the call note and the Call_Log entry
Thoughts: This is redundant with 4.1 - saving call notes IS the call log creation in our system.
Testable: redundant

4.3 WHEN the automatic logging fails THEN the System SHALL not prevent the User from completing other call-related tasks
Thoughts: This is about error handling behavior, but it's vague about what "not prevent" means.
Testable: no

4.4 WHEN a User navigates away from the call mode page THEN the System SHALL ensure the Call_Log entry has been saved
Thoughts: This is about persistence guarantees, similar to 1.3.
Testable: redundant

5.1 WHEN viewing a Seller's information THEN the System SHALL display the total count of Call_Log entries
Thoughts: This tests that the count displayed matches the actual number of call logs.
Testable: yes - property

5.2 WHEN a new Call_Log entry is created THEN the System SHALL update the call count immediately
Thoughts: This is testing that the count updates correctly after adding a new log.
Testable: yes - property

5.3 WHEN displaying the call count THEN the System SHALL use a clear and visible format
Thoughts: This is about UI design, not a testable functional property.
Testable: no

### Property Reflection

After reviewing all properties, the following redundancies were identified:

- **Property 4.2 is redundant with 4.1**: In our system, saving call notes creates the activity record, which IS the call log. These are the same action.
- **Property 4.4 is redundant with 1.3**: Both test persistence of the log entry to the database.
- **Property 1.1 and 1.2 overlap significantly**: Both test that required fields are present when creating a log. These can be combined.
- **Property 5.2 is implied by 5.1**: If the count always matches the actual number of logs (5.1), then it will be correct after adding a new log.

### Correctness Properties

Property 1: Call log creation completeness
*For any* phone call activity created, the activity record SHALL contain non-null values for seller_id, employee_id, and created_at timestamp
**Validates: Requirements 1.1, 1.2**

Property 2: Call log persistence
*For any* phone call activity, after creation, querying the database with the activity ID SHALL return an equivalent activity record
**Validates: Requirements 1.3**

Property 3: Multiple calls create distinct records
*For any* seller, when multiple phone call activities are created, each SHALL have a unique ID and distinct created_at timestamp
**Validates: Requirements 1.4**

Property 4: Call log display completeness
*For any* seller with phone call activities, the displayed call log list SHALL include all phone_call type activities for that seller
**Validates: Requirements 2.1**

Property 5: Call log display format
*For any* displayed call log entry, the rendered output SHALL contain the date, time, and employee name, and SHALL NOT contain the content field
**Validates: Requirements 2.2, 2.3**

Property 6: Call log sorting
*For any* list of call logs, the displayed order SHALL be sorted by created_at in descending order (newest first)
**Validates: Requirements 2.4**

Property 7: User distinction in logs
*For any* seller with calls from multiple employees, each call log entry SHALL display a distinct employee identifier
**Validates: Requirements 3.1, 3.2**

Property 8: User name format consistency
*For any* set of call log entries, all employee names SHALL be formatted using the same transformation function
**Validates: Requirements 3.3**

Property 9: Call mode integration
*For any* call note saved through the call mode page, a corresponding phone_call activity SHALL be created in the database
**Validates: Requirements 4.1**

Property 10: Call count accuracy
*For any* seller, the displayed call count SHALL equal the number of phone_call type activities for that seller
**Validates: Requirements 5.1, 5.2**

## Error Handling

### Frontend Error Handling

1. **API取得エラー**: 追客ログの取得に失敗した場合、エラーメッセージを表示し、リトライボタンを提供
2. **空データ**: 通話履歴がない場合、適切な空状態メッセージを表示
3. **ネットワークエラー**: オフライン時は適切なエラーメッセージを表示

### Backend Error Handling

既存のActivities APIのエラーハンドリングをそのまま使用。

## Testing Strategy

### Unit Testing

**フロントエンド:**
- CallLogDisplayコンポーネントの表示ロジック
- 日時フォーマット関数
- 担当者名表示関数
- 空状態の表示

**テストフレームワーク:** Jest + React Testing Library

### Property-Based Testing

**プロパティベーステストライブラリ:** fast-check (JavaScript/TypeScript用)

各プロパティベーステストは最低100回の反復実行を行い、各テストには対応する設計書のプロパティ番号を明示的にコメントで記載する。

**テスト対象:**
1. Call log creation completeness (Property 1)
2. Call log persistence (Property 2)
3. Multiple calls create distinct records (Property 3)
4. Call log display completeness (Property 4)
5. Call log display format (Property 5)
6. Call log sorting (Property 6)
7. User distinction in logs (Property 7)
8. User name format consistency (Property 8)
9. Call mode integration (Property 9)
10. Call count accuracy (Property 10)

### Integration Testing

- CallModePageからの通話メモ保存フロー
- 売主詳細ページでの追客ログ表示フロー
- API連携の動作確認

## Implementation Notes

### Phase 1: UI Component Creation
- CallLogDisplayコンポーネントの作成
- 売主詳細ページへの統合
- スタイリングとレイアウト

### Phase 2: Data Integration
- 既存Activities APIとの連携
- データフィルタリングとソート
- 通話回数カウント機能

### Phase 3: Testing
- ユニットテストの作成
- プロパティベーステストの作成
- 統合テストの実行

### Phase 4: Polish
- エラーハンドリングの改善
- パフォーマンス最適化
- ユーザビリティの向上

## Dependencies

- 既存の`activities`テーブルとAPI
- 既存の`CallModePage`コンポーネント
- Material-UI コンポーネント
- React Router
- fast-check (プロパティベーステスト用)

## Performance Considerations

- 追客ログは売主詳細ページ読み込み時に既存のactivitiesと一緒に取得されるため、追加のAPIコールは不要
- フロントエンド側でのフィルタリングとソートは軽量な操作
- 大量の通話履歴がある場合は、表示件数を制限（例: 最新50件）

## Security Considerations

- 既存のActivities APIの認証・認可をそのまま使用
- ユーザーは自分がアクセス権を持つ売主の追客ログのみ閲覧可能
- 個人情報（電話番号など）は追客ログには含まれない
