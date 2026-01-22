# Design Document

## Overview

買主詳細画面（BuyerDetailPage.tsx）において、内覧前伝達事項フィールドの視認性向上と、★最新状況フィールドのドロップダウン化を実装する。これにより、営業担当者が重要な情報を見落とさず、効率的に状況を記録できるようにする。

## Architecture

### Component Structure

```
BuyerDetailPage.tsx
├── ViewingNotesField (新規コンポーネント)
│   └── 内覧前伝達事項の表示・編集
└── LatestStatusDropdown (新規コンポーネント)
    └── 最新状況のドロップダウン選択
```

### Data Flow

1. **読み込み時**: API → BuyerDetailPage → ViewingNotesField/LatestStatusDropdown
2. **編集時**: ユーザー入力 → コンポーネント → editedBuyer state → API

## Components and Interfaces

### 1. ViewingNotesField Component

**目的**: 内覧前伝達事項フィールドを背景色付きで表示・編集する

**Props**:
```typescript
interface ViewingNotesFieldProps {
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
}
```

**実装詳細**:
- Material-UIの`TextField`を使用
- 背景色: `#FFF9E6`（淡い黄色）
- 編集モード時: multiline TextField with 4 rows
- 表示モード時: 背景色付きのTypography
- 空の場合でも背景色を表示

**スタイル仕様**:
```typescript
const viewingNotesStyle = {
  bgcolor: '#FFF9E6',
  borderRadius: 1,
  p: 2,
  border: '1px solid #FFE082',
};
```

### 2. LatestStatusDropdown Component

**目的**: ★最新状況フィールドをドロップダウン形式で表示・編集する

**Props**:
```typescript
interface LatestStatusDropdownProps {
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
}
```

**選択肢リスト**:
```typescript
const LATEST_STATUS_OPTIONS = [
  'A:この物件を気に入っている(こちらからの一押しが必要)',
  'B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。',
  'C:引っ越しは1年以上先',
  'D:配信・追客不要案件(業者や確度が低く追客不要案件等)',
  '買付外れました',
  '買(一般 両手)',
  '買(一般 片手)',
  '買(専任 両手)',
  '買(専任 片手)',
  '買(他社、片手)',
  '他決',
  '2番手',
  '3番手',
  'AZ:Aだが次電日不要',
  '2番手買付提出済み',
  '3番手買付提出済み',
];
```

**実装詳細**:
- Material-UIの`Autocomplete`を使用（カスタム値入力可能）
- `freeSolo` オプションを有効化して、既存データとの互換性を保つ
- 編集モード時: Autocomplete with dropdown
- 表示モード時: 通常のTypography

### 3. BuyerDetailPage.tsx の修正

**FIELD_SECTIONSの更新**:

「問合せ・内覧情報」セクションに以下のフィールドを追加:
```typescript
{
  title: '問合せ・内覧情報',
  fields: [
    // ... 既存フィールド
    { 
      key: 'viewing_notes', 
      label: '内覧前伝達事項', 
      multiline: true,
      component: 'ViewingNotesField' // カスタムコンポーネント指定
    },
    { 
      key: 'latest_status', 
      label: '★最新状況',
      component: 'LatestStatusDropdown' // カスタムコンポーネント指定
    },
    // ... 既存フィールド
  ],
}
```

**レンダリングロジックの更新**:
```typescript
// フィールドレンダリング時にcomponentプロパティをチェック
if (field.component === 'ViewingNotesField') {
  return (
    <ViewingNotesField
      value={value}
      isEditing={isEditing}
      onChange={(newValue) => handleFieldChange(field.key, newValue)}
    />
  );
}

if (field.component === 'LatestStatusDropdown') {
  return (
    <LatestStatusDropdown
      value={value}
      isEditing={isEditing}
      onChange={(newValue) => handleFieldChange(field.key, newValue)}
    />
  );
}
```

## Data Models

### Buyer Interface の拡張

```typescript
interface Buyer {
  // ... 既存フィールド
  viewing_notes?: string;  // 内覧前伝達事項
  latest_status?: string;  // ★最新状況
  // ... 既存フィールド
}
```

**注意**: `latest_status`フィールドは既に存在しているため、データベーススキーマの変更は不要。`viewing_notes`フィールドは新規追加が必要。

## Database Schema Changes

### sellers テーブルへの追加

```sql
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS viewing_notes TEXT;
```

**注意**: `latest_status`カラムは既に存在している（migration 063で追加済み）。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 内覧前伝達事項の背景色表示

*For any* 買主詳細画面の表示状態において、内覧前伝達事項フィールドは常に指定された背景色（#FFF9E6）で表示される

**Validates: Requirements 1.1, 1.2**

### Property 2: 最新状況ドロップダウンの選択肢

*For any* 最新状況ドロップダウンの表示において、すべての定義された選択肢が表示される

**Validates: Requirements 2.2, 2.3**

### Property 3: データ保存の整合性

*For any* 買主データの保存操作において、内覧前伝達事項と最新状況の値が正しくデータベースに保存される

**Validates: Requirements 3.1, 3.4**

### Property 4: 既存データの互換性

*For any* 既存の買主データにおいて、最新状況フィールドの値（選択肢にない値を含む）が正しく読み込まれ、表示される

**Validates: Requirements 2.5, 2.6, 3.2, 3.3**

## Error Handling

### 1. データ読み込みエラー

- APIエラー時: エラーメッセージをSnackbarで表示
- 空データ時: デフォルト値（空文字列）を使用

### 2. データ保存エラー

- 保存失敗時: エラーメッセージをSnackbarで表示
- 編集状態を維持し、ユーザーが再試行できるようにする

### 3. バリデーションエラー

- 内覧前伝達事項: 文字数制限なし（TEXT型）
- 最新状況: 文字数制限なし（既存データとの互換性のため）

## Testing Strategy

### Unit Tests

1. **ViewingNotesField Component**
   - 背景色が正しく適用されているか
   - 編集モードと表示モードの切り替え
   - 空値の場合の表示

2. **LatestStatusDropdown Component**
   - すべての選択肢が表示されるか
   - カスタム値の入力と表示
   - 既存値の初期選択

3. **BuyerDetailPage Integration**
   - フィールドの表示と編集
   - データの保存と読み込み
   - エラーハンドリング

### Property-Based Tests

各correctness propertyに対して、最低100回の反復テストを実行する。

**Property Test 1: 背景色の一貫性**
```typescript
// Feature: buyer-detail-ui-enhancement, Property 1: 内覧前伝達事項の背景色表示
test('viewing notes field always has correct background color', () => {
  // ランダムな買主データを生成
  // ViewingNotesFieldをレンダリング
  // 背景色が#FFF9E6であることを確認
});
```

**Property Test 2: ドロップダウン選択肢の完全性**
```typescript
// Feature: buyer-detail-ui-enhancement, Property 2: 最新状況ドロップダウンの選択肢
test('latest status dropdown contains all defined options', () => {
  // LatestStatusDropdownをレンダリング
  // すべての選択肢が存在することを確認
});
```

**Property Test 3: データ保存の正確性**
```typescript
// Feature: buyer-detail-ui-enhancement, Property 3: データ保存の整合性
test('buyer data is saved correctly with new fields', () => {
  // ランダムな値を生成
  // 保存操作を実行
  // 保存されたデータが入力値と一致することを確認
});
```

**Property Test 4: 既存データの互換性**
```typescript
// Feature: buyer-detail-ui-enhancement, Property 4: 既存データの互換性
test('existing buyer data with custom status values is displayed correctly', () => {
  // 選択肢にないカスタム値を持つ買主データを生成
  // データを読み込み
  // カスタム値が正しく表示されることを確認
});
```

### Manual Testing

1. 買主詳細画面を開き、内覧前伝達事項フィールドの背景色を確認
2. 最新状況ドロップダウンをクリックし、すべての選択肢が表示されることを確認
3. 各フィールドを編集し、保存が正しく動作することを確認
4. 既存の買主データ（カスタム最新状況値を持つ）を開き、正しく表示されることを確認

## Implementation Notes

### フィールドの配置

内覧前伝達事項と最新状況フィールドは、「問合せ・内覧情報」セクション内に配置する。推奨される順序:

1. 初動担当
2. 後続担当
3. 受付日
4. 問合せ元
5. 問合時ヒアリング
6. 問合時確度
7. 内覧日(最新)
8. **内覧前伝達事項** ← 新規追加
9. **★最新状況** ← ドロップダウン化
10. 内覧結果・後続対応
11. 次電日

### スタイリングの一貫性

- 内覧前伝達事項の背景色は、他のフィールドと明確に区別できるように淡い黄色（#FFF9E6）を使用
- ボーダーは#FFE082（やや濃い黄色）を使用して、フィールドの境界を明確にする
- 最新状況ドロップダウンは、他のドロップダウンフィールド（問合せ元など）と同じスタイルを使用

### パフォーマンス考慮事項

- ViewingNotesFieldとLatestStatusDropdownは、メモ化（React.memo）を使用して不要な再レンダリングを防ぐ
- ドロップダウンの選択肢リストは定数として定義し、毎回生成しない

## Migration Strategy

1. **Phase 1**: データベーススキーマの更新
   - `viewing_notes`カラムを`sellers`テーブルに追加

2. **Phase 2**: コンポーネントの実装
   - ViewingNotesFieldコンポーネントを作成
   - LatestStatusDropdownコンポーネントを作成

3. **Phase 3**: BuyerDetailPageの統合
   - FIELD_SECTIONSを更新
   - レンダリングロジックを更新

4. **Phase 4**: テストとデプロイ
   - Unit testsを実行
   - Manual testingを実施
   - 本番環境へデプロイ

## Rollback Plan

問題が発生した場合:

1. フロントエンドの変更をロールバック（以前のバージョンをデプロイ）
2. データベースの`viewing_notes`カラムは削除しない（データ損失を防ぐため）
3. 既存の`latest_status`データは影響を受けない（ドロップダウン化は表示方法の変更のみ）
