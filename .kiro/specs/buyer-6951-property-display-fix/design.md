# 買主6951の物件情報表示とサイドバーステータス修正 - 設計書

## 概要

買主6951において、以下の2つの問題を修正します：
1. 物件情報が表示されない問題（`buyer_id`の誤用）
2. サイドバーステータスが正しく表示されない問題（調査が必要）

## アーキテクチャ

### 現在の実装

```
フロントエンド (BuyerDetailPage.tsx)
  ↓ GET /api/buyers/6951/properties
バックエンド (buyers.ts)
  ↓ buyer_number → buyer_id変換（❌ 問題箇所）
BuyerService.getLinkedProperties(buyer_id)
  ↓ buyer_idで検索（❌ 問題箇所）
buyers テーブル
  ↓ property_number取得
property_listings テーブル
  ↓ 物件情報取得
フロントエンド
```

### 修正後の実装

```
フロントエンド (BuyerDetailPage.tsx)
  ↓ GET /api/buyers/6951/properties
バックエンド (buyers.ts)
  ↓ buyer_numberをそのまま渡す（✅ 修正）
BuyerService.getLinkedProperties(buyer_number)
  ↓ buyer_numberで検索（✅ 修正）
buyers テーブル
  ↓ property_number取得
property_listings テーブル
  ↓ 物件情報取得
フロントエンド
```

## 問題1: 物件情報が表示されない

### 根本原因

**ステアリングドキュメント違反**:
- ✅ **`buyer_number`が主キー**
- ❌ **`buyer_id`は存在すら不要**（データベースに存在しても、アプリケーションでは完全に無視する）

**現在の実装の問題**:
1. `backend/src/routes/buyers.ts`の`GET /:id/properties`エンドポイント：
   - `buyer_number`を受け取る
   - `buyer_id`に変換している（❌ 不要な処理）
   - `getLinkedProperties(buyer_id)`を呼び出している

2. `backend/src/services/BuyerService.ts`の`getLinkedProperties()`メソッド：
   - `buyer_id`を受け取る
   - `getById(buyer_id)`で買主を検索（❌ `buyer_id`で検索）
   - `buyer_id`がNULLの場合、買主が見つからない

### 解決策

#### 修正1: `getLinkedProperties`メソッドのシグネチャ変更

**変更前**:
```typescript
async getLinkedProperties(buyerId: string): Promise<any[]> {
  const buyer = await this.getById(buyerId); // ❌ buyer_idで検索
  // ...
}
```

**変更後**:
```typescript
async getLinkedProperties(buyerNumber: string): Promise<any[]> {
  const buyer = await this.getByBuyerNumber(buyerNumber); // ✅ buyer_numberで検索
  // ...
}
```

#### 修正2: APIエンドポイントの修正

**変更前**:
```typescript
router.get('/:id/properties', async (req: Request, res: Response) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  let buyerId = id;
  if (!isUuid) {
    const buyer = await buyerService.getByBuyerNumber(id);
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    buyerId = buyer.buyer_id; // ❌ buyer_idに変換
  }
  
  const properties = await buyerService.getLinkedProperties(buyerId); // ❌ buyer_idを渡す
  res.json(properties);
});
```

**変更後**:
```typescript
router.get('/:id/properties', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // buyer_numberをそのまま使用（UUIDチェック不要）
  const properties = await buyerService.getLinkedProperties(id); // ✅ buyer_numberを渡す
  res.json(properties);
});
```

### 影響範囲

**変更が必要なファイル**:
1. `backend/src/services/BuyerService.ts`
   - `getLinkedProperties()`メソッドのシグネチャ変更
   - `buyerId` → `buyerNumber`に変更
   - `getById()` → `getByBuyerNumber()`に変更

2. `backend/src/routes/buyers.ts`
   - `GET /:id/properties`エンドポイントの修正
   - UUID判定とbuyer_id変換を削除
   - `buyer_number`をそのまま渡す

**影響を受ける可能性のあるファイル**:
- `frontend/src/pages/BuyerDetailPage.tsx`（変更不要、APIレスポンスは同じ）
- `frontend/src/components/PropertyInfoCard.tsx`（変更不要）

### 後方互換性

**既存のURL**:
- `/api/buyers/6951/properties` ← 買主番号（変更なし）
- `/api/buyers/{uuid}/properties` ← UUID（削除、使用されていない）

**判断**:
- UUIDでのアクセスは使用されていない（買主番号のみ使用）
- UUID判定を削除しても影響なし

## 問題2: サイドバーステータスが正しく表示されない

### 調査結果

**ステータス判定ロジック**:
- `backend/src/services/BuyerStatusCalculator.ts`
- Priority 3: 「業者問合せあり」
- 条件: `broker_survey === '未'`

**判定コード**:
```typescript
// Priority 3: 業者問合せあり
// [業者向けアンケート] = "未"
if (equals(buyer.broker_survey, '未')) {
  return {
    status: '業者問合せあり',
    priority: 3,
    matchedCondition: '業者向けアンケート = 未',
  };
}
```

### 調査が必要な項目

1. **買主6951のデータ確認**:
   - `broker_survey`フィールドの値を確認
   - 実際に「未」が入っているか確認

2. **サイドバーの実装確認**:
   - `frontend/src/pages/BuyerListPage.tsx`
   - サイドバーが`BuyerStatusCalculator`を使用しているか確認
   - ステータスカテゴリの表示ロジックを確認

3. **ステータス計算のタイミング確認**:
   - 買主一覧取得時にステータスが計算されているか確認
   - `withStatus=true`パラメータが必要か確認

### 解決策（仮説）

**仮説1: データの問題**
- `broker_survey`フィールドが空欄またはNULL
- 解決策: データを修正

**仮説2: ステータス計算が実行されていない**
- 買主一覧取得時に`withStatus=true`パラメータが必要
- 解決策: フロントエンドで`withStatus=true`を追加

**仮説3: サイドバーの実装問題**
- サイドバーが「業者問合せあり」カテゴリを表示していない
- 解決策: サイドバーに「業者問合せあり」カテゴリを追加

## データモデル

### buyers テーブル

```typescript
interface Buyer {
  buyer_number: string;        // 主キー（買主番号）
  buyer_id?: string | null;    // 存在すら不要（無視する）
  name: string;
  property_number?: string;    // カンマ区切りの物件番号
  broker_survey?: string;      // 業者向けアンケート（"未"など）
  // ... その他のフィールド
}
```

### property_listings テーブル

```typescript
interface PropertyListing {
  property_number: string;     // 主キー
  address: string;
  display_address?: string;
  property_type: string;
  price: number;
  // ... その他のフィールド
}
```

## API設計

### GET /api/buyers/:buyer_number/properties

**リクエスト**:
```
GET /api/buyers/6951/properties
```

**レスポンス**:
```json
[
  {
    "property_number": "AA1949",
    "address": "大分市...",
    "display_address": "...",
    "property_type": "戸建て",
    "price": 12000000,
    ...
  }
]
```

**エラーレスポンス**:
```json
{
  "error": "Buyer not found"
}
```

## テスト計画

### 1. 単体テスト

#### `getLinkedProperties`メソッド

**テストケース1: 正常系**
- 入力: `buyer_number = "6951"`
- 期待: 物件情報の配列を返す

**テストケース2: 物件番号が空**
- 入力: `buyer_number = "9999"` (property_numberが空)
- 期待: 空配列を返す

**テストケース3: 買主が存在しない**
- 入力: `buyer_number = "99999"` (存在しない)
- 期待: 空配列を返す

**テストケース4: 複数物件**
- 入力: `buyer_number = "6666"` (property_number = "AA1,AA2,AA3")
- 期待: 3件の物件情報を返す

### 2. 統合テスト

#### APIエンドポイント

**テストケース1: 正常系**
```bash
curl http://localhost:3001/api/buyers/6951/properties
```
- 期待: 200 OK、物件情報の配列

**テストケース2: 買主が存在しない**
```bash
curl http://localhost:3001/api/buyers/99999/properties
```
- 期待: 200 OK、空配列

### 3. E2Eテスト

#### ブラウザテスト

**テストケース1: 物件情報表示**
1. 買主一覧ページを開く
2. 買主6951をクリック
3. 物件詳細カードが表示されることを確認
4. AA1949の情報が表示されることを確認

**テストケース2: サイドバーステータス**
1. 買主一覧ページを開く
2. サイドバーに「業者問合せあり」カテゴリが表示されることを確認
3. 「業者問合せあり」をクリック
4. 買主6951が一覧に表示されることを確認

## セキュリティ考慮事項

### 1. buyer_idの削除

**リスク**: なし
- `buyer_id`は内部的にのみ使用されていた
- 外部に公開されていない
- 削除しても影響なし

### 2. buyer_numberの公開

**リスク**: 低
- `buyer_number`は既に公開されている（URLパラメータ）
- 連番のため、推測可能
- 認証・認可が必要（既存の実装を維持）

## パフォーマンス考慮事項

### 1. データベースクエリ

**変更前**:
```sql
SELECT * FROM buyers WHERE buyer_id = 'uuid';
```

**変更後**:
```sql
SELECT * FROM buyers WHERE buyer_number = '6951';
```

**影響**: なし
- `buyer_number`にインデックスが存在する（主キー）
- クエリパフォーマンスは同等

### 2. APIレスポンス

**影響**: なし
- レスポンスの内容は変更なし
- レスポンスサイズは変更なし

## デプロイ計画

### 1. デプロイ手順

1. バックエンドの修正をデプロイ
2. 動作確認
3. 問題がなければ完了

### 2. ロールバック計画

**ロールバック手順**:
1. Gitで前のコミットに戻す
2. 再デプロイ

**ロールバックの影響**:
- なし（既存の動作に戻るだけ）

## 正確性プロパティ

### Property 1: 物件情報取得の正確性

**プロパティ**:
```
∀ buyer_number, property_number:
  buyers.property_number = property_number
  ⇒ getLinkedProperties(buyer_number) contains property_number
```

**検証方法**:
- 買主6951のproperty_numberを確認
- getLinkedProperties("6951")の結果を確認
- property_numberが含まれていることを確認

### Property 2: buyer_idの不使用

**プロパティ**:
```
∀ buyer_number:
  getLinkedProperties(buyer_number) does not use buyer_id
```

**検証方法**:
- コードレビュー
- `buyer_id`の使用箇所を検索
- `getLinkedProperties`内で`buyer_id`が使用されていないことを確認

### Property 3: 後方互換性

**プロパティ**:
```
∀ buyer_number:
  GET /api/buyers/{buyer_number}/properties (変更前)
  = GET /api/buyers/{buyer_number}/properties (変更後)
```

**検証方法**:
- 変更前後でAPIレスポンスを比較
- レスポンスが同一であることを確認

## まとめ

### 修正内容

1. **`getLinkedProperties`メソッド**:
   - `buyerId` → `buyerNumber`に変更
   - `getById()` → `getByBuyerNumber()`に変更

2. **APIエンドポイント**:
   - UUID判定を削除
   - `buyer_id`変換を削除
   - `buyer_number`をそのまま渡す

3. **サイドバーステータス**:
   - 調査が必要（次のタスクで実施）

### 期待される効果

1. 買主6951の物件情報が正しく表示される
2. `buyer_id`の誤用が解消される
3. コードがステアリングドキュメントに準拠する
4. 後方互換性が維持される

### リスク

- **低**: 既存の動作を変更するが、影響範囲は限定的
- **テスト**: 十分なテストで検証可能
- **ロールバック**: 容易にロールバック可能
