---
inclusion: always
---

# 買主リスト - 近隣物件検索条件（絶対に変更しないルール）

## ⚠️ 最重要：近隣物件検索条件を変更しない

**絶対に守るべき原則**:
- **近隣物件の検索条件は絶対に変更してはいけない**
- **検索ロジックの変更は、ユーザーに大きな影響を与える**
- **検索結果が変わると、買主への提案内容が変わってしまう**

---

## 📋 現在の検索条件（絶対に変更しない）

### 検索方法

近隣物件は以下の3つの方法で検索されます：

1. **所在地ベース検索** (`searchByLocation`)
   - 基準物件の住所から市区町村と町名を抽出
   - 同じ町名の物件を検索

2. **距離ベース検索** (`searchByDistance`)
   - 基準物件の座標から半径3km以内の物件を検索
   - 座標データがある物件のみ対象

3. **配信エリアベース検索** (`searchByDistributionArea`)
   - 基準物件の配信エリア番号と共通するエリアの物件を検索
   - 配信エリアデータがある物件のみ対象

### 共通フィルタ条件

全ての検索方法で以下の条件が適用されます：

1. **価格帯**:
   - 1000万円未満: 0円 ～ 999万円
   - 1000万円～2999万円: 1000万円 ～ 2999万円
   - 3000万円～4999万円: 3000万円 ～ 4999万円
   - 5000万円以上: 5000万円 ～ 上限なし

2. **物件種別**: 基準物件と同じ種別（マンション、戸建て、土地など）

3. **ステータス**: 以下のいずれかに該当する物件
   - `atbb_status`に「公開中」を含む
   - `atbb_status`に「公開前」を含む
   - `atbb_status`に「非公開（配信メールのみ）」を含む

4. **除外**: 基準物件自身は除外

### データ取得

- **全てのカラムを取得**: `select('*')`を使用
- **理由**: 
  - 明示的にカラムを指定すると、存在しないカラムでエラーが発生する
  - 将来的にカラムが追加された場合も対応できる
  - フロントエンドで必要なカラムが全て含まれる

---

## 🚨 絶対にやってはいけないこと

### ❌ 禁止事項1: 価格帯の変更

```typescript
// ❌ 間違い: 価格帯を変更
if (price < 10000000) {
  return { minPrice: 0, maxPrice: 15000000 }; // 上限を変更
}
```

**影響**:
- 検索結果が変わる
- 買主への提案内容が変わる

### ❌ 禁止事項2: ステータス条件の変更

```typescript
// ❌ 間違い: ステータス条件を変更
query = query.or('atbb_status.ilike.%公開中%'); // 「公開前」を削除
```

**影響**:
- 公開前の物件が検索されなくなる
- 提案できる物件が減る

### ❌ 禁止事項3: 検索方法の削除

```typescript
// ❌ 間違い: 距離ベース検索を削除
// const distanceResults = await this.searchByDistance(baseProperty, commonFilters);
```

**影響**:
- 検索結果が大幅に減る
- 買主への提案の質が下がる

### ❌ 禁止事項4: select()の明示的なカラム指定

```typescript
// ❌ 間違い: カラムを明示的に指定
.select('id, property_number, address, ...')
```

**影響**:
- 存在しないカラムでエラーが発生する可能性
- 近隣物件が0件になる

**正しい方法**:
```typescript
// ✅ 正しい: 全てのカラムを取得
.select('*')
```

---

## 📝 実装ファイル

### バックエンド

**ファイル**: `backend/src/services/BuyerService.ts`

**メソッド**:
- `getNearbyProperties(propertyNumber: string)` - メインメソッド
- `searchByLocation(baseProperty, commonFilters)` - 所在地ベース検索
- `searchByDistance(baseProperty, commonFilters)` - 距離ベース検索
- `searchByDistributionArea(baseProperty, commonFilters)` - 配信エリアベース検索
- `calculatePriceRange(price: number)` - 価格帯計算

### フロントエンド

**ファイル**: `frontend/src/pages/BuyerNearbyPropertiesPage.tsx`

**表示内容**:
- 近隣物件一覧テーブル
- 基準物件情報

---

## ✅ 変更が許可される内容

以下の変更のみ許可されます：

1. **表示項目の追加・削除**:
   - テーブルの列を追加・削除
   - 表示フォーマットの変更

2. **UI/UXの改善**:
   - デザインの変更
   - ソート機能の追加
   - フィルタ機能の追加（検索条件は変更しない）

3. **パフォーマンスの最適化**:
   - キャッシュの追加
   - クエリの最適化（結果は変わらない範囲で）

---

## 🔍 変更前の確認事項

もし検索条件の変更が必要な場合は、以下を確認してください：

1. **ユーザーに事前報告**:
   - 変更内容を説明
   - 影響範囲を説明
   - テスト結果を共有

2. **テスト**:
   - 複数の買主で検索結果を確認
   - 検索結果の件数を比較
   - 提案の質が下がっていないか確認

3. **ロールバック計画**:
   - 変更前のコードを保存
   - すぐに戻せるようにする

---

## 📊 検索条件の詳細

### 価格帯計算ロジック

```typescript
private calculatePriceRange(price: number): { minPrice: number; maxPrice: number } {
  if (price < 10000000) {
    // 1000万円未満
    return { minPrice: 0, maxPrice: 9999999 };
  } else if (price < 30000000) {
    // 1000万～2999万円
    return { minPrice: 10000000, maxPrice: 29999999 };
  } else if (price < 50000000) {
    // 3000万～4999万円
    return { minPrice: 30000000, maxPrice: 49999999 };
  } else {
    // 5000万円以上
    return { minPrice: 50000000, maxPrice: 999999999 };
  }
}
```

### ステータス条件

```typescript
query = query.or('atbb_status.ilike.%公開中%,atbb_status.ilike.%公開前%,atbb_status.ilike.%非公開（配信メールのみ）%');
```

### データ取得

```typescript
const { data: baseProperty, error: baseError } = await this.supabase
  .from('property_listings')
  .select('*')  // ← 全てのカラムを取得
  .eq('property_number', propertyNumber)
  .single();
```

---

## まとめ

**絶対に守るべきルール**:

1. **近隣物件の検索条件は絶対に変更しない**
2. **価格帯の計算ロジックは変更しない**
3. **ステータス条件は変更しない**
4. **検索方法（3つ）は削除しない**
5. **`select('*')`を使用する（明示的なカラム指定はしない）**

**このルールを徹底することで、買主への提案の質を維持できます。**

---

**最終更新日**: 2026年2月11日  
**作成理由**: 近隣物件の検索条件を変更して検索結果が0件になった問題を防ぐため  
**関連ファイル**: `backend/src/services/BuyerService.ts`
