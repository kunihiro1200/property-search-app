# セッションログ: 価格フィルター修正

**日付**: 2025年1月21日  
**問題**: マンション価格フィルター（1000万〜1500万）で検索結果が0件になる

---

## 問題の詳細

### ユーザー報告
- マンションを選択して1000万円以上1500万円以下で検索すると「データなし」と表示される
- 実際には8件以上の該当物件が存在するはず

### 症状
- フロントエンドで価格フィルターを適用しても、検索結果が0件になる
- データベースには該当する物件が存在する（11件確認済み）

---

## 根本原因

### 単位変換の欠如

**問題箇所**: `backend/src/routes/publicProperties.ts` 行95-108

```typescript
// ❌ 修正前（単位変換なし）
let priceFilter: { min?: number; max?: number } | undefined;
if (minPrice || maxPrice) {
  priceFilter = {};
  if (minPrice) {
    const min = parseInt(minPrice as string, 10);
    if (!isNaN(min) && min >= 0) {
      priceFilter.min = min; // ← 1000がそのまま1000円として扱われる
    }
  }
  if (maxPrice) {
    const max = parseInt(maxPrice as string, 10);
    if (!isNaN(max) && max >= 0) {
      priceFilter.max = max; // ← 1500がそのまま1500円として扱われる
    }
  }
}
```

### 原因の詳細

1. **フロントエンド**: 価格を「万円」単位で送信（例: `minPrice=1000`, `maxPrice=1500`）
2. **バックエンド**: 受け取った値をそのまま使用（1000円、1500円として検索）
3. **データベース**: 価格は「円」単位で保存（例: 10000000円、15000000円）
4. **結果**: `price >= 1000 AND price <= 1500` という条件で検索され、該当物件が0件になる

### なぜ気づきにくかったか

- エラーメッセージが表示されない（正常に動作しているように見える）
- 検索結果が0件になるだけなので、「該当物件がない」と誤解しやすい
- 他のフィルター（物件タイプ、築年数など）は正常に動作していた

---

## 修正内容

### コード修正

**ファイル**: `backend/src/routes/publicProperties.ts`

```typescript
// ✅ 修正後（単位変換あり）
let priceFilter: { min?: number; max?: number } | undefined;
if (minPrice || maxPrice) {
  priceFilter = {};
  if (minPrice) {
    const min = parseInt(minPrice as string, 10);
    if (!isNaN(min) && min >= 0) {
      priceFilter.min = min * 10000; // 万円 → 円に変換
    }
  }
  if (maxPrice) {
    const max = parseInt(maxPrice as string, 10);
    if (!isNaN(max) && max >= 0) {
      priceFilter.max = max * 10000; // 万円 → 円に変換
    }
  }
}
```

### 修正のポイント

- フロントエンドから送られてくる価格（万円単位）を10000倍して円単位に変換
- データベースの価格カラムと単位を統一
- コメントを追加して、今後の混乱を防止

---

## テスト結果

### データベース直接クエリ

```bash
npx ts-node test-price-filter-fix.ts
```

**結果**: ✅ 11件のマンションが1000万〜1500万円の範囲で見つかった

```
1. AA206 - 大分市大字津守190番地1 (1080万円)
2. AA6118 - 大分市明野北5丁目10番チュリス明野A棟 (1180万円)
3. AA3656 - 別府市石垣東五丁目1248番地ロフティ南石垣402 (1180万円)
4. AA6381 - 大分市皆春１６７−２ ルネス皆春 (1180万円)
5. AA5324 - 別府市原町2-18グランデール別府 (1260万円)
6. AA9547 - 大分市古ケ鶴１丁目５−３ (1300万円)
7. AA10497 - 大分市大字猪野585 (1330万円)
8. AA5693 - 大分市城崎町三丁目　5874番地1 (1420万円)
9. AA12700 - 大分市萩原1丁目7-19 (1430万円)
10. AA3227 - 大分市羽屋３丁目４−２１ アーバンパレス古国府 (1480万円)
11. AA5834 - 別府市馬場1-5-1 (1490万円)
```

### APIエンドポイントテスト

修正後、以下のコマンドでAPIをテスト:

```bash
npx ts-node test-price-filter-api.ts
```

**期待される結果**: 11件のマンションが返される

---

## デプロイ手順

### 1. バックエンドのデプロイ

```bash
cd C:\Users\kunih\sateituikyaku
vercel --prod
```

### 2. 動作確認

本番環境で以下の検索を実行:
1. 物件タイプ: マンション
2. 価格範囲: 1000万円〜1500万円

**期待される結果**: 11件の物件が表示される

---

## 今後の対策

### 1. 単位の統一

**推奨**: すべての価格データを「円」単位で統一する

- フロントエンド: 表示は「万円」、APIリクエストは「円」
- バックエンド: すべて「円」単位で処理
- データベース: 「円」単位で保存

### 2. バリデーションの追加

価格フィルターに以下のバリデーションを追加:

```typescript
// 価格範囲の妥当性チェック
if (priceFilter.min !== undefined && 
    priceFilter.max !== undefined && 
    priceFilter.min > priceFilter.max) {
  res.status(400).json({ 
    error: 'Invalid price range',
    message: '最小価格は最大価格以下である必要があります' 
  });
  return;
}
```

### 3. テストの追加

価格フィルターの単体テストを追加:

```typescript
describe('Price Filter', () => {
  it('should convert man-yen to yen', () => {
    const minPrice = 1000; // 1000万円
    const maxPrice = 1500; // 1500万円
    
    const priceFilter = {
      min: minPrice * 10000, // 10000000円
      max: maxPrice * 10000  // 15000000円
    };
    
    expect(priceFilter.min).toBe(10000000);
    expect(priceFilter.max).toBe(15000000);
  });
});
```

### 4. ドキュメントの更新

価格フィルターのAPIドキュメントに単位を明記:

```
GET /api/public/properties

Query Parameters:
- minPrice: number (万円単位) - 最小価格
- maxPrice: number (万円単位) - 最大価格

例: minPrice=1000&maxPrice=1500 → 1000万円〜1500万円
```

---

## まとめ

### 問題の本質

- **単位変換の欠如**: フロントエンドの「万円」とバックエンドの「円」の単位が統一されていなかった
- **暗黙の前提**: 価格の単位が明示されていなかったため、混乱が生じた

### 修正内容

- `backend/src/routes/publicProperties.ts`で価格を10000倍して単位を統一
- コメントを追加して、今後の混乱を防止

### 影響範囲

- **修正ファイル**: 1ファイル（`backend/src/routes/publicProperties.ts`）
- **影響機能**: 価格フィルター機能のみ
- **破壊的変更**: なし（既存の動作を修正するのみ）

### 今後の対策

1. 単位の統一（すべて「円」単位）
2. バリデーションの追加
3. テストの追加
4. ドキュメントの更新

---

**修正完了**: 2025年1月21日  
**デプロイ待ち**: バックエンドのデプロイが必要
