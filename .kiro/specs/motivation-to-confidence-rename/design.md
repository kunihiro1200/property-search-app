# 設計書

## 概要

売主管理システムにおいて、「売却意欲（motivation）」フィールドを「確度（confidence）」に統一する。データベースではmigration 021で既に`confidence`カラムへの変更が完了しているが、フロントエンドとバックエンドのコードでは依然として`motivation`が使用されている箇所が存在する。本設計では、システム全体で一貫した用語を使用するための変更を定義する。

## アーキテクチャ

### 影響範囲

1. **データベース層**: 既に完了（migration 021）
2. **バックエンド層**: 
   - 型定義（types/index.ts）
   - APIルート（routes/sellers.ts, routes/followUps.ts）
   - サービス層（services/SellerService.ts）
3. **フロントエンド層**:
   - 型定義（types/index.ts）
   - UIコンポーネント（NewSellerPage.tsx, SellerDetailPage.tsx, CallModePage.tsx, SellersPage.tsx）
   - ラベル表示

### 変更戦略

- データベースは既に`confidence`カラムを使用
- バックエンドとフロントエンドのコードを`confidence`に統一
- UIラベルを「売却意欲」から「確度」に変更
- 後方互換性のため、APIレスポンスでは両方のフィールドを一時的にサポート（非推奨警告付き）

## コンポーネントとインターフェース

### 1. 型定義の更新

#### バックエンド（backend/src/types/index.ts）

現状:
- `MotivationLevel` enumが存在しない（既に`ConfidenceLevel`に統一済み）
- `Seller`インターフェースで`motivation`プロパティが残っている可能性

変更:
- `Seller`インターフェースから`motivation`プロパティを完全に削除
- `confidence: ConfidenceLevel`のみを使用

#### フロントエンド（frontend/src/types/index.ts）

現状:
- `MotivationLevel` enumが存在しない（既に`ConfidenceLevel`に統一済み）
- `Seller`インターフェースで`motivation`プロパティが残っている可能性

変更:
- `Seller`インターフェースから`motivation`プロパティを完全に削除
- `confidence: ConfidenceLevel`のみを使用

### 2. UIコンポーネントの更新

#### NewSellerPage.tsx

現状:
```typescript
const [motivation, setMotivation] = useState('medium');
// ...
<TextField label="売却意欲" value={motivation} />
```

変更:
```typescript
const [confidence, setConfidence] = useState(ConfidenceLevel.B);
// ...
<TextField label="確度" value={confidence} />
```

#### SellerDetailPage.tsx

現状:
```typescript
const [editedMotivation, setEditedMotivation] = useState<MotivationLevel>(MotivationLevel.MEDIUM);
// ...
<InputLabel>売却意欲レベル</InputLabel>
<Select value={editedMotivation} onChange={(e) => setEditedMotivation(e.target.value as MotivationLevel)}>
  <MenuItem value={MotivationLevel.HIGH}>高</MenuItem>
  <MenuItem value={MotivationLevel.MEDIUM}>中</MenuItem>
  <MenuItem value={MotivationLevel.LOW}>低</MenuItem>
</Select>
```

変更:
```typescript
const [editedConfidence, setEditedConfidence] = useState<ConfidenceLevel>(ConfidenceLevel.B);
// ...
<InputLabel>確度</InputLabel>
<Select value={editedConfidence} onChange={(e) => setEditedConfidence(e.target.value as ConfidenceLevel)}>
  <MenuItem value={ConfidenceLevel.A}>A（売る気あり）</MenuItem>
  <MenuItem value={ConfidenceLevel.B}>B（売る気あるがまだ先）</MenuItem>
  <MenuItem value={ConfidenceLevel.B_PRIME}>B'（売る気は全く無い）</MenuItem>
  <MenuItem value={ConfidenceLevel.C}>C（電話が繋がらない）</MenuItem>
  <MenuItem value={ConfidenceLevel.D}>D（再建築不可）</MenuItem>
  <MenuItem value={ConfidenceLevel.E}>E（収益物件）</MenuItem>
  <MenuItem value={ConfidenceLevel.DUPLICATE}>ダブり</MenuItem>
</Select>
```

#### CallModePage.tsx

現状:
```typescript
<InputLabel>売却意欲</InputLabel>
<Select value={editedConfidence} ...>
```

変更:
```typescript
<InputLabel>確度</InputLabel>
<Select value={editedConfidence} ...>
```

#### SellersPage.tsx

現状:
```typescript
interface SellerRow {
  motivation?: string;
}
```

変更:
```typescript
interface SellerRow {
  confidence?: ConfidenceLevel;
}
```

### 3. バックエンドAPIの更新

#### routes/sellers.ts

- `motivation`フィールドの参照を`confidence`に変更
- レスポンスで`confidence`を返す

#### routes/followUps.ts

現状:
```typescript
/**
 * 売却意欲を更新
 */
router.put(...)
```

変更:
```typescript
/**
 * 確度を更新
 */
router.put(...)
```

#### services/SellerService.ts

- `motivation`フィールドの参照を`confidence`に変更
- データベースクエリで`confidence`カラムを使用

### 4. その他のファイル

#### routes/summarize.ts

現状:
```typescript
const motivationKeywords = ['興味', '検討中', '前向き', '売りたい', '考え中'];
const motivationText = extractContext(text, motivationKeywords);
// ...
if (motivationText) lines.push(`【売却意欲】${motivationText}`);
```

変更:
```typescript
const confidenceKeywords = ['興味', '検討中', '前向き', '売りたい', '考え中'];
const confidenceText = extractContext(text, confidenceKeywords);
// ...
if (confidenceText) lines.push(`【確度】${confidenceText}`);
```

## データモデル

### データベーススキーマ

既にmigration 021で完了:
```sql
ALTER TABLE sellers RENAME COLUMN confidence_level TO confidence;
ALTER TABLE sellers DROP COLUMN IF EXISTS motivation;
```

### 確度の値

```typescript
export enum ConfidenceLevel {
  A = 'A',           // 売る気あり
  B = 'B',           // 売る気あるがまだ先の話
  B_PRIME = 'B_PRIME', // 売る気は全く無い
  C = 'C',           // 電話が繋がらない
  D = 'D',           // 再建築不可
  E = 'E',           // 収益物件（アパート１棟等）
  DUPLICATE = 'DUPLICATE', // ダブり（重複している）
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や振る舞いのことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: フィールド名の一貫性

*全ての*コードファイルにおいて、売主の売却意欲を表すフィールドは`confidence`という名前を使用し、`motivation`という名前は使用されない
**検証: 要件1.2, 1.3**

### プロパティ2: UIラベルの一貫性

*全ての*UIコンポーネントにおいて、確度フィールドのラベルは「確度」と表示され、「売却意欲」とは表示されない
**検証: 要件1.5**

### プロパティ3: データ型の一貫性

*全ての*型定義において、確度フィールドは`ConfidenceLevel` enumを使用し、他の型は使用されない
**検証: 要件1.4**

### プロパティ4: データベースカラムの一貫性

*全ての*データベースクエリにおいて、確度を参照する際は`confidence`カラムを使用し、`motivation`カラムは使用されない
**検証: 要件1.1**

## エラーハンドリング

### 後方互換性

- 古いクライアントが`motivation`フィールドを送信した場合、バックエンドは自動的に`confidence`として処理
- APIレスポンスでは`confidence`のみを返す
- 非推奨の警告をログに記録

### バリデーション

- `confidence`フィールドは`ConfidenceLevel` enumの値のみを受け付ける
- 無効な値が送信された場合、400 Bad Requestを返す

## テスト戦略

### ユニットテスト

1. **型定義のテスト**
   - `Seller`インターフェースに`motivation`プロパティが存在しないことを確認
   - `confidence`プロパティが`ConfidenceLevel`型であることを確認

2. **UIコンポーネントのテスト**
   - NewSellerPage: `confidence`状態変数が正しく使用されていることを確認
   - SellerDetailPage: `editedConfidence`状態変数が正しく使用されていることを確認
   - UIラベルが「確度」と表示されることを確認

3. **APIのテスト**
   - `confidence`フィールドでデータを送信できることを確認
   - レスポンスに`confidence`フィールドが含まれることを確認

### プロパティベーステスト

本機能は主にリファクタリングであり、プロパティベーステストは不要。代わりに、以下の静的解析を実施:

1. **コード検索テスト**
   - `motivation`という文字列がコード内に残っていないことを確認（コメントとドキュメントを除く）
   - `MotivationLevel`という型が使用されていないことを確認

2. **型チェック**
   - TypeScriptコンパイラがエラーなくビルドできることを確認

### 統合テスト

1. **エンドツーエンドテスト**
   - 売主作成フローで`confidence`フィールドが正しく保存されることを確認
   - 売主詳細ページで`confidence`フィールドが正しく表示されることを確認
   - 売主更新フローで`confidence`フィールドが正しく更新されることを確認

## 実装の注意点

1. **段階的な移行**
   - フロントエンドとバックエンドを同時にデプロイする必要がある
   - デプロイ前に全てのテストが通ることを確認

2. **データの整合性**
   - データベースは既に`confidence`カラムを使用しているため、データ移行は不要

3. **ドキュメントの更新**
   - API仕様書を更新
   - ユーザーガイドを更新（「売却意欲」→「確度」）

4. **検索と置換の注意**
   - `motivation`を`confidence`に置換する際、コメントやドキュメント内の説明文も適切に更新
   - 変数名だけでなく、関連するコメントも更新
