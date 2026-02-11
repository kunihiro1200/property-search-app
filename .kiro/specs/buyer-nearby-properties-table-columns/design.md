# 買主リスト - 近隣物件一覧画面のテーブル表示項目変更 - 設計書

## 📋 概要

買主詳細ページの「近隣物件」ボタンから遷移する近隣物件一覧画面（`BuyerNearbyPropertiesPage.tsx`）のテーブル表示項目を変更する。

## 🎯 設計目標

1. 不要な列（売出価格、土地面積、建物面積）を削除
2. マンションの場合のみ「ペット」情報を表示
3. 「内覧前伝達事項」を表示

## 📐 アーキテクチャ

### システム構成

```
フロントエンド (BuyerNearbyPropertiesPage.tsx)
    ↓ API呼び出し
バックエンド (buyers.ts)
    ↓ データ取得
データベース (property_listings テーブル)
    ↑ 同期
スプレッドシート (物件シート)
```

### データフロー

```
1. ユーザーが「近隣物件」ボタンをクリック
    ↓
2. BuyerNearbyPropertiesPage が表示される
    ↓
3. API呼び出し: GET /api/buyers/:id/nearby-properties?propertyNumber=<物件番号>
    ↓
4. バックエンドが property_listings テーブルから近隣物件を取得
    ↓
5. レスポンスに以下を含める:
   - property_number
   - address, display_address
   - property_type
   - sales_price
   - atbb_status
   - sales_assignee
   - floor_plan
   - pet_allowed (マンションの場合のみ使用)
   - property_about (内覧前伝達事項)
    ↓
6. フロントエンドがテーブルを表示
   - マンションの場合: 「ペット」列を表示
   - マンション以外: 「ペット」列を非表示
```

## 🗂️ データベース設計

### property_listings テーブル

**既存カラム**:
- `property_number` (string) - 物件番号
- `address` (string) - 住所
- `display_address` (string) - 住居表示
- `property_type` (string) - 種別
- `sales_price` (number) - 価格
- `atbb_status` (string) - ステータス
- `sales_assignee` (string) - 担当
- `floor_plan` (string) - 間取り
- `property_about` (text) - 内覧前伝達事項（BQ列から同期）

**新規カラム**:
- `pet_allowed` (string) - ペット可否（BB列から同期）

### スプレッドシートマッピング

| データベースカラム | スプレッドシート列 | ヘッダー名 | 備考 |
|------------------|------------------|-----------|------|
| `sales_price` | BS列 | （要確認） | 既存 |
| `pet_allowed` | BB列 | （要確認） | 新規 |
| `property_about` | BQ列 | `●内覧前伝達事項` | 既存 |

## 🔧 コンポーネント設計

### 1. フロントエンド: BuyerNearbyPropertiesPage.tsx

#### PropertyListing インターフェース

```typescript
interface PropertyListing {
  id: string;
  property_number: string;
  address: string;
  display_address?: string;
  property_type: string;
  sales_price: number;
  atbb_status: string;
  sales_assignee?: string;
  floor_plan?: string;
  pet_allowed?: string;        // 新規追加
  property_about?: string;      // 新規追加
}
```

#### テーブル構造

**変更前**:
```tsx
<TableHead>
  <TableRow>
    <TableCell>物件番号</TableCell>
    <TableCell>住所</TableCell>
    <TableCell>種別</TableCell>
    <TableCell align="right">価格</TableCell>
    <TableCell align="right">売出価格</TableCell>
    <TableCell>ステータス</TableCell>
    <TableCell>担当</TableCell>
    <TableCell>間取り</TableCell>
    <TableCell align="right">土地面積</TableCell>
    <TableCell align="right">建物面積</TableCell>
  </TableRow>
</TableHead>
```

**変更後**:
```tsx
<TableHead>
  <TableRow>
    <TableCell>物件番号</TableCell>
    <TableCell>住所</TableCell>
    <TableCell>種別</TableCell>
    <TableCell align="right">価格</TableCell>
    <TableCell>ステータス</TableCell>
    <TableCell>担当</TableCell>
    <TableCell>間取り</TableCell>
    {/* マンションの場合のみ表示 */}
    {nearbyProperties.some(p => p.property_type === 'マンション') && (
      <TableCell>ペット</TableCell>
    )}
    <TableCell>内覧前伝達事項</TableCell>
  </TableRow>
</TableHead>
```

#### 表示ロジック

**ペット列の表示判定**:
```typescript
// 近隣物件にマンションが含まれているか確認
const hasApartment = nearbyProperties.some(p => p.property_type === 'マンション');
```

**ペット情報の表示**:
```typescript
// マンションの場合のみ表示
{hasApartment && (
  <TableCell>
    {property.property_type === 'マンション' 
      ? (property.pet_allowed || '-')
      : '-'
    }
  </TableCell>
)}
```

**内覧前伝達事項の表示**:
```typescript
// 長いテキストの場合は省略表示
const formatPropertyAbout = (text: string | undefined) => {
  if (!text) return '-';
  const maxLength = 50;
  if (text.length > maxLength) {
    return `${text.substring(0, maxLength)}...`;
  }
  return text;
};

// 表示
<TableCell>{formatPropertyAbout(property.property_about)}</TableCell>
```

### 2. バックエンド: buyers.ts

#### GET /api/buyers/:id/nearby-properties エンドポイント

**変更前**:
```typescript
const { data, error } = await supabase
  .from('property_listings')
  .select('*')
  .in('property_number', propertyNumbers);
```

**変更後**:
```typescript
const { data, error } = await supabase
  .from('property_listings')
  .select(`
    id,
    property_number,
    address,
    display_address,
    property_type,
    sales_price,
    atbb_status,
    sales_assignee,
    floor_plan,
    pet_allowed,
    property_about
  `)
  .in('property_number', propertyNumbers);
```

**注意**: `pet_allowed`と`property_about`を明示的に選択する。

### 3. スプレッドシート同期サービス

#### PropertyListingSyncService.ts

**変更内容**:
- `pet_allowed`カラムをスプレッドシートのBB列から同期
- `property_about`は既に同期済み（BQ列から）

**実装例**:
```typescript
// スプレッドシートから物件データを取得
const rows = await sheetsClient.readRange('物件!A2:BZ');

for (const row of rows) {
  const propertyData = {
    property_number: row[0],  // A列
    // ... 他のフィールド
    pet_allowed: row[53],     // BB列（0-indexed: 53）
    property_about: row[68],  // BQ列（0-indexed: 68）
  };
  
  // データベースに保存
  await supabase
    .from('property_listings')
    .upsert(propertyData);
}
```

## 🎨 UI/UX設計

### テーブルレイアウト

**列幅の調整**:
- 物件番号: 100px
- 住所: 200px
- 種別: 80px
- 価格: 100px
- ステータス: 120px
- 担当: 80px
- 間取り: 80px
- ペット: 80px（マンションの場合のみ）
- 内覧前伝達事項: 300px

**レスポンシブ対応**:
- 画面幅が狭い場合は、横スクロールを有効にする
- `TableContainer`に`sx={{ overflowX: 'auto' }}`を設定

### 表示例

**マンションが含まれる場合**:
| 物件番号 | 住所 | 種別 | 価格 | ステータス | 担当 | 間取り | ペット | 内覧前伝達事項 |
|---------|------|------|------|-----------|------|--------|--------|---------------|
| AA5030 | 大分市中央町1-1-1 | マンション | 2080万円 | 公開中 | Y | 3LDK | 可 | 駐車場1台付き |
| AA5031 | 大分市中央町1-2-2 | 戸建て | 1800万円 | 公開中 | Y | 4LDK | - | 南向き |

**マンションが含まれない場合**:
| 物件番号 | 住所 | 種別 | 価格 | ステータス | 担当 | 間取り | 内覧前伝達事項 |
|---------|------|------|------|-----------|------|--------|---------------|
| AA5031 | 大分市中央町1-2-2 | 戸建て | 1800万円 | 公開中 | Y | 4LDK | 南向き |
| AA5032 | 大分市中央町1-3-3 | 土地 | 1200万円 | 公開中 | Y | - | 更地 |

## 🔒 セキュリティ・制約

### システム隔離ルール

- ✅ 買主リスト専用のファイルのみを変更
- ❌ 売主リスト、物件リスト、物件公開サイトのファイルは変更しない

### 後方互換性

- ✅ 既存のAPIエンドポイントは変更しない（レスポンスに項目を追加するのみ）
- ✅ 既存の機能（近隣物件検索ロジック）は変更しない

## 📊 正確性プロパティ

### プロパティ1: ペット列の表示条件

**仕様**: 近隣物件にマンションが含まれる場合のみ、「ペット」列を表示する

**検証方法**:
```typescript
// テストケース1: マンションが含まれる場合
const properties = [
  { property_type: 'マンション', pet_allowed: '可' },
  { property_type: '戸建て', pet_allowed: null },
];
const hasApartment = properties.some(p => p.property_type === 'マンション');
expect(hasApartment).toBe(true);

// テストケース2: マンションが含まれない場合
const properties2 = [
  { property_type: '戸建て', pet_allowed: null },
  { property_type: '土地', pet_allowed: null },
];
const hasApartment2 = properties2.some(p => p.property_type === 'マンション');
expect(hasApartment2).toBe(false);
```

### プロパティ2: 内覧前伝達事項の省略表示

**仕様**: 内覧前伝達事項が50文字を超える場合、50文字で切り詰めて「...」を追加する

**検証方法**:
```typescript
const formatPropertyAbout = (text: string | undefined) => {
  if (!text) return '-';
  const maxLength = 50;
  if (text.length > maxLength) {
    return `${text.substring(0, maxLength)}...`;
  }
  return text;
};

// テストケース1: 50文字以下
expect(formatPropertyAbout('駐車場1台付き')).toBe('駐車場1台付き');

// テストケース2: 50文字超
const longText = 'a'.repeat(60);
expect(formatPropertyAbout(longText)).toBe('a'.repeat(50) + '...');

// テストケース3: undefined
expect(formatPropertyAbout(undefined)).toBe('-');
```

## 🧪 テスト戦略

### ユニットテスト

**テスト対象**:
1. `formatPropertyAbout`関数
2. `hasApartment`判定ロジック

**テストケース**:
```typescript
describe('BuyerNearbyPropertiesPage', () => {
  describe('formatPropertyAbout', () => {
    it('should return "-" for undefined', () => {
      expect(formatPropertyAbout(undefined)).toBe('-');
    });
    
    it('should return text as-is if length <= 50', () => {
      expect(formatPropertyAbout('短いテキスト')).toBe('短いテキスト');
    });
    
    it('should truncate text if length > 50', () => {
      const longText = 'a'.repeat(60);
      expect(formatPropertyAbout(longText)).toBe('a'.repeat(50) + '...');
    });
  });
  
  describe('hasApartment', () => {
    it('should return true if any property is マンション', () => {
      const properties = [
        { property_type: 'マンション' },
        { property_type: '戸建て' },
      ];
      expect(properties.some(p => p.property_type === 'マンション')).toBe(true);
    });
    
    it('should return false if no property is マンション', () => {
      const properties = [
        { property_type: '戸建て' },
        { property_type: '土地' },
      ];
      expect(properties.some(p => p.property_type === 'マンション')).toBe(false);
    });
  });
});
```

### 統合テスト

**テストシナリオ**:
1. 近隣物件一覧画面を開く
2. マンションが含まれる場合、「ペット」列が表示されることを確認
3. マンションが含まれない場合、「ペット」列が表示されないことを確認
4. 「内覧前伝達事項」列が表示されることを確認
5. 長い内覧前伝達事項が省略表示されることを確認

## 🚀 デプロイ戦略

### Phase 1: データベース準備

1. `property_listings`テーブルに`pet_allowed`カラムを追加
2. スプレッドシート同期サービスを修正して`pet_allowed`を同期

### Phase 2: バックエンド修正

1. `GET /api/buyers/:id/nearby-properties`エンドポイントを修正
2. レスポンスに`pet_allowed`と`property_about`を追加

### Phase 3: フロントエンド修正

1. `BuyerNearbyPropertiesPage.tsx`を修正
2. テーブルヘッダーとボディを変更
3. 表示ロジックを実装

### Phase 4: テスト

1. ローカル環境でテスト
2. 本番環境にデプロイ
3. 動作確認

## 📝 実装チェックリスト

### データベース
- [ ] `pet_allowed`カラムが存在するか確認
- [ ] `property_about`カラムが存在するか確認（既存）

### バックエンド
- [ ] `GET /api/buyers/:id/nearby-properties`エンドポイントを修正
- [ ] レスポンスに`pet_allowed`と`property_about`を追加
- [ ] スプレッドシート同期サービスを修正（必要な場合）

### フロントエンド
- [ ] `PropertyListing`インターフェースを修正
- [ ] テーブルヘッダーを変更
- [ ] テーブルボディを変更
- [ ] `formatPropertyAbout`関数を実装
- [ ] `hasApartment`判定ロジックを実装

### テスト
- [ ] ユニットテストを実装
- [ ] 統合テストを実行
- [ ] マンションが含まれる場合の表示を確認
- [ ] マンションが含まれない場合の表示を確認

## 📚 関連ドキュメント

- `.kiro/steering/buyer-table-column-definition.md` - 買主テーブルのカラム定義
- `.kiro/steering/property-listing-column-mapping.md` - 物件リストカラムマッピング
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/specs/buyer-nearby-properties-distance-based/requirements.md` - 近隣物件検索の拡張

---

**作成日**: 2026年2月11日  
**作成理由**: 買主担当者が近隣物件を効率的に比較検討できるようにするため
