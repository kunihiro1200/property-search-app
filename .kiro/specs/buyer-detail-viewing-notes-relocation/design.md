# Design Document

## Overview

買主詳細画面（BuyerDetailPage）において、内覧前伝達事項（viewing_notes）フィールドを右側の買主情報セクションから左側の物件詳細カード（PropertyInfoCard）内に移動します。また、最新状況（latest_status）フィールドをプルダウンとして正しく機能するよう修正します。

この変更により、物件に関連する情報を物件カード内に集約し、ユーザーの視認性と操作性を向上させます。

## Architecture

### Component Hierarchy

```
BuyerDetailPage
├── Left Column (物件情報)
│   └── PropertyInfoCard (複数)
│       ├── 物件基本情報
│       ├── 物件詳細情報
│       └── ViewingNotesField (新規追加) ← 黄色背景
└── Right Column (買主情報)
    ├── 買主基本情報
    ├── LatestStatusDropdown (修正)
    └── その他フィールド（viewing_notesを除外）
```

### Data Flow

1. **表示モード**: BuyerDetailPage → PropertyInfoCard → ViewingNotesField (読み取り専用)
2. **編集モード**: BuyerDetailPage → PropertyInfoCard → ViewingNotesField (編集可能)
3. **保存処理**: ViewingNotesField → BuyerDetailPage → API → Database

## Components and Interfaces

### 1. ViewingNotesField Component

**責任**: 内覧前伝達事項の表示と編集を担当

**Props**:
```typescript
interface ViewingNotesFieldProps {
  value: string | null;
  isEditing: boolean;
  onChange: (value: string) => void;
  buyerId: string;
}
```

**実装詳細**:
- 黄色背景 (#FFF9E6) を適用
- 編集モード時は TextField を表示
- 表示モード時は Typography で表示
- 空の場合は "（未入力）" を表示

### 2. PropertyInfoCard Component (修正)

**変更内容**:
- viewing_notes フィールドを表示するセクションを追加
- カード下部に視覚的に分離されたセクションとして配置
- 編集モードと表示モードの両方に対応

**追加Props**:
```typescript
interface PropertyInfoCardProps {
  // 既存のprops
  property: Property;
  buyer: Buyer;
  isEditing: boolean;
  onUpdate: (field: string, value: any) => void;
  // 新規追加
  viewingNotes?: string | null;
  onViewingNotesChange?: (value: string) => void;
}
```

### 3. LatestStatusDropdown Component (新規作成)

**責任**: 最新状況の選択と表示を担当

**Props**:
```typescript
interface LatestStatusDropdownProps {
  value: string | null;
  isEditing: boolean;
  onChange: (value: string) => void;
  options: string[];
}
```

**実装詳細**:
- Material-UI Autocomplete コンポーネントを使用
- freeSolo モードを有効化（カスタム入力可能）
- 16個の定義済みオプションを提供
- 空の場合は "（未設定）" を表示

**定義済みオプション**:
```typescript
const LATEST_STATUS_OPTIONS = [
  '内覧予定',
  '内覧済み',
  '申込検討中',
  '申込済み',
  '契約予定',
  '契約済み',
  '見送り',
  '他社決定',
  '予算オーバー',
  '条件不一致',
  '連絡待ち',
  '再内覧希望',
  '資料送付済み',
  '追加情報待ち',
  '検討中',
  'その他'
];
```

### 4. BuyerDetailPage Component (修正)

**変更内容**:
- FIELD_SECTIONS から viewing_notes を除外
- PropertyInfoCard に viewing_notes を渡す
- LatestStatusDropdown コンポーネントを統合

## Data Models

### Buyer Model (既存)

```typescript
interface Buyer {
  id: string;
  // ... 既存フィールド
  viewing_notes: string | null;
  latest_status: string | null;
  // ... その他フィールド
}
```

**変更**: なし（既存のフィールドを使用）

### Database Schema (既存)

```sql
-- buyers テーブル
CREATE TABLE buyers (
  id UUID PRIMARY KEY,
  -- ... 既存カラム
  viewing_notes TEXT,
  latest_status VARCHAR(255),
  -- ... その他カラム
);
```

**変更**: なし（既存のカラムを使用）

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: ViewingNotes表示位置の一貫性

*For any* buyer detail page rendering, the viewing_notes field should appear within PropertyInfoCard and not in the right-side buyer information section

**Validates: Requirements 1.1, 1.3**

### Property 2: ViewingNotes背景色の適用

*For any* viewing_notes field display (edit or view mode), the background color should be #FFF9E6

**Validates: Requirements 1.2, 1.4**

### Property 3: ViewingNotes空値表示

*For any* viewing_notes field with null or empty value, the display should show "（未入力）" placeholder text

**Validates: Requirements 1.5**

### Property 4: LatestStatusドロップダウン機能

*For any* buyer in edit mode, the latest_status field should render as an Autocomplete dropdown with 16 predefined options and freeSolo enabled

**Validates: Requirements 2.2, 2.4**

### Property 5: LatestStatus空値表示

*For any* latest_status field with null or empty value in view mode, the display should show "（未設定）"

**Validates: Requirements 2.5**

### Property 6: ViewingNotes保存の整合性

*For any* viewing_notes edit and save operation, the value stored in the database should match the value entered by the user

**Validates: Requirements 4.1, 4.2**

### Property 7: レイアウト構造の維持

*For any* buyer detail page rendering, the 2-column layout (left: properties, right: buyer info) should be maintained after viewing_notes relocation

**Validates: Requirements 3.1**

### Property 8: 複数物件での表示

*For any* buyer with multiple linked properties, each PropertyInfoCard should display the same viewing_notes value

**Validates: Requirements 3.3**

## Error Handling

### 1. API通信エラー

**シナリオ**: viewing_notes または latest_status の保存時にAPIエラーが発生

**対応**:
- エラーメッセージをユーザーに表示
- 編集内容を保持（ユーザーの入力を失わない）
- リトライ可能な状態を維持

### 2. バリデーションエラー

**シナリオ**: 入力値が制約に違反（例: 文字数制限）

**対応**:
- フィールド下部にエラーメッセージを表示
- 保存ボタンを無効化
- ユーザーが修正できるようフォーカスを維持

### 3. データ不整合

**シナリオ**: 複数タブで同時編集により、データが古くなる

**対応**:
- 保存時に最新データを再取得
- 競合を検出した場合、ユーザーに通知
- ユーザーに上書きまたはキャンセルの選択肢を提供

## Testing Strategy

### Unit Tests

**ViewingNotesField Component**:
- 表示モードで正しく値を表示
- 編集モードで入力を受け付ける
- 黄色背景が適用される
- 空値時にプレースホルダーを表示

**LatestStatusDropdown Component**:
- 16個のオプションが表示される
- freeSoloモードでカスタム入力が可能
- 選択時にonChangeが呼ばれる
- 空値時に "（未設定）" を表示

**PropertyInfoCard Component**:
- viewing_notesセクションが表示される
- 編集モードと表示モードで適切に切り替わる
- viewing_notes変更時にonChangeが呼ばれる

### Property-Based Tests

各property-based testは最低100回の反復実行を行い、ランダムな入力に対して正確性を検証します。

**Property 1 Test**: ViewingNotes表示位置の一貫性
- ランダムなbuyer dataを生成
- BuyerDetailPageをレンダリング
- viewing_notesがPropertyInfoCard内に存在することを確認
- viewing_notesが右側セクションに存在しないことを確認
- **Feature: buyer-detail-viewing-notes-relocation, Property 1: ViewingNotes表示位置の一貫性**

**Property 2 Test**: ViewingNotes背景色の適用
- ランダムなviewing_notes値を生成
- 編集モードと表示モードの両方でレンダリング
- 背景色が#FFF9E6であることを確認
- **Feature: buyer-detail-viewing-notes-relocation, Property 2: ViewingNotes背景色の適用**

**Property 6 Test**: ViewingNotes保存の整合性
- ランダムなviewing_notes値を生成
- 編集して保存
- データベースから再取得
- 保存した値と一致することを確認
- **Feature: buyer-detail-viewing-notes-relocation, Property 6: ViewingNotes保存の整合性**

### Integration Tests

- BuyerDetailPageの完全なレンダリングテスト
- viewing_notesの編集から保存までのフローテスト
- latest_statusのドロップダウン選択から保存までのフローテスト
- 複数物件が紐づく買主での表示テスト

### Manual Testing Checklist

1. 買主詳細画面を開き、viewing_notesが物件カード内に表示されることを確認
2. 編集モードに切り替え、viewing_notesを編集できることを確認
3. 黄色背景が適用されていることを確認
4. latest_statusドロップダウンから選択できることを確認
5. カスタム値を入力できることを確認
6. 保存後、値が正しく保存されることを確認
7. 複数物件がある場合、各カードにviewing_notesが表示されることを確認

