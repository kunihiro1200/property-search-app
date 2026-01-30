---
inclusion: manual
---

# 公開物件の定義（絶対に間違えないルール）

## ⚠️ 重要：公開中の物件の定義

公開物件サイトで表示される「公開中」の物件は、以下の**3つの条件のいずれか**を満たす物件です。

---

## ✅ 公開中の物件の条件

`atbb_status`フィールドに以下の**いずれかの文字列が含まれる**物件：

### 1. **「公開中」が含まれる**
- 例: `専任・公開中`
- 例: `一般・公開中`
- 例: `公開中`

### 2. **「公開前」が含まれる**
- 例: `公開前`
- 例: `専任・公開前`

### 3. **「非公開（配信メールのみ）」が含まれる**
- 例: `非公開（配信メールのみ）`

---

## ❌ 公開中ではない物件

以下は**公開中ではない**ため、除外されます：

- `非公開案件` ← **公開中ではない**
- `成約済み` ← **公開中ではない**
- `null` ← **公開中ではない**
- その他の値 ← **公開中ではない**

---

## 📋 SQL/Supabaseクエリの正しい書き方

### ❌ 間違った書き方（絶対にやらない）

```typescript
// ❌ 特定の値だけを取得（他の公開中の物件が除外される）
query = query.eq('atbb_status', '専任・公開中');

// ❌ 「公開中」だけを検索（「公開前」と「非公開（配信メールのみ）」が除外される）
query = query.ilike('atbb_status', '%公開中%');
```

### ✅ 正しい書き方

```typescript
// ✅ 3つの条件をOR条件で結合
query = query.or(
  'atbb_status.ilike.%公開中%,' +
  'atbb_status.ilike.%公開前%,' +
  'atbb_status.ilike.%非公開（配信メールのみ）%'
);
```

または

```typescript
// ✅ 個別にフィルタリング（TypeScriptで判定）
const isPublic = (atbbStatus: string | null): boolean => {
  if (!atbbStatus) return false;
  
  return atbbStatus.includes('公開中') ||
         atbbStatus.includes('公開前') ||
         atbbStatus.includes('非公開（配信メールのみ）');
};
```

---

## 🎯 実装例

### 例1: 公開物件一覧取得

```typescript
async getPublicProperties() {
  let query = this.supabase
    .from('property_listings')
    .select('*');
  
  // ✅ 公開中の物件のみを取得
  query = query.or(
    'atbb_status.ilike.%公開中%,' +
    'atbb_status.ilike.%公開前%,' +
    'atbb_status.ilike.%非公開（配信メールのみ）%'
  );
  
  const { data, error } = await query;
  return data;
}
```

### 例2: storage_location同期対象の判定

```typescript
async syncStorageLocations() {
  // ✅ 公開中の物件のみを対象
  const { data: properties } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, atbb_status')
    .or(
      'atbb_status.ilike.%公開中%,' +
      'atbb_status.ilike.%公開前%,' +
      'atbb_status.ilike.%非公開（配信メールのみ）%'
    )
    .is('storage_location', null); // storage_locationが未設定の物件
  
  // 同期処理...
}
```

---

## 🔍 チェックリスト

公開物件に関するコードを書く前に、以下を確認してください：

- [ ] `atbb_status`に「公開中」が含まれる物件を取得しているか？
- [ ] `atbb_status`に「公開前」が含まれる物件を取得しているか？
- [ ] `atbb_status`に「非公開（配信メールのみ）」が含まれる物件を取得しているか？
- [ ] 上記3つの条件を**OR条件**で結合しているか？
- [ ] `eq('atbb_status', '専任・公開中')`のような特定の値だけを取得していないか？

---

## 📊 バッジ表示ルール（参考）

公開物件サイトでは、`atbb_status`に応じてバッジを表示します：

| atbb_status | バッジ | クリック可能 |
|------------|--------|------------|
| 「公開中」を含む | なし | ✅ はい |
| 「公開前」を含む | 「公開前」 | ✅ はい |
| 「非公開（配信メールのみ）」を含む | 「配信限定」 | ✅ はい |
| 「非公開案件」を含む | 「成約済み」 | ❌ いいえ |
| その他 | 「成約済み」 | ❌ いいえ |

---

## 💡 なぜこのルールが重要か？

### 過去の間違い

1. **`eq('atbb_status', '専任・公開中')`を使用**
   - 結果: `一般・公開中`の物件が除外される
   - 影響: AA13154物件が表示されない

2. **`ilike('atbb_status', '%公開中%')`のみを使用**
   - 結果: 「公開前」と「非公開（配信メールのみ）」の物件が除外される
   - 影響: 配信限定物件が表示されない

3. **`showPublicOnly`フィルターで「公開中」のみを検索**
   - 結果: 「公開前」と「非公開（配信メールのみ）」の物件が除外される
   - 影響: 公開前物件が表示されない

### 正しいアプローチ

**3つの条件を必ず含める**:
1. `atbb_status.ilike.%公開中%`
2. `atbb_status.ilike.%公開前%`
3. `atbb_status.ilike.%非公開（配信メールのみ）%`

---

## 🚨 絶対に守るべきルール

### ルール1: 特定の値で検索しない

```typescript
// ❌ 絶対にやらない
.eq('atbb_status', '専任・公開中')
.eq('atbb_status', '一般・公開中')
```

### ルール2: 3つの条件を必ず含める

```typescript
// ✅ 必ずこの3つを含める
.or(
  'atbb_status.ilike.%公開中%,' +
  'atbb_status.ilike.%公開前%,' +
  'atbb_status.ilike.%非公開（配信メールのみ）%'
)
```

### ルール3: 「公開中」だけで判定しない

```typescript
// ❌ 不完全（「公開前」と「非公開（配信メールのみ）」が除外される）
.ilike('atbb_status', '%公開中%')

// ✅ 完全（3つの条件を含める）
.or(
  'atbb_status.ilike.%公開中%,' +
  'atbb_status.ilike.%公開前%,' +
  'atbb_status.ilike.%非公開（配信メールのみ）%'
)
```

---

## 📝 まとめ

**公開中の物件 = 以下のいずれかを含む物件**

1. ✅ `atbb_status`に「**公開中**」が含まれる
2. ✅ `atbb_status`に「**公開前**」が含まれる
3. ✅ `atbb_status`に「**非公開（配信メールのみ）**」が含まれる

**この3つの条件を必ずOR条件で結合する。絶対に忘れない。**

---

**最終更新日**: 2026年1月29日  
**作成理由**: 公開中の物件の定義を明確化し、同じ間違いを繰り返さないため
