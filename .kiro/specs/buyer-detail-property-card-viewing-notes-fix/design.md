# 設計ドキュメント

## 概要

買主詳細画面の物件詳細カード（PropertyInfoCardコンポーネント）に「内覧前伝達事項」フィールドを追加します。このフィールドは`buyer.pre_viewing_notes`から取得したデータを黄色系の背景色で強調表示し、読み取り専用として実装します。

## アーキテクチャ

### コンポーネント構造

```
BuyerDetailPage
  └── PropertyInfoCard (修正対象)
        └── 内覧前伝達事項フィールド (新規追加)
```

### データフロー

1. `BuyerDetailPage`が`buyer`オブジェクトを取得
2. `PropertyInfoCard`コンポーネントに`buyer`プロップとして渡す
3. `PropertyInfoCard`内で`buyer.pre_viewing_notes`を参照
4. データが存在する場合のみフィールドを表示

## コンポーネントとインターフェース

### PropertyInfoCardコンポーネント

**場所**: `frontend/src/components/PropertyInfoCard.tsx`

**既存のプロップス**:
```typescript
interface PropertyInfoCardProps {
  buyer: Buyer;
  // その他の既存プロップス
}
```

**使用するBuyerインターフェースのフィールド**:
```typescript
interface Buyer {
  // 既存フィールド
  pre_viewing_notes?: string | null;
  // その他のフィールド
}
```

### 新規フィールドコンポーネント

条件付きレンダリングを使用して、`pre_viewing_notes`が存在する場合のみ表示します。

```tsx
{buyer.pre_viewing_notes && (
  <div className="viewing-notes-field">
    <label>内覧前伝達事項</label>
    <div className="viewing-notes-content">
      {buyer.pre_viewing_notes}
    </div>
  </div>
)}
```

## データモデル

### Buyerオブジェクト

既存の`Buyer`型に`pre_viewing_notes`フィールドが含まれていることを前提とします。

```typescript
interface Buyer {
  id: string;
  name: string;
  // ... 他のフィールド
  pre_viewing_notes?: string | null;
}
```

**データソース**: 
- バックエンドAPIから取得される`buyer`オブジェクト
- データベースの`buyers`テーブルの`pre_viewing_notes`カラム

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。これは、人間が読める仕様と機械で検証可能な正確性保証との橋渡しとなります。*

### プロパティ1: データが存在する場合の表示

*任意の*buyerオブジェクトについて、`pre_viewing_notes`フィールドが空でない文字列の場合、PropertyInfoCardコンポーネントは「内覧前伝達事項」ラベルとその内容を表示する必要があります。

**検証: 要件1.2**

### プロパティ2: データが存在しない場合の非表示

*任意の*buyerオブジェクトについて、`pre_viewing_notes`フィールドがnull、undefined、または空文字列の場合、PropertyInfoCardコンポーネントは「内覧前伝達事項」フィールドを表示してはいけません。

**検証: 要件1.3**

### プロパティ3: 読み取り専用の保証

*任意の*表示された「内覧前伝達事項」フィールドについて、ユーザーがその内容を編集できないことを保証する必要があります。

**検証: 要件1.4**

### プロパティ4: スタイルの一貫性

*任意の*表示された「内覧前伝達事項」フィールドについて、背景色が#fff9e6であり、他のフィールドと同じ幅で表示される必要があります。

**検証: 要件2.1, 2.2**

### プロパティ5: データソースの正確性

*任意の*PropertyInfoCardコンポーネントのレンダリングについて、表示される内容は`buyer.pre_viewing_notes`の値と完全に一致する必要があります（XSSエスケープ処理を除く）。

**検証: 要件3.1, 3.3**

## エラーハンドリング

### ケース1: buyerプロップが存在しない

```typescript
if (!buyer) {
  return null; // または既存のエラー表示ロジック
}
```

**対応**: 要件3.2に基づき、エラーを発生させずに正常に動作します。

### ケース2: pre_viewing_notesがundefined/null

```typescript
{buyer.pre_viewing_notes && (
  // フィールドを表示
)}
```

**対応**: 条件付きレンダリングにより、フィールドは表示されません。

### ケース3: 長いテキスト

```css
.viewing-notes-content {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
```

**対応**: 要件4.4に基づき、長いテキストは適切に折り返されます。

## テスト戦略

### ユニットテスト

PropertyInfoCardコンポーネントの以下のシナリオをテストします：

1. **データ存在時の表示テスト**
   - `pre_viewing_notes`に値がある場合、フィールドが表示されることを確認
   - ラベルと内容が正しく表示されることを確認

2. **データ不在時の非表示テスト**
   - `pre_viewing_notes`がnullの場合、フィールドが表示されないことを確認
   - `pre_viewing_notes`が空文字列の場合、フィールドが表示されないことを確認
   - `pre_viewing_notes`がundefinedの場合、フィールドが表示されないことを確認

3. **スタイル適用テスト**
   - 背景色が#fff9e6であることを確認
   - 適切なクラス名が適用されていることを確認

4. **エッジケーステスト**
   - 非常に長いテキストが適切に表示されることを確認
   - 特殊文字が適切にエスケープされることを確認
   - buyerプロップがnullの場合、エラーが発生しないことを確認

### プロパティベーステスト

プロパティベーステストライブラリ（例：fast-check）を使用して、以下のプロパティを検証します：

**テスト設定**: 各プロパティテストは最低100回の反復を実行します。

#### プロパティテスト1: データ存在時の表示プロパティ

```typescript
// Feature: buyer-detail-property-card-viewing-notes-fix, Property 1: データが存在する場合の表示
test('任意の非空文字列に対して、フィールドが表示される', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      (preViewingNotes) => {
        const buyer = { pre_viewing_notes: preViewingNotes };
        const { container } = render(<PropertyInfoCard buyer={buyer} />);
        const field = container.querySelector('.viewing-notes-field');
        expect(field).toBeInTheDocument();
        expect(field).toHaveTextContent(preViewingNotes);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### プロパティテスト2: データ不在時の非表示プロパティ

```typescript
// Feature: buyer-detail-property-card-viewing-notes-fix, Property 2: データが存在しない場合の非表示
test('任意のnull/undefined/空文字列に対して、フィールドが表示されない', () => {
  fc.assert(
    fc.property(
      fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('')),
      (preViewingNotes) => {
        const buyer = { pre_viewing_notes: preViewingNotes };
        const { container } = render(<PropertyInfoCard buyer={buyer} />);
        const field = container.querySelector('.viewing-notes-field');
        expect(field).not.toBeInTheDocument();
      }
    ),
    { numRuns: 100 }
  );
});
```

#### プロパティテスト3: スタイル一貫性プロパティ

```typescript
// Feature: buyer-detail-property-card-viewing-notes-fix, Property 4: スタイルの一貫性
test('任意の非空文字列に対して、正しいスタイルが適用される', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1 }),
      (preViewingNotes) => {
        const buyer = { pre_viewing_notes: preViewingNotes };
        const { container } = render(<PropertyInfoCard buyer={buyer} />);
        const field = container.querySelector('.viewing-notes-field');
        const styles = window.getComputedStyle(field);
        expect(styles.backgroundColor).toBe('rgb(255, 249, 230)'); // #fff9e6
      }
    ),
    { numRuns: 100 }
  );
});
```

### 統合テスト

1. **BuyerDetailPageとの統合**
   - BuyerDetailPageから正しくpropsが渡されることを確認
   - 実際のAPIレスポンスを使用したエンドツーエンドテスト

2. **レスポンシブデザインテスト**
   - 異なる画面サイズでの表示を確認
   - モバイル、タブレット、デスクトップでの動作確認

## 実装の詳細

### CSSスタイル

```css
.viewing-notes-field {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #fff9e6;
  border-radius: 4px;
}

.viewing-notes-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.viewing-notes-content {
  color: #555;
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}
```

### 配置順序

「内覧前伝達事項」フィールドは、以下の位置に配置することを推奨します：

1. 物件基本情報（住所、価格など）の後
2. 他の重要な注意事項フィールドの近く
3. 視認性を確保するため、スクロールせずに見える位置

### アクセシビリティ

- `label`要素を使用してフィールドの目的を明確にする
- 適切なコントラスト比を確保（背景色#fff9e6と文字色のコントラスト）
- スクリーンリーダーでの読み上げを考慮した構造

## パフォーマンス考慮事項

- 条件付きレンダリングにより、不要なDOM要素の生成を回避
- 軽量なCSSスタイルのみを使用
- 既存のコンポーネント構造への影響を最小限に抑える

## セキュリティ考慮事項

- XSS攻撃を防ぐため、Reactのデフォルトのエスケープ処理を使用
- `dangerouslySetInnerHTML`は使用しない
- ユーザー入力データとして扱い、適切にサニタイズされていることを前提とする
