# 売主テーブルのカラム定義（絶対に間違えないルール）

## ⚠️ 重要：売主の識別子

売主を識別する際は、以下のカラム名を使用してください。

---

## ✅ 正しいカラム名

### 売主の識別子

| 用途 | データベースカラム名 | スプレッドシートカラム名 | 説明 |
|------|-------------------|---------------------|------|
| **売主番号**（主キー） | `seller_number` | `売主番号` | 売主の一意識別子（例: AA13501） |
| 売主ID（UUID） | `id` | - | データベース内部ID |

**重要**: 
- ✅ **`seller_number`** ← これが正しい売主番号のカラム名
- ❌ `property_number` ← 存在しない（物件番号ではない）
- ❌ `seller_id` ← 存在しない

---

## 🚨 よくある間違い

### ❌ 間違い1: `property_number`を使用

```typescript
// ❌ 間違い（売主テーブルにproperty_numberは存在しない）
const { data } = await supabase
  .from('sellers')
  .select('*')
  .eq('property_number', 'AA13501');
```

### ✅ 正しい方法

```typescript
// ✅ 正しい（seller_numberを使用）
const { data } = await supabase
  .from('sellers')
  .select('*')
  .eq('seller_number', 'AA13501');
```

---

## 📋 主要カラムのマッピング

### 基本情報

| データベースカラム名 | スプレッドシートカラム名 | 列 | 説明 |
|-------------------|---------------------|-----|------|
| `seller_number` | `売主番号` | A列 | 売主の一意識別子 |
| `name` | `名前` | B列 | 売主名 |
| `address` | `住所` | C列 | 売主住所 |
| `phone_number` | `電話番号` | D列 | 電話番号 |
| `email` | `メール` | E列 | メールアドレス |

### 物件情報

| データベースカラム名 | スプレッドシートカラム名 | 列 | 説明 |
|-------------------|---------------------|-----|------|
| **`property_address`** | **`物件所在地`** | **R列** | 物件の住所（ブラウザでは「物件住所」と表示） |
| `property_type` | `種別` | - | 物件種別 |
| `site` | `サイト` | - | 問い合わせサイト |

### 通話・追客情報

| データベースカラム名 | スプレッドシートカラム名 | 列 | 説明 |
|-------------------|---------------------|-----|------|
| **`unreachable_status`** | **`不通`** | - | 不通ステータス（文字列） |
| `is_unreachable` | `不通` | - | 不通フラグ（boolean、後方互換性用） |
| `comments` | `コメント` | - | コメント |

---

## 🎯 実装例

### 例1: 売主番号で検索

```typescript
// ✅ 正しい
const { data: seller } = await supabase
  .from('sellers')
  .select('*')
  .eq('seller_number', 'AA13501')
  .single();

console.log('売主番号:', seller.seller_number);
console.log('物件住所:', seller.property_address);
console.log('不通:', seller.unreachable_status);
```

### 例2: 売主データの更新

```typescript
// ✅ 正しい
await supabase
  .from('sellers')
  .update({
    property_address: '大分市中央町1-1-1',
    unreachable_status: '不通',
    comments: 'テストコメント'
  })
  .eq('seller_number', 'AA13501');
```

---

## 📝 チェックリスト

売主データを扱う前に、以下を確認してください：

- [ ] 売主番号は`seller_number`カラムを使用しているか？
- [ ] `property_number`を使用していないか？
- [ ] 物件住所は`property_address`カラムを使用しているか？
- [ ] 不通ステータスは`unreachable_status`カラムを使用しているか？

---

## 💡 ブラウザ表示名とデータベースカラム名の対応

| ブラウザ表示名 | データベースカラム名 | スプレッドシートカラム名 |
|-------------|-------------------|---------------------|
| 売主番号 | `seller_number` | `売主番号` |
| **物件住所** | **`property_address`** | **`物件所在地`**（R列） |
| 不通 | `unreachable_status` | `不通` |
| コメント | `comments` | `コメント` |

---

## まとめ

**絶対に守るべきルール**:

1. **売主番号は`seller_number`** ← `property_number`ではない
2. **物件住所は`property_address`** ← スプレッドシートのR列「物件所在地」
3. **不通は`unreachable_status`** ← 文字列型
4. **コメントは`comments`**

**このルールを徹底することで、カラム名の間違いを完全に防止できます。**

---

**最終更新日**: 2026年1月30日  
**作成理由**: 売主番号と物件番号の混同を防ぎ、カラム名を明確化するため
