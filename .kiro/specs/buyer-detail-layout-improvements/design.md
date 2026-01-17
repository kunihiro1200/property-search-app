# Design Document

## Overview

買主詳細ページ (BuyerDetailPage) のレイアウトを改善し、伝達事項セクションの視認性を向上させ、重複コンテンツを削除する。

## Architecture

フロントエンドのみの変更:
- `frontend/src/pages/BuyerDetailPage.tsx` の修正
- CSSスタイリングの追加

## Components and Interfaces

### Modified Components

**BuyerDetailPage.tsx**
- 伝達事項セクションに背景色を追加
- 重複している内覧前伝達事項セクションを削除

### Styling Changes

```typescript
// 薄黄色の背景スタイル
const highlightedSectionStyle = {
  backgroundColor: '#fffbea', // 薄黄色
  padding: '16px',
  borderRadius: '4px',
  marginBottom: '16px'
};
```

## Data Models

既存のデータモデルに変更なし。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Background color consistency
*For any* buyer detail page render, the "伝達事項" and "内覧前伝達事項" sections should have a light yellow background color (#fffbea)
**Validates: Requirements 1.1, 1.2**

### Property 2: Single section instance
*For any* buyer detail page render, there should be exactly one instance of the "内覧前伝達事項" section
**Validates: Requirements 2.1, 2.2**

## Error Handling

変更は表示のみのため、特別なエラーハンドリングは不要。

## Testing Strategy

### Unit Tests
- コンポーネントが正しいスタイルでレンダリングされることを確認
- 重複セクションが存在しないことを確認

### Manual Testing
- ブラウザで買主詳細ページを開き、視覚的に確認
- 背景色が適切に表示されることを確認
- 重複セクションが削除されていることを確認
