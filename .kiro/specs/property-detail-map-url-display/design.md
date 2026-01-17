# Design Document

## Overview

物件詳細ページ（PropertyListingDetailPage）の「地図　サイトURL等」セクションに、SUUMO URLを追加表示します。格納先URLは既に実装されているため、SUUMO URLのみを追加します。

既存のコードでは、`google_map_url`と`storage_location`が表示されています。同じパターンで`suumo_url`を追加することで、一貫性のあるUIを維持します。

## Architecture

### Component Structure

```
PropertyListingDetailPage
  └── Paper (地図、サイトURL等)
      └── Grid Container
          ├── Google Map URL (既存)
          ├── SUUMO URL (新規追加)
          └── 格納先URL (既存)
```

### Data Flow

1. PropertyListingDetailPageコンポーネントがマウントされる
2. `fetchPropertyData()`が呼ばれ、APIから物件データを取得
3. 取得したデータに`suumo_url`フィールドが含まれる
4. `suumo_url`が存在する場合、「地図　サイトURL等」セクションに表示される
5. ユーザーがリンクをクリックすると、新しいタブでSUUMOページが開く

## Components and Interfaces

### PropertyListing Interface (既存)

```typescript
interface PropertyListing {
  // ... 既存のフィールド
  google_map_url?: string;
  storage_location?: string;
  suumo_url?: string; // 既に定義済み
  // ... その他のフィールド
}
```

### UI Component

「地図　サイトURL等」セクション内に、以下の順序でURLを表示：

1. GoogleマップURL（既存）
2. **SUUMO URL（新規追加）**
3. 格納先URL（既存）

各URLフィールドは以下の構造：
- ラベル（Typography）: フィールド名を表示
- リンク（Link）: URLを表示し、クリックで新しいタブで開く

## Data Models

### Database Schema

既存のテーブル `property_listings` に `suumo_url` フィールドが存在：

```sql
CREATE TABLE property_listings (
  -- ... 既存のカラム
  suumo_url TEXT,
  -- ... その他のカラム
);
```

### API Response

GET `/api/property-listings/:propertyNumber` のレスポンスに `suumo_url` が含まれる：

```typescript
{
  id: number;
  property_number: string;
  // ... 既存のフィールド
  google_map_url?: string;
  suumo_url?: string;
  storage_location?: string;
  // ... その他のフィールド
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptence Criteria Testing Prework:

1.1. WHEN the property detail page loads AND the property has a SUUMO URL THEN the System SHALL display the SUUMO URL in the "地図　サイトURL等" section
Thoughts: これは特定のデータ状態（SUUMO URLが存在する）での表示動作をテストしています。任意の物件データに対して、suumo_urlフィールドが存在する場合、そのURLが表示されることを確認できます。
Testable: yes - property

1.2. WHEN a user clicks on the displayed SUUMO URL THEN the System SHALL open the SUUMO page in a new browser tab
Thoughts: これはリンクの動作をテストしています。MUIのLinkコンポーネントに`target="_blank"`と`rel="noopener noreferrer"`が設定されていることを確認することで検証できます。
Testable: yes - example

1.3. WHEN the property does not have a SUUMO URL THEN the System SHALL not display the SUUMO URL field in the section
Thoughts: これは条件付き表示のテストです。任意の物件データに対して、suumo_urlフィールドが存在しない場合、そのフィールドが表示されないことを確認できます。
Testable: yes - property

1.4. WHEN displaying the SUUMO URL THEN the System SHALL show a clear label "SUUMO URL" above the link
Thoughts: これは表示されるラベルテキストの検証です。SUUMO URLが表示される場合、正しいラベルが表示されることを確認できます。
Testable: yes - example

2.1. WHEN the property detail page loads AND the property has a storage location URL THEN the System SHALL display the storage location URL in the "地図　サイトURL等" section
Thoughts: これは既存機能のテストです。既に実装されているため、新規実装の対象外です。
Testable: no (already implemented)

2.2. WHEN a user clicks on the displayed storage location URL THEN the System SHALL open the URL in a new browser tab
Thoughts: これは既存機能のテストです。既に実装されているため、新規実装の対象外です。
Testable: no (already implemented)

2.3. WHEN the property does not have a storage location URL THEN the System SHALL not display the storage location URL field in the section
Thoughts: これは既存機能のテストです。既に実装されているため、新規実装の対象外です。
Testable: no (already implemented)

2.4. WHEN displaying the storage location URL THEN the System SHALL show a clear label "格納先URL" above the link
Thoughts: これは既存機能のテストです。既に実装されているため、新規実装の対象外です。
Testable: no (already implemented)

3.1. WHEN displaying SUUMO URL and storage location URL THEN the System SHALL use the same styling and layout as existing URL fields in the section
Thoughts: これはスタイリングの一貫性をテストしています。既存のURL表示パターンと同じスタイルが適用されていることを確認できます。
Testable: yes - example

3.2. WHEN multiple URL fields are present THEN the System SHALL display them in a logical order within the "地図　サイトURL等" section
Thoughts: これは表示順序のテストです。Google Map URL、SUUMO URL、格納先URLの順で表示されることを確認できます。
Testable: yes - example

3.3. WHEN the URLs are long THEN the System SHALL handle text overflow appropriately to maintain layout integrity
Thoughts: これはレイアウトの堅牢性をテストしています。長いURLでもレイアウトが崩れないことを確認できます。既存のURL表示で`wordBreak: 'break-all'`が使用されているため、同じスタイルを適用することで対応できます。
Testable: yes - edge-case

3.4. WHEN hovering over a URL link THEN the System SHALL provide visual feedback consistent with other links in the application
Thoughts: これはMUIのLinkコンポーネントのデフォルト動作です。特別な実装は不要です。
Testable: no

### Property Reflection

プロパティの冗長性を確認：

- Property 1.1（SUUMO URLが存在する場合の表示）とProperty 1.3（SUUMO URLが存在しない場合の非表示）は、条件付きレンダリングの両面をテストしているため、両方必要です。
- Property 3.1（スタイリングの一貫性）とProperty 3.2（表示順序）は異なる側面をテストしているため、両方必要です。
- Property 3.3（長いURLの処理）はエッジケースとして重要です。

冗長性は見られないため、すべてのプロパティを維持します。

### Correctness Properties

Property 1: SUUMO URL conditional display
*For any* property listing data, if the `suumo_url` field is present and non-empty, then the SUUMO URL should be displayed in the "地図　サイトURL等" section with the label "SUUMO URL"
**Validates: Requirements 1.1, 1.4**

Property 2: SUUMO URL absence handling
*For any* property listing data, if the `suumo_url` field is absent or empty, then the SUUMO URL field should not be rendered in the "地図　サイトURL等" section
**Validates: Requirements 1.3**

Property 3: URL display consistency
*For any* URL field (Google Map, SUUMO, Storage Location) that is displayed, the styling and layout should match the existing pattern with Typography label and Link component
**Validates: Requirements 3.1**

## Error Handling

### Missing Data

- SUUMO URLが存在しない場合、そのフィールドは表示されない（条件付きレンダリング）
- すべてのURLフィールドが存在しない場合、「URLが登録されていません」というメッセージが表示される（既存の実装）

### Invalid URLs

- URLの妥当性チェックはバックエンドで行われる想定
- フロントエンドでは、提供されたURLをそのまま表示
- ブラウザのデフォルト動作により、無効なURLはエラーページに遷移

### Network Errors

- データ取得時のエラーは既存のエラーハンドリング機構で処理される
- Snackbarでエラーメッセージを表示

## Testing Strategy

### Unit Testing

以下の具体的なケースをテスト：

1. **SUUMO URL link opens in new tab**: リンクに`target="_blank"`と`rel="noopener noreferrer"`属性が設定されていることを確認
2. **Correct label display**: SUUMO URLが表示される場合、ラベルが"SUUMO URL"であることを確認
3. **Styling consistency**: SUUMO URLのスタイルが既存のURL表示と一致することを確認（`wordBreak: 'break-all'`, `fontSize: '0.9rem'`）
4. **Display order**: Google Map URL、SUUMO URL、格納先URLの順で表示されることを確認

### Property-Based Testing

Property-based testingライブラリ: **@fast-check/jest** (React/TypeScript環境で推奨)

各プロパティは100回以上のランダムな入力で検証：

1. **Property 1 (SUUMO URL conditional display)**: ランダムな物件データを生成し、`suumo_url`が存在する場合に正しく表示されることを検証
2. **Property 2 (SUUMO URL absence handling)**: ランダムな物件データを生成し、`suumo_url`が存在しない場合に表示されないことを検証
3. **Property 3 (URL display consistency)**: ランダムなURL文字列を生成し、すべてのURLフィールドが同じスタイルで表示されることを検証

### Manual Testing

1. SUUMO URLが存在する物件データで、正しく表示されることを確認
2. SUUMO URLが存在しない物件データで、フィールドが表示されないことを確認
3. 非常に長いSUUMO URLで、レイアウトが崩れないことを確認
4. リンクをクリックして、新しいタブでSUUMOページが開くことを確認

## Implementation Notes

### Existing Code Pattern

既存のURL表示パターン（Google Map URL、格納先URL）：

```tsx
{data.google_map_url && (
  <Grid item xs={12}>
    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
      GoogleマップURL
    </Typography>
    <Link
      href={data.google_map_url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ wordBreak: 'break-all', fontSize: '0.9rem' }}
    >
      {data.google_map_url}
    </Link>
  </Grid>
)}
```

### New Code Pattern

SUUMO URLの表示（同じパターンを踏襲）：

```tsx
{data.suumo_url && (
  <Grid item xs={12}>
    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 0.5 }}>
      SUUMO URL
    </Typography>
    <Link
      href={data.suumo_url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ wordBreak: 'break-all', fontSize: '0.9rem' }}
    >
      {data.suumo_url}
    </Link>
  </Grid>
)}
```

### Insertion Point

「地図　サイトURL等」セクション内で、Google Map URLの後、格納先URLの前に挿入します。

## Dependencies

- React
- Material-UI (MUI)
- TypeScript
- 既存のAPI endpoint: `/api/property-listings/:propertyNumber`

## Performance Considerations

- 追加のAPIリクエストは不要（既存のデータ取得に含まれる）
- 条件付きレンダリングにより、不要なDOM要素は生成されない
- パフォーマンスへの影響は最小限
