# 設計ドキュメント：公開物件サイト検索バー統一

## 概要

公開物件サイトには現在、ヒーローセクションとフィルターセクションに2つの検索バーが存在し、ユーザーを混乱させています。この設計では、ヒーローセクションの検索バーを統一的な検索インターフェースとして強化し、フィルターセクションの重複する検索フィールドを削除します。

## アーキテクチャ

### コンポーネント構造

```
PublicPropertyListingPage
├── PublicPropertyHero (統一検索バー)
│   └── UnifiedSearchBar (新規)
└── PublicPropertyFilters (所在地検索フィールドを削除)
    ├── PropertyTypeFilter
    ├── PriceRangeFilter
    └── ActiveFiltersDisplay (検索クエリを含む)
```

### データフロー

1. ユーザーが検索バーに入力
2. 入力値を解析（物件番号 vs 所在地）
3. URLパラメータを更新
4. フィルター状態を更新
5. APIリクエストを実行
6. 結果を表示

## コンポーネントとインターフェース

### 1. UnifiedSearchBar コンポーネント

**場所**: `frontend/src/components/UnifiedSearchBar.tsx`

**Props**:
```typescript
interface UnifiedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}
```

**機能**:
- デバウンス処理（500ms）
- 入力値の自動検出（物件番号 vs 所在地）
- レスポンシブデザイン
- アクセシビリティ対応（ARIA属性）

### 2. SearchQueryDetector ユーティリティ

**場所**: `frontend/src/utils/searchQueryDetector.ts`

**インターフェース**:
```typescript
interface SearchQuery {
  type: 'property_number' | 'location';
  value: string;
}

function detectSearchType(query: string): SearchQuery;
```

**ロジック**:
- `AA`, `BB`, `CC` で始まる場合 → 物件番号検索
- それ以外 → 所在地検索

### 3. useUnifiedSearch カスタムフック

**場所**: `frontend/src/hooks/useUnifiedSearch.ts`

**インターフェース**:
```typescript
interface UseUnifiedSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  isSearching: boolean;
  searchType: 'property_number' | 'location' | null;
}

function useUnifiedSearch(): UseUnifiedSearchReturn;
```

**機能**:
- 検索状態管理
- URLパラメータとの同期
- デバウンス処理
- 検索タイプの自動検出

### 4. 更新された PublicPropertyFilters

**変更点**:
- 「所在地で検索」フィールドを削除
- アクティブフィルター表示に検索クエリを追加
- 検索クエリのクリアボタンを追加

## データモデル

### URL パラメータ

```typescript
interface PublicPropertySearchParams {
  q?: string;              // 検索クエリ（物件番号または所在地）
  type?: string;           // 物件タイプ
  minPrice?: number;       // 最低価格
  maxPrice?: number;       // 最高価格
  page?: number;           // ページ番号
}
```

### フィルター状態

```typescript
interface FilterState {
  searchQuery: string;
  searchType: 'property_number' | 'location' | null;
  propertyType: string | null;
  priceRange: {
    min: number | null;
    max: number | null;
  };
}
```

## 正確性プロパティ

*プロパティは、システムのすべての有効な実行において真であるべき特性または動作です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとして機能します。*

### プロパティ 1: 検索クエリの自動検出

*任意の* 検索クエリ文字列に対して、「AA」、「BB」、「CC」で始まる場合は物件番号検索として検出され、それ以外は所在地検索として検出される

**検証: 要件 1.1, 1.2**

### プロパティ 2: URL同期の一貫性

*任意の* 検索クエリに対して、検索を実行した後、URLパラメータ `q` に同じ値が含まれ、ページをリロードしても検索状態が保持される

**検証: 要件 1.4**

### プロパティ 3: アクティブフィルター表示

*任意の* 空でない検索クエリに対して、アクティブフィルター表示に検索クエリが表示され、削除ボタンをクリックすると検索クエリがクリアされる

**検証: 要件 1.3**

### プロパティ 4: デバウンス動作

*任意の* 連続した入力イベントに対して、最後の入力から500ms経過後に1回だけ検索が実行される

**検証: 要件 1.5**

### プロパティ 5: 検索結果の正確性

*任意の* 物件番号検索クエリに対して、返される結果は指定された物件番号を含む物件のみである

**検証: 要件 1.1**

### プロパティ 6: 検索結果の正確性（所在地）

*任意の* 所在地検索クエリに対して、返される結果は指定された所在地文字列を含む物件のみである

**検証: 要件 1.2**

## エラーハンドリング

### クライアント側エラー

1. **空の検索クエリ**
   - 動作: 検索を実行せず、すべての物件を表示
   - UI: エラーメッセージなし

2. **無効な物件番号形式**
   - 動作: 所在地検索として処理
   - UI: 結果が0件の場合、「該当する物件が見つかりませんでした」

3. **ネットワークエラー**
   - 動作: エラーメッセージを表示
   - UI: 「検索中にエラーが発生しました。もう一度お試しください。」

### サーバー側エラー

1. **データベースエラー**
   - レスポンス: 500 Internal Server Error
   - UI: 一般的なエラーメッセージ

2. **無効なクエリパラメータ**
   - レスポンス: 400 Bad Request
   - UI: 「検索条件が無効です」

## テスト戦略

### ユニットテスト

1. **SearchQueryDetector**
   - 物件番号の検出（AA, BB, CC で始まる）
   - 所在地の検出（AA, BB, CC で始まらない）
   - エッジケース（空文字列、特殊文字）

2. **useUnifiedSearch フック**
   - 検索状態の更新
   - URLパラメータの同期
   - デバウンス処理

3. **UnifiedSearchBar コンポーネント**
   - 入力イベントの処理
   - 検索ボタンのクリック
   - プレースホルダーの表示

### プロパティベーステスト

各プロパティテストは最低100回の反復で実行し、ランダムな入力で包括的なカバレッジを確保します。

**テスト 1: 検索クエリの自動検出**
- **タグ**: Feature: public-property-unified-search, Property 1: 検索クエリの自動検出
- **生成**: ランダムな文字列（「AA」、「BB」、「CC」で始まるものと始まらないもの）
- **検証**: 検出された検索タイプが期待通りであること

**テスト 2: URL同期の一貫性**
- **タグ**: Feature: public-property-unified-search, Property 2: URL同期の一貫性
- **生成**: ランダムな検索クエリ
- **検証**: 検索実行後、URLパラメータに同じ値が含まれること

**テスト 3: アクティブフィルター表示**
- **タグ**: Feature: public-property-unified-search, Property 3: アクティブフィルター表示
- **生成**: ランダムな空でない検索クエリ
- **検証**: アクティブフィルターに表示され、削除可能であること

**テスト 4: デバウンス動作**
- **タグ**: Feature: public-property-unified-search, Property 4: デバウンス動作
- **生成**: ランダムな連続入力イベント
- **検証**: 最後の入力から500ms後に1回だけ検索が実行されること

**テスト 5: 検索結果の正確性（物件番号）**
- **タグ**: Feature: public-property-unified-search, Property 5: 検索結果の正確性
- **生成**: ランダムな物件番号（「AA」、「BB」、「CC」で始まる）
- **検証**: 返される結果がすべて指定された物件番号を含むこと

**テスト 6: 検索結果の正確性（所在地）**
- **タグ**: Feature: public-property-unified-search, Property 6: 検索結果の正確性（所在地）
- **生成**: ランダムな所在地文字列
- **検証**: 返される結果がすべて指定された所在地を含むこと

### 統合テスト

1. **エンドツーエンド検索フロー**
   - ヒーローセクションで検索
   - 結果の表示確認
   - URLパラメータの確認
   - アクティブフィルターの確認

2. **フィルターとの連携**
   - 検索 + 物件タイプフィルター
   - 検索 + 価格範囲フィルター
   - 複数フィルターの組み合わせ

3. **ブラウザ互換性**
   - Chrome, Firefox, Safari, Edge
   - モバイルブラウザ

### プロパティベーステストライブラリ

- **フロントエンド**: `fast-check` (TypeScript/JavaScript用)
- **設定**: 各テストで最低100回の反復
- **タグ形式**: `Feature: public-property-unified-search, Property {番号}: {プロパティテキスト}`

## 実装の詳細

### フェーズ 1: コアコンポーネント

1. `SearchQueryDetector` ユーティリティの実装
2. `useUnifiedSearch` フックの実装
3. `UnifiedSearchBar` コンポーネントの実装

### フェーズ 2: 統合

1. `PublicPropertyHero` に `UnifiedSearchBar` を統合
2. `PublicPropertyFilters` から所在地検索フィールドを削除
3. アクティブフィルター表示に検索クエリを追加

### フェーズ 3: バックエンド対応

1. API エンドポイントの更新（必要に応じて）
2. 検索クエリパラメータの処理
3. データベースクエリの最適化

### フェーズ 4: テストとリファインメント

1. ユニットテストの実装
2. プロパティベーステストの実装
3. 統合テストの実装
4. パフォーマンステスト

## パフォーマンス考慮事項

1. **デバウンス**: 500ms のデバウンスで不要なAPIリクエストを削減
2. **キャッシング**: 同じ検索クエリの結果をキャッシュ
3. **インデックス**: データベースの検索フィールドにインデックスを作成
4. **ページネーション**: 大量の結果を効率的に処理

## アクセシビリティ

1. **ARIA属性**:
   - `role="search"` を検索フォームに追加
   - `aria-label` で検索バーの目的を説明
   - `aria-live="polite"` で検索結果の更新を通知

2. **キーボードナビゲーション**:
   - Enter キーで検索実行
   - Escape キーで検索クエリをクリア
   - Tab キーでフォーカス移動

3. **スクリーンリーダー対応**:
   - 検索結果の件数を読み上げ
   - エラーメッセージの読み上げ

## セキュリティ考慮事項

1. **入力サニタイゼーション**: XSS攻撃を防ぐため、すべての入力をサニタイズ
2. **SQLインジェクション対策**: パラメータ化されたクエリを使用
3. **レート制限**: 過度な検索リクエストを防ぐ

## 今後の拡張

1. **検索候補**: 入力中に検索候補を表示
2. **検索履歴**: ユーザーの検索履歴を保存・表示
3. **高度な検索**: 複数条件の組み合わせ検索
4. **音声検索**: 音声入力による検索
