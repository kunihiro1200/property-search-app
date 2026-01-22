# Design Document

## Overview

このドキュメントは、全てのリストページにおいて、ページネーションコントロールをリストの上部にも追加する機能の設計を定義します。現在、Material-UIの`TablePagination`コンポーネントがテーブルの下部にのみ配置されていますが、ユーザビリティ向上のため、同じコントロールをテーブルの上部にも配置します。

## Architecture

### Component Structure

```
ListPage (e.g., SellersPage, BuyersPage, etc.)
├── Container
│   ├── Header
│   ├── PageNavigation
│   ├── Sidebar (filters)
│   └── MainContent
│       ├── SearchBar
│       ├── TopPagination (NEW)
│       ├── TableContainer
│       │   ├── Table
│       │   └── BottomPagination (EXISTING)
```

### Design Principles

1. **Single Source of Truth**: ページネーション状態は親コンポーネントで管理し、上部と下部のコントロールで共有
2. **Component Reusability**: Material-UIの`TablePagination`コンポーネントを再利用
3. **State Synchronization**: 上部と下部のコントロールは常に同期された状態を表示
4. **Minimal Code Changes**: 既存のコードへの影響を最小限に抑える

## Components and Interfaces

### Existing State (No Changes Required)

各リストページは既に以下の状態を管理しています:

```typescript
const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(50);
const [total, setTotal] = useState(0);

const handleChangePage = (_event: unknown, newPage: number) => {
  setPage(newPage);
};

const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
  setRowsPerPage(parseInt(event.target.value, 10));
  setPage(0);
};
```

### Implementation Approach

既存の`TablePagination`コンポーネントを複製して上部に配置します。両方のインスタンスは同じstate変数とイベントハンドラーを使用するため、自動的に同期されます。

```typescript
// Top Pagination (NEW)
<TablePagination
  rowsPerPageOptions={[25, 50, 100]}
  component="div"
  count={total}
  rowsPerPage={rowsPerPage}
  page={page}
  onPageChange={handleChangePage}
  onRowsPerPageChange={handleChangeRowsPerPage}
  labelRowsPerPage="表示件数:"
  labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
/>

// Table with data
<TableContainer component={Paper}>
  <Table>
    {/* ... table content ... */}
  </Table>
  
  // Bottom Pagination (EXISTING - no changes)
  <TablePagination
    rowsPerPageOptions={[25, 50, 100]}
    component="div"
    count={total}
    rowsPerPage={rowsPerPage}
    page={page}
    onPageChange={handleChangePage}
    onRowsPerPageChange={handleChangeRowsPerPage}
    labelRowsPerPage="表示件数:"
    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
  />
</TableContainer>
```

## Data Models

既存のデータモデルに変更はありません。各ページは既に以下の構造を持っています:

```typescript
interface PaginationState {
  page: number;           // 現在のページ番号 (0-indexed)
  rowsPerPage: number;    // 1ページあたりの表示件数
  total: number;          // 全体のアイテム数
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: State Synchronization

*For any* list page with top and bottom pagination controls, when a user interacts with either control, both controls should display identical state values (page number, rows per page, and displayed range).

**Validates: Requirements 1.3, 1.4, 1.5, 2.4, 2.5**

### Property 2: Functional Equivalence

*For any* pagination control interaction (changing page size or navigating pages), the result should be identical regardless of whether the user interacts with the top or bottom control.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Visual Consistency

*For any* list page, the top pagination control should render with the same styling, layout, and component structure as the bottom pagination control.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Universal Application

*For any* list page in the application (SellersPage, BuyersPage, PropertyListingsPage, WorkTasksPage, etc.), top pagination controls should be present and functional.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

## Error Handling

### Potential Issues and Solutions

1. **State Desynchronization**
   - **Issue**: 上部と下部のコントロールが異なる状態を表示する
   - **Solution**: 両方のコンポーネントが同じstate変数を参照することで、Reactの再レンダリングメカニズムにより自動的に同期される
   - **Prevention**: 状態管理を親コンポーネントで一元化

2. **Performance Impact**
   - **Issue**: 追加のコンポーネントによるレンダリングパフォーマンスへの影響
   - **Solution**: `TablePagination`は軽量なコンポーネントであり、既存のパフォーマンスへの影響は最小限
   - **Monitoring**: 大量データ(1000件以上)のページで動作確認

3. **Responsive Layout Issues**
   - **Issue**: 小さい画面サイズでのレイアウト崩れ
   - **Solution**: Material-UIの`TablePagination`は既にレスポンシブ対応されている
   - **Testing**: モバイル、タブレット、デスクトップの各サイズで動作確認

## Testing Strategy

### Unit Testing

このフィーチャーは主にUIコンポーネントの配置に関するものであり、新しいロジックは追加されません。既存のページネーションロジックは既にテスト済みです。

### Manual Testing Checklist

各リストページで以下を確認:

1. **表示確認**
   - [ ] 上部ページネーションが表示される
   - [ ] 下部ページネーションが表示される
   - [ ] 両方が同じ情報を表示している

2. **機能確認**
   - [ ] 上部の表示件数変更が動作する
   - [ ] 下部の表示件数変更が動作する
   - [ ] 上部のページ移動ボタンが動作する
   - [ ] 下部のページ移動ボタンが動作する

3. **同期確認**
   - [ ] 上部で表示件数を変更すると下部も更新される
   - [ ] 下部で表示件数を変更すると上部も更新される
   - [ ] 上部でページを移動すると下部も更新される
   - [ ] 下部でページを移動すると上部も更新される

4. **レスポンシブ確認**
   - [ ] デスクトップ(1920x1080)で正常に表示される
   - [ ] タブレット(768x1024)で正常に表示される
   - [ ] モバイル(375x667)で正常に表示される

### Target Pages

以下の全てのページで上記のテストを実施:

1. SellersPage (`/sellers`)
2. BuyersPage (`/buyers`)
3. PropertyListingsPage (`/property-listings`)
4. WorkTasksPage (`/work-tasks`)
5. CallHistoryPage (`/call-history`) - if applicable
6. ActivityLogsPage (`/activity-logs`) - if applicable

## Implementation Details

### File Changes Required

各リストページファイルで以下の変更を実施:

1. **SellersPage.tsx**
   - 検索バーの直後、`TableContainer`の直前に`TablePagination`を追加

2. **BuyersPage.tsx**
   - 検索バーの直後、`TableContainer`の直前に`TablePagination`を追加

3. **PropertyListingsPage.tsx**
   - 検索バーの直後、`TableContainer`の直前に`TablePagination`を追加

4. **WorkTasksPage.tsx**
   - 検索バーの直後、`TableContainer`の直前に`TablePagination`を追加

### Code Pattern

各ページで以下のパターンを適用:

```typescript
{/* 検索バー */}
<Paper sx={{ p: 2, mb: 2 }}>
  <TextField ... />
</Paper>

{/* 上部ページネーション - NEW */}
<Box sx={{ mb: 2 }}>
  <Paper>
    <TablePagination
      rowsPerPageOptions={[25, 50, 100]}
      component="div"
      count={total}
      rowsPerPage={rowsPerPage}
      page={page}
      onPageChange={handleChangePage}
      onRowsPerPageChange={handleChangeRowsPerPage}
      labelRowsPerPage="表示件数:"
      labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
    />
  </Paper>
</Box>

{/* テーブル */}
<TableContainer component={Paper}>
  <Table>
    {/* ... */}
  </Table>
  
  {/* 下部ページネーション - EXISTING */}
  <TablePagination ... />
</TableContainer>
```

### Styling Considerations

- 上部ページネーションは`Paper`コンポーネントでラップして、テーブルと同じ視覚的スタイルを維持
- `mb: 2`のマージンでテーブルとの適切な間隔を確保
- 既存の下部ページネーションのスタイルは変更しない

## Performance Considerations

### Rendering Performance

- `TablePagination`コンポーネントの追加によるレンダリングコストは最小限
- 両方のインスタンスは同じpropsを受け取るため、Reactのメモ化により効率的にレンダリングされる
- 大量データ(1000件以上)のページでもパフォーマンスへの影響は無視できるレベル

### Memory Impact

- 追加のコンポーネントインスタンスによるメモリ使用量の増加は微小
- 状態は親コンポーネントで一元管理されるため、重複したデータ保持は発生しない

## Accessibility

Material-UIの`TablePagination`コンポーネントは既にアクセシビリティ対応されています:

- キーボードナビゲーション対応
- スクリーンリーダー対応
- ARIA属性の適切な設定

上部と下部の両方のコントロールが同じアクセシビリティ機能を提供します。

## Browser Compatibility

Material-UIがサポートする全てのブラウザで動作します:

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## Migration Strategy

### Phase 1: Implementation
1. SellersPageに上部ページネーションを追加
2. 動作確認とテスト
3. 問題がなければ他のページに展開

### Phase 2: Rollout
1. BuyersPageに適用
2. PropertyListingsPageに適用
3. WorkTasksPageに適用
4. その他のリストページに適用

### Phase 3: Validation
1. 全ページで手動テスト実施
2. ユーザーフィードバック収集
3. 必要に応じて微調整

## Future Enhancements

将来的な改善案:

1. **共通コンポーネント化**
   - 上部と下部のページネーションを含むリストコンテナコンポーネントの作成
   - コードの重複を削減し、保守性を向上

2. **カスタマイズオプション**
   - ページネーションの表示/非表示を制御するオプション
   - 位置(上部のみ、下部のみ、両方)を選択可能に

3. **パフォーマンス最適化**
   - 仮想スクロールの導入による大量データの効率的な表示
   - ページネーションコンポーネントのメモ化

## Dependencies

- Material-UI (@mui/material): 既存の依存関係、バージョン変更なし
- React: 既存の依存関係、バージョン変更なし

新しい依存関係の追加は不要です。
