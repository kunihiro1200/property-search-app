# Design Document

## Overview

本設計は、売主情報管理システムに「状況（売主）」フィールドを追加する機能を実装するためのものです。このフィールドは、売主の物件状況を9つの選択肢（居空更賃他古有駐事）から選択できるようにし、データベースへの永続化、UI表示、バリデーションを含む完全な実装を提供します。

既存のシステムアーキテクチャ（TypeScript、React、Material-UI、PostgreSQL）に統合され、既存の売主管理機能と一貫性を保ちます。

## Architecture

本機能は、既存の3層アーキテクチャに統合されます：

### Backend Layer
- **Database**: PostgreSQLの`properties`テーブルに新しいカラム`seller_status`を追加
- **Service Layer**: `SellerService.ts`を拡張して、売主状況の取得・更新をサポート
- **API Layer**: 既存の売主APIエンドポイント（GET/PUT `/sellers/:id`）を通じて売主状況を処理

### Frontend Layer
- **UI Components**: `SellerDetailPage.tsx`と`NewSellerPage.tsx`にドロップダウンセレクタを追加
- **Type Definitions**: `frontend/src/types/index.ts`に売主状況の型定義を追加
- **State Management**: Reactのローカルステートで売主状況の編集を管理

### Data Flow
1. ユーザーがUIで売主状況を選択
2. フロントエンドがバリデーションを実行
3. APIリクエストがバックエンドに送信
4. バックエンドがバリデーションを実行し、データベースを更新
5. 更新された売主情報がフロントエンドに返される

## Components and Interfaces

### Database Schema

`properties`テーブルに新しいカラムを追加：

```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS seller_status VARCHAR(10);
```

**seller_status**: 売主の状況を示す文字列（居、空、更、賃、他、古、有、駐、事のいずれか）

### Type Definitions

#### Backend Types (`backend/src/types/index.ts`)

```typescript
// PropertyInfo インターフェースに追加
export interface PropertyInfo {
  // ... 既存のフィールド
  sellerStatus?: string; // 状況（売主）: 居、空、更、賃、他、古、有、駐、事
}

// 売主状況の選択肢を定義
export const SELLER_STATUS_OPTIONS = [
  '居', // 居住中
  '空', // 空き家
  '更', // 更地
  '賃', // 賃貸中
  '他', // 他
  '古', // 古屋あり
  '有', // 有
  '駐', // 駐車場
  '事', // 事業用
] as const;

export type SellerStatusOption = typeof SELLER_STATUS_OPTIONS[number];
```

#### Frontend Types (`frontend/src/types/index.ts`)

```typescript
// PropertyInfo インターフェースに追加
export interface PropertyInfo {
  // ... 既存のフィールド
  sellerStatus?: string; // 状況（売主）
}

// 売主状況の選択肢
export const SELLER_STATUS_OPTIONS = [
  '居', // 居住中
  '空', // 空き家
  '更', // 更地
  '賃', // 賃貸中
  '他', // 他
  '古', // 古屋あり
  '有', // 有
  '駐', // 駐車場
  '事', // 事業用
] as const;
```

### API Interfaces

既存のAPIエンドポイントを使用：

**GET `/sellers/:id`**
- レスポンスに`property.sellerStatus`を含める

**PUT `/sellers/:id`**
- リクエストボディで`property.sellerStatus`を受け取る

**PUT `/properties/:id`**
- リクエストボディで`sellerStatus`を受け取る

### UI Components

#### SellerDetailPage.tsx

物件情報セクションに売主状況のドロップダウンを追加：

```typescript
<FormControl fullWidth>
  <InputLabel>状況（売主）</InputLabel>
  <Select
    value={editedSellerStatus}
    onChange={(e) => setEditedSellerStatus(e.target.value)}
    disabled={!editingProperty}
  >
    <MenuItem value="">
      <em>未選択</em>
    </MenuItem>
    {SELLER_STATUS_OPTIONS.map((option) => (
      <MenuItem key={option} value={option}>
        {option}
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

#### NewSellerPage.tsx

新規売主登録フォームの物件情報セクションに売主状況のドロップダウンを追加。

#### SellersPage.tsx

売主リストテーブルに売主状況のカラムを追加（オプション）。

## Data Models

### Database Model

**properties テーブル**

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| seller_status | VARCHAR(10) | NULL許可 | 売主の状況（居、空、更、賃、他、古、有、駐、事） |

### Application Model

**PropertyInfo**

```typescript
interface PropertyInfo {
  id?: string;
  sellerId: string;
  address: string;
  prefecture: string;
  city: string;
  propertyType: PropertyType;
  landArea?: number;
  buildingArea?: number;
  landAreaVerified?: number;
  buildingAreaVerified?: number;
  buildYear?: number;
  structure?: string;
  floorPlan?: string;
  floors?: number;
  rooms?: number;
  sellerStatus?: string; // 新規追加
  parking?: boolean;
  additionalInfo?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid status values only

*For any* seller status value submitted to the system, the system should only accept values that are in the set {居、空、更、賃、他、古、有、駐、事} or null/empty

**Validates: Requirements 4.1**

### Property 2: Status persistence

*For any* seller record with a status value, saving and then retrieving that record should return the same status value

**Validates: Requirements 2.1, 2.3**

### Property 3: Status display consistency

*For any* seller record with a status value, the displayed status in the UI should match the stored value in the database

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Empty status handling

*For any* seller record without a status value, the system should display an appropriate empty state indicator and allow the user to select a status

**Validates: Requirements 1.5, 3.4**

## Error Handling

### Validation Errors

**Frontend Validation**
- ドロップダウンから選択するため、無効な値の入力は防止される
- 空の値は許可される（オプショナルフィールド）

**Backend Validation**
- APIリクエストで受け取った`sellerStatus`が有効な選択肢のいずれかであることを確認
- 無効な値の場合、400 Bad Requestエラーを返す

```typescript
// バリデーション例
const VALID_SELLER_STATUS = ['居', '空', '更', '賃', '他', '古', '有', '駐', '事'];

if (sellerStatus && !VALID_SELLER_STATUS.includes(sellerStatus)) {
  throw new Error('Invalid seller status value');
}
```

### Database Errors

- データベース接続エラー: 500 Internal Server Error
- トランザクションエラー: ロールバックして500エラーを返す

### UI Error Handling

- APIエラーが発生した場合、ユーザーにエラーメッセージを表示
- 保存失敗時は、編集内容を保持してユーザーが再試行できるようにする

## Testing Strategy

### Unit Tests

**Backend Tests**
- `SellerService`の売主状況の保存・取得機能をテスト
- 有効な売主状況の値でデータベースに正しく保存されることを確認
- 無効な売主状況の値が拒否されることを確認
- 空の売主状況が正しく処理されることを確認

**Frontend Tests**
- ドロップダウンコンポーネントが正しくレンダリングされることを確認
- 9つの選択肢が全て表示されることを確認
- 選択した値が正しく状態に反映されることを確認

### Property-Based Tests

本機能では、fast-checkライブラリを使用してProperty-Based Testingを実装します。

**Property Test 1: Valid status values only**
- ランダムな文字列を生成し、有効な売主状況の値のみが受け入れられることを確認
- 無効な値は拒否されることを確認

**Property Test 2: Status persistence**
- ランダムな有効な売主状況を生成
- データベースに保存後、取得した値が同じであることを確認

**Property Test 3: Status display consistency**
- ランダムな売主レコードを生成
- UIに表示される売主状況がデータベースの値と一致することを確認

**Property Test 4: Empty status handling**
- 売主状況が未設定の売主レコードを生成
- UIが適切な空の状態を表示することを確認

### Integration Tests

- 売主詳細ページで売主状況を選択し、保存後に正しく表示されることを確認
- 新規売主登録時に売主状況を設定し、保存後に正しく表示されることを確認
- 売主リストページで売主状況が正しく表示されることを確認（実装する場合）

### Manual Testing Checklist

1. 売主詳細ページで売主状況のドロップダウンが表示されることを確認
2. 9つの選択肢が全て表示されることを確認
3. 選択肢を選択して保存し、ページをリロードして値が保持されることを確認
4. 空の状態から選択肢を選択できることを確認
5. 選択した値をクリアできることを確認（未選択に戻す）
6. 新規売主登録時に売主状況を設定できることを確認
7. エラーハンドリングが正しく動作することを確認

## Implementation Notes

### Database Migration

- マイグレーションファイルを作成して`properties`テーブルに`seller_status`カラムを追加
- 既存のデータには影響を与えない（NULL許可）
- ロールバックスクリプトも用意

### Backward Compatibility

- 既存の売主レコードは売主状況が未設定（NULL）の状態
- UIでは空の状態として表示され、ユーザーが後から設定可能
- 既存のAPIエンドポイントは変更せず、レスポンスに`sellerStatus`フィールドを追加

### Performance Considerations

- 売主状況は頻繁に検索される可能性があるため、インデックスを追加することを検討
- ただし、現時点では9つの選択肢のみなので、インデックスなしでも十分なパフォーマンスが期待できる

### Security Considerations

- 売主状況は個人情報ではないため、暗号化は不要
- ただし、認証されたユーザーのみがアクセスできるようにする（既存の認証機構を使用）

## Future Enhancements

- 売主状況による絞り込み機能を売主リストページに追加
- 売主状況の統計情報をダッシュボードに表示
- 売主状況の履歴を追跡する機能（変更履歴）
- 売主状況に応じた自動アクションやアラート機能
