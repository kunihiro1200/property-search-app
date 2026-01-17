# 設計ドキュメント: 買主詳細ナビゲーション修正

## 概要

このドキュメントは、買主詳細ページにおけるナビゲーションの一貫性を確保するための設計を定義します。現在、システムの一部でUUIDベースの`id`を使用しているため、`buyer_number`ベースのルーティングと不整合が発生しています。この設計では、システム全体で`buyer_number`を一貫して使用するように修正します。

## アーキテクチャ

### 現在の問題

1. **RelatedBuyersSection**: `id`(UUID)を使用してナビゲーションを試みているが、ルートは`buyer_number`を期待している
2. **UnifiedInquiryHistoryTable**: 同様に`id`を使用しているため、ナビゲーションが失敗する
3. **型定義の不一致**: 一部のインターフェースが`id`と`buyer_number`の両方を持っている

### 解決アプローチ

システム全体で`buyer_number`を主要な識別子として統一し、以下のレイヤーで一貫性を確保します:

1. **フロントエンドコンポーネント**: すべてのナビゲーションで`buyer_number`を使用
2. **ルーティング**: URLパラメータとして`buyer_number`を使用
3. **型定義**: TypeScriptインターフェースで`buyer_number`を強制
4. **APIエンドポイント**: すべてのエンドポイントで`buyer_number`を使用

## コンポーネントとインターフェース

### 1. RelatedBuyersSection コンポーネント

**場所**: `frontend/src/components/RelatedBuyersSection.tsx`

**現在の実装**:
```typescript
// 問題: idを使用している
onClick={() => navigate(`/buyers/${buyer.id}`)}
```

**修正後の実装**:
```typescript
// 解決: buyer_numberを使用
onClick={() => navigate(`/buyers/${buyer.buyer_number}`)}
```

**変更内容**:
- ナビゲーションロジックを`id`から`buyer_number`に変更
- `buyer_number`が存在しない場合のエラーハンドリングを追加
- クリック可能なリンクは`buyer_number`が存在する場合のみ表示

### 2. UnifiedInquiryHistoryTable コンポーネント

**場所**: `frontend/src/components/UnifiedInquiryHistoryTable.tsx`

**現在の実装**:
```typescript
// 問題: idを使用している
onClick={() => navigate(`/buyers/${inquiry.buyer?.id}`)}
```

**修正後の実装**:
```typescript
// 解決: buyer_numberを使用
onClick={() => navigate(`/buyers/${inquiry.buyer?.buyer_number}`)}
```

**変更内容**:
- ナビゲーションロジックを`id`から`buyer_number`に変更
- `buyer_number`が存在しない場合は、プレーンテキストとして表示
- オプショナルチェーンを使用して安全にアクセス

### 3. BuyerDetailPage コンポーネント

**場所**: `frontend/src/pages/BuyerDetailPage.tsx`

**現在の実装**:
```typescript
const { id } = useParams<{ id: string }>();
```

**修正後の実装**:
```typescript
const { buyer_number } = useParams<{ buyer_number: string }>();
```

**変更内容**:
- URLパラメータ名を`id`から`buyer_number`に変更
- パラメータの型定義を更新
- データ取得ロジックで`buyer_number`を使用

### 4. ルーティング設定

**場所**: `frontend/src/App.tsx`

**現在の実装**:
```typescript
<Route path="/buyers/:id" element={<BuyerDetailPage />} />
```

**修正後の実装**:
```typescript
<Route path="/buyers/:buyer_number" element={<BuyerDetailPage />} />
```

**変更内容**:
- ルートパラメータ名を`id`から`buyer_number`に変更
- 既存の`buyer_number`ベースのルートとの一貫性を確保

## データモデル

### Buyer インターフェース

**場所**: `frontend/src/types/index.ts`

**現在の定義**:
```typescript
export interface Buyer {
  id: string;  // UUID
  buyer_number: number;
  // ... その他のフィールド
}
```

**推奨される使用方法**:
- `buyer_number`: すべてのナビゲーションとAPI呼び出しで使用
- `id`: データベース内部でのみ使用（フロントエンドでは使用しない）

**変更内容**:
- インターフェース自体は変更しないが、使用方法を明確化
- すべてのコンポーネントで`buyer_number`を優先的に使用
- ドキュメントコメントで使用方法を明記

### InquiryHistory インターフェース

**場所**: `frontend/src/types/index.ts`

**現在の定義**:
```typescript
export interface InquiryHistory {
  buyer?: {
    id: string;
    buyer_number: number;
    name: string;
  };
  // ... その他のフィールド
}
```

**推奨される使用方法**:
- `buyer.buyer_number`: ナビゲーションに使用
- `buyer.name`: 表示に使用
- `buyer.id`: 使用しない

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: ナビゲーションURL一貫性

*すべての*買主ナビゲーション操作において、生成されるURLは`/buyers/{buyer_number}`の形式であり、`buyer_number`は有効な数値識別子である必要があります。

**検証要件**: 要件2.2, 要件3.2

### プロパティ2: buyer_number存在性チェック

*すべての*ナビゲーション可能な買主リンクにおいて、`buyer_number`が存在し、かつnullまたはundefinedでない場合にのみ、クリック可能なリンクとしてレンダリングされます。

**検証要件**: 要件2.4, 要件3.4

### プロパティ3: URLパラメータ解析一貫性

*すべての*買主詳細ページにおいて、URLから解析されるパラメータ名は`buyer_number`であり、その値は数値として検証されます。

**検証要件**: 要件4.1, 要件4.3

### プロパティ4: コンポーネント間データ伝達一貫性

*すべての*買主データを受け渡すコンポーネント間において、識別子として`buyer_number`が使用され、`id`(UUID)は使用されません。

**検証要件**: 要件5.3

### プロパティ5: API呼び出し識別子一貫性

*すべての*買主関連のAPI呼び出しにおいて、クエリパラメータまたはパスパラメータとして`buyer_number`が使用されます。

**検証要件**: 要件6.1, 要件6.2

## エラーハンドリング

### 1. buyer_number不在時の処理

**シナリオ**: 買主データに`buyer_number`が存在しない場合

**処理**:
- リンクをレンダリングせず、プレーンテキストとして表示
- コンソールに警告メッセージを出力（開発環境のみ）
- ユーザーには視覚的なフィードバックなし（リンクが表示されないだけ）

**実装例**:
```typescript
{buyer.buyer_number ? (
  <Link to={`/buyers/${buyer.buyer_number}`}>
    {buyer.name}
  </Link>
) : (
  <span>{buyer.name}</span>
)}
```

### 2. 無効なbuyer_numberの処理

**シナリオ**: URLパラメータとして無効な`buyer_number`が渡された場合

**処理**:
- 数値への変換を試み、失敗した場合はエラーページを表示
- エラーメッセージ: "無効な買主番号です"
- ユーザーを買主一覧ページに戻るリンクを提供

**実装例**:
```typescript
const buyerNumber = parseInt(buyer_number, 10);
if (isNaN(buyerNumber)) {
  return <ErrorPage message="無効な買主番号です" />;
}
```

### 3. 存在しないbuyer_numberの処理

**シナリオ**: 有効だが存在しない`buyer_number`でアクセスした場合

**処理**:
- API呼び出しが404を返す
- "買主が見つかりません"というメッセージを表示
- 買主一覧ページに戻るリンクを提供

## テスト戦略

### ユニットテスト

ユニットテストは、特定の例やエッジケースを検証するために使用します:

1. **RelatedBuyersSection**:
   - `buyer_number`が存在する場合、正しいURLが生成されることを確認
   - `buyer_number`が存在しない場合、リンクがレンダリングされないことを確認

2. **UnifiedInquiryHistoryTable**:
   - `buyer_number`が存在する場合、正しいURLが生成されることを確認
   - `buyer_number`が存在しない場合、プレーンテキストが表示されることを確認

3. **BuyerDetailPage**:
   - 有効な`buyer_number`でデータが正しく取得されることを確認
   - 無効な`buyer_number`でエラーが表示されることを確認

### プロパティベーステスト

プロパティベーステストは、すべての入力に対して普遍的なプロパティを検証するために使用します。各テストは最低100回の反復で実行します:

1. **プロパティ1のテスト**:
   - **タグ**: Feature: buyer-detail-navigation-fix, Property 1: ナビゲーションURL一貫性
   - *すべての*有効な`buyer_number`値に対して、生成されるURLが`/buyers/{buyer_number}`形式であることを検証

2. **プロパティ2のテスト**:
   - **タグ**: Feature: buyer-detail-navigation-fix, Property 2: buyer_number存在性チェック
   - *すべての*買主データオブジェクトに対して、`buyer_number`が存在する場合のみリンクがレンダリングされることを検証

3. **プロパティ3のテスト**:
   - **タグ**: Feature: buyer-detail-navigation-fix, Property 3: URLパラメータ解析一貫性
   - *すべての*URLパラメータに対して、`buyer_number`として正しく解析され、数値として検証されることを確認

4. **プロパティ4のテスト**:
   - **タグ**: Feature: buyer-detail-navigation-fix, Property 4: コンポーネント間データ伝達一貫性
   - *すべての*コンポーネント間のデータ伝達において、`buyer_number`が使用されることを検証

5. **プロパティ5のテスト**:
   - **タグ**: Feature: buyer-detail-navigation-fix, Property 5: API呼び出し識別子一貫性
   - *すべての*API呼び出しにおいて、`buyer_number`がパラメータとして使用されることを検証

### 統合テスト

1. **エンドツーエンドナビゲーション**:
   - 買主一覧から買主詳細へのナビゲーション
   - 関連買主セクションからのナビゲーション
   - 問い合わせ履歴テーブルからのナビゲーション

2. **エラーケース**:
   - 無効な`buyer_number`でのアクセス
   - 存在しない`buyer_number`でのアクセス

### テストライブラリ

- **ユニットテスト**: Jest + React Testing Library
- **プロパティベーステスト**: fast-check (TypeScript/JavaScript用のプロパティベーステストライブラリ)
- **統合テスト**: Playwright または Cypress

## 実装の優先順位

1. **高優先度**: RelatedBuyersSection と UnifiedInquiryHistoryTable の修正（ユーザーに直接影響）
2. **中優先度**: BuyerDetailPage のパラメータ名変更とエラーハンドリング
3. **低優先度**: 型定義のドキュメント化とコメント追加

## 後方互換性

この変更は、既存の`buyer_number`ベースのルーティングと完全に互換性があります。`id`ベースのルーティングは使用されていないため、破壊的変更はありません。

## パフォーマンスへの影響

この変更によるパフォーマンスへの影響はありません。単純な識別子の変更であり、追加の計算やネットワーク呼び出しは発生しません。
