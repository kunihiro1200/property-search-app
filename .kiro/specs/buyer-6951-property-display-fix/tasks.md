# 買主6951の物件情報表示とサイドバーステータス修正 - タスクリスト

## タスク概要

- [-] 1. 事前調査
- [-] 2. 物件情報表示の修正
- [ ] 3. サイドバーステータスの調査と修正
- [ ] 4. テストと検証
- [ ] 5. デプロイと確認

---

## 1. 事前調査

### 1.1 買主6951のデータ確認

- [x] 1.1.1 買主6951の`property_number`フィールドを確認
- [x] 1.1.2 買主6951の`broker_survey`フィールドを確認
- [ ] 1.1.3 AA1949の物件情報が`property_listings`テーブルに存在するか確認

**実装方法**:
```bash
# Supabase SQL Editorで実行
SELECT buyer_number, property_number, broker_survey, name
FROM buyers
WHERE buyer_number = '6951';

SELECT property_number, address, property_type, price
FROM property_listings
WHERE property_number = 'AA1949';
```

**期待される結果**:
- `property_number`: "AA1949"（または"AA1949"を含む）
- `broker_survey`: "未"
- AA1949の物件情報が存在する

---

## 2. 物件情報表示の修正

### 2.1 `getLinkedProperties`メソッドの修正

- [ ] 2.1.1 `backend/src/services/BuyerService.ts`を開く
- [x] 2.1.2 `getLinkedProperties`メソッドのシグネチャを変更
  - `buyerId: string` → `buyerNumber: string`
- [ ] 2.1.3 `getById(buyerId)` → `getByBuyerNumber(buyerNumber)`に変更
- [ ] 2.1.4 ログ出力のメッセージを更新
  - `buyerId` → `buyerNumber`

**変更箇所**:
```typescript
// 変更前
async getLinkedProperties(buyerId: string): Promise<any[]> {
  const propertyNumbersSet = new Set<string>();

  // buyers.property_number から物件番号を取得
  const buyer = await this.getById(buyerId);
  if (!buyer) {
    console.log(`[BuyerService.getLinkedProperties] Buyer not found: ${buyerId}`);
    return [];
  }
  // ...
}

// 変更後
async getLinkedProperties(buyerNumber: string): Promise<any[]> {
  const propertyNumbersSet = new Set<string>();

  // buyers.property_number から物件番号を取得
  const buyer = await this.getByBuyerNumber(buyerNumber);
  if (!buyer) {
    console.log(`[BuyerService.getLinkedProperties] Buyer not found: ${buyerNumber}`);
    return [];
  }
  // ...
}
```

### 2.2 APIエンドポイントの修正

- [x] 2.2.1 `backend/src/routes/buyers.ts`を開く
- [x] 2.2.2 `GET /:id/properties`エンドポイントを修正
- [x] 2.2.3 UUID判定を削除
- [x] 2.2.4 `buyer_id`変換を削除
- [x] 2.2.5 `buyer_number`をそのまま`getLinkedProperties`に渡す

**変更箇所**:
```typescript
// 変更前
router.get('/:id/properties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // UUIDかどうかで判定
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // 買主番号の場合は、まずbuyer_idを取得
    let buyerId = id;
    if (!isUuid) {
      const buyer = await buyerService.getByBuyerNumber(id);
      if (!buyer) {
        return res.status(404).json({ error: 'Buyer not found' });
      }
      buyerId = buyer.buyer_id; // ✅ buyer.buyer_idを使用
    }
    
    const properties = await buyerService.getLinkedProperties(buyerId);
    res.json(properties);
  } catch (error: any) {
    console.error('Error fetching linked properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// 変更後
router.get('/:id/properties', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // buyer_numberをそのまま使用
    const properties = await buyerService.getLinkedProperties(id);
    res.json(properties);
  } catch (error: any) {
    console.error('Error fetching linked properties:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2.3 コンパイルエラーの確認

- [x] 2.3.1 TypeScriptのコンパイルエラーを確認
- [ ] 2.3.2 エラーがあれば修正

**実行方法**:
```bash
cd backend
npm run build
```

---

## 3. サイドバーステータスの調査と修正

### 3.1 買主一覧ページの実装確認

- [ ] 3.1.1 `frontend/src/pages/BuyerListPage.tsx`を開く
- [ ] 3.1.2 サイドバーコンポーネントを確認
- [ ] 3.1.3 `withStatus=true`パラメータが使用されているか確認
- [ ] 3.1.4 ステータスカテゴリの表示ロジックを確認

### 3.2 サイドバーコンポーネントの確認

- [ ] 3.2.1 サイドバーコンポーネントのファイルを特定
  - `frontend/src/components/BuyerStatusSidebar.tsx`（存在する場合）
  - または`BuyerListPage.tsx`内のサイドバー実装
- [ ] 3.2.2 「業者問合せあり」カテゴリが実装されているか確認
- [ ] 3.2.3 実装されていない場合は追加

### 3.3 ステータス計算の確認

- [ ] 3.3.1 買主一覧取得APIに`withStatus=true`パラメータを追加（必要な場合）
- [ ] 3.3.2 ブラウザの開発者ツールでAPIレスポンスを確認
- [ ] 3.3.3 `calculated_status`フィールドが含まれているか確認
- [ ] 3.3.4 買主6951の`calculated_status`が「業者問合せあり」になっているか確認

### 3.4 サイドバーカテゴリの追加（必要な場合）

- [ ] 3.4.1 「業者問合せあり」カテゴリをサイドバーに追加
- [ ] 3.4.2 カテゴリのフィルタリングロジックを実装
- [ ] 3.4.3 カテゴリの件数表示を実装

---

## 4. テストと検証

### 4.1 単体テスト

- [ ] 4.1.1 `getLinkedProperties`メソッドのテスト
  - 買主6951で物件情報が取得できることを確認
  - 物件番号が空の買主で空配列が返ることを確認
  - 存在しない買主で空配列が返ることを確認

**実行方法**:
```bash
cd backend
npx ts-node -e "
import { BuyerService } from './src/services/BuyerService';
const service = new BuyerService();
service.getLinkedProperties('6951').then(console.log);
"
```

### 4.2 APIテスト

- [x] 4.2.1 ローカル環境でバックエンドを起動
- [x] 4.2.2 APIエンドポイントをテスト

**実行方法**:
```bash
# バックエンド起動
cd backend
npm run dev

# 別のターミナルでテスト
curl http://localhost:3001/api/buyers/6951/properties
```

**期待される結果**:
```json
[
  {
    "property_number": "AA1949",
    "address": "...",
    ...
  }
]
```

### 4.3 E2Eテスト

- [ ] 4.3.1 フロントエンドを起動
- [ ] 4.3.2 買主一覧ページを開く
- [ ] 4.3.3 買主6951をクリック
- [ ] 4.3.4 物件詳細カードが表示されることを確認
- [ ] 4.3.5 AA1949の情報が表示されることを確認

**実行方法**:
```bash
# フロントエンド起動
cd frontend
npm run dev

# ブラウザで http://localhost:5173/buyers を開く
```

### 4.4 サイドバーステータスのテスト

- [ ] 4.4.1 買主一覧ページを開く
- [ ] 4.4.2 サイドバーに「業者問合せあり」カテゴリが表示されることを確認
- [ ] 4.4.3 「業者問合せあり」をクリック
- [ ] 4.4.4 買主6951が一覧に表示されることを確認
- [ ] 4.4.5 件数が正しく表示されることを確認

### 4.5 後方互換性のテスト

- [ ] 4.5.1 他の買主の物件情報表示をテスト
  - 買主6666など、複数物件を持つ買主
  - 物件番号が空の買主
- [ ] 4.5.2 既存の機能に影響がないことを確認

---

## 5. デプロイと確認

### 5.1 コミットとプッシュ

- [ ] 5.1.1 変更をコミット
  ```bash
  git add .
  git commit -m "fix: 買主6951の物件情報表示とサイドバーステータス修正

  - getLinkedPropertiesメソッドをbuyer_numberベースに変更
  - APIエンドポイントからbuyer_id変換を削除
  - サイドバーに「業者問合せあり」カテゴリを追加（必要な場合）
  
  Fixes #[issue番号]"
  ```
- [ ] 5.1.2 リモートにプッシュ
  ```bash
  git push origin main
  ```

### 5.2 本番環境での確認

- [ ] 5.2.1 Vercelで自動デプロイを確認
- [ ] 5.2.2 本番環境で買主6951をテスト
- [ ] 5.2.3 物件情報が表示されることを確認
- [ ] 5.2.4 サイドバーステータスが正しく表示されることを確認

### 5.3 ロールバック準備

- [ ] 5.3.1 問題が発生した場合のロールバック手順を確認
- [ ] 5.3.2 前のコミットのハッシュを記録

---

## チェックリスト

### 修正前の確認

- [ ] 買主6951のデータを確認済み
- [ ] AA1949の物件情報が存在することを確認済み
- [ ] ステアリングドキュメントを確認済み

### 修正後の確認

- [ ] `getLinkedProperties`メソッドが`buyer_number`で検索している
- [ ] APIエンドポイントが`buyer_number`をそのまま渡している
- [ ] `buyer_id`が使用されていない
- [ ] コンパイルエラーがない
- [ ] 単体テストが通る
- [ ] APIテストが通る
- [ ] E2Eテストが通る
- [ ] サイドバーステータスが正しく表示される
- [ ] 後方互換性が維持されている

### デプロイ後の確認

- [ ] 本番環境で買主6951の物件情報が表示される
- [ ] 本番環境でサイドバーステータスが正しく表示される
- [ ] 他の買主に影響がない
- [ ] エラーログに異常がない

---

## 注意事項

### buyer_idの扱い

**絶対に守るべきルール**（`buyer-table-column-definition.md`より）:
- ✅ **`buyer_number`が主キー**
- ❌ **`buyer_id`は存在すら不要**（データベースに存在しても、アプリケーションでは完全に無視する）
- ❌ **`id`カラムは存在しない**（絶対に使用しない）

### システム隔離ルール

**絶対に守るべきルール**（`system-isolation-rule.md`より）:
- 買主リストシステムのファイルのみを変更する
- 売主リスト、物件リスト、物件公開サイトには影響を与えない

### 後方互換性

**絶対に守るべきルール**（`backward-compatibility-rule.md`より）:
- 既存のURLは常に動作し続けなければならない
- APIレスポンスの形式を変更しない
- 既存の機能に影響を与えない

---

## トラブルシューティング

### 問題1: 物件情報が表示されない

**確認事項**:
1. 買主6951の`property_number`フィールドを確認
2. AA1949が`property_listings`テーブルに存在するか確認
3. APIレスポンスを確認（開発者ツール）
4. バックエンドのログを確認

### 問題2: サイドバーステータスが表示されない

**確認事項**:
1. 買主6951の`broker_survey`フィールドを確認
2. `BuyerStatusCalculator`が正しく動作しているか確認
3. `withStatus=true`パラメータが使用されているか確認
4. サイドバーコンポーネントの実装を確認

### 問題3: コンパイルエラー

**確認事項**:
1. TypeScriptの型定義を確認
2. インポート文を確認
3. `npm install`を実行

---

## 完了条件

- [ ] 買主6951をクリックすると、AA1949の物件情報が表示される
- [ ] サイドバーに「業者問合せあり」カテゴリが表示される
- [ ] 「業者問合せあり」カテゴリに買主6951が含まれる
- [ ] 他の買主の物件情報表示に影響がない
- [ ] 後方互換性が維持されている
- [ ] 本番環境で正常に動作している
