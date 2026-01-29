# atbb_statusカラム名定義（絶対に間違えないルール）

## 🚨 最重要：正しいカラム名

物件リストスプレッドシートの`atbb_status`フィールドの**正しいカラム名**は：

### ✅ 唯一の正しいカラム名

**`atbb成約済み/非公開`** ← これが唯一の正しいカラム名

---

## ❌ 間違ったカラム名（存在しない）

以下のカラム名は**存在しません**：

- ❌ `atbb_status` ← 存在しない
- ❌ `ATBB_status` ← 存在しない
- ❌ `ステータス` ← 存在しない
- ❌ `atbb_statue` ← 存在しない（タイポ）

**これらのカラム名を使用してはいけません。**

---

## ✅ 正しいコード

### PropertyListingSyncService.ts

```typescript
// ✅ 正しい（最優先で「atbb成約済み/非公開」を使用）
const atbbStatus = String(
  row['atbb成約済み/非公開'] || 
  row['atbb_status'] || 
  row['ATBB_status'] || 
  row['ステータス'] || 
  ''
);
```

**重要**: 
- **`row['atbb成約済み/非公開']`を最優先**にする
- フォールバックとして他のカラム名を含めるが、実際には存在しない

---

## 🔍 カラム名の確認方法

### 方法1: check-property-list-headers.tsを実行

```bash
npx ts-node backend/check-property-list-headers.ts
```

**出力例**:
```
📋 Headers:
  A列: 物件番号
  B列: 種別
  C列: atbb成約済み/非公開  ← これが正しいカラム名
  ...
```

### 方法2: スプレッドシートを直接確認

1. 物件リストスプレッドシートを開く
2. 1行目（ヘッダー行）を確認
3. `atbb成約済み/非公開`というカラム名を探す

---

## 📊 実例：AA12398の問題

### 問題

AA12398が「成約済み」バッジになっている

### 原因

`PropertyListingSyncService.ts`が間違ったカラム名を使用していた：

```typescript
// ❌ 間違ったコード（修正前）
const atbbStatus = String(
  row['atbb_status'] ||      // ← 存在しないカラム名
  row['ATBB_status'] ||      // ← 存在しないカラム名
  row['ステータス'] ||        // ← 存在しないカラム名
  ''
);
```

**結果**: `atbbStatus`が空文字列になり、「成約済み」バッジが表示される

### 解決策

正しいカラム名を最優先にする：

```typescript
// ✅ 正しいコード（修正後）
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
  row['atbb_status'] ||          // ← フォールバック（実際には存在しない）
  row['ATBB_status'] ||          // ← フォールバック（実際には存在しない）
  row['ステータス'] ||            // ← フォールバック（実際には存在しない）
  ''
);
```

**結果**: `atbbStatus`が`専任・公開前`になり、「公開前」バッジが表示される

---

## 🚨 絶対に守るべきルール

### ルール1: 正しいカラム名を使用する

```typescript
// ✅ 正しい
const atbbStatus = row['atbb成約済み/非公開'];

// ❌ 間違い
const atbbStatus = row['atbb_status'];
const atbbStatus = row['ATBB_status'];
const atbbStatus = row['ステータス'];
```

### ルール2: 最優先で正しいカラム名を使用する

```typescript
// ✅ 正しい（最優先で「atbb成約済み/非公開」を使用）
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 最優先
  row['atbb_status'] ||          // ← フォールバック
  ''
);

// ❌ 間違い（正しいカラム名が最優先ではない）
const atbbStatus = String(
  row['atbb_status'] ||          // ← 存在しないカラム名が最優先
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名が後回し
  ''
);
```

### ルール3: カラム名を推測しない

```typescript
// ❌ 絶対にやらない（推測）
const atbbStatus = row['atbb_status'];  // ← 「たぶんこれだろう」は禁止

// ✅ 正しい（確認してから使用）
// 1. check-property-list-headers.tsを実行
// 2. 正しいカラム名を確認
// 3. 確認したカラム名を使用
const atbbStatus = row['atbb成約済み/非公開'];
```

---

## 📝 チェックリスト

`atbb_status`を取得するコードを書く前に、以下を確認してください：

- [ ] 正しいカラム名`atbb成約済み/非公開`を使用しているか？
- [ ] `atbb成約済み/非公開`を最優先にしているか？
- [ ] `atbb_status`、`ATBB_status`、`ステータス`は存在しないことを理解しているか？
- [ ] カラム名を推測していないか？

---

## 💡 なぜこのルールが重要か？

### 過去の間違い

1. **間違ったカラム名を使用**
   - `row['atbb_status']`を使用
   - 結果: `atbbStatus`が空文字列になる
   - 影響: 全ての物件が「成約済み」バッジになる

2. **カラム名を推測**
   - 「たぶん`atbb_status`だろう」と推測
   - 結果: スプレッドシートを確認せずにコードを書く
   - 影響: 同じ間違いを繰り返す

3. **正しいカラム名を後回しにする**
   - フォールバックとして`atbb成約済み/非公開`を含める
   - 結果: 存在しないカラム名が最優先になる
   - 影響: `atbbStatus`が空文字列になる

### 正しいアプローチ

**必ず確認してから使用する**:
1. `check-property-list-headers.ts`を実行
2. 正しいカラム名を確認
3. 確認したカラム名を最優先で使用

---

## 🎯 実装例

### 例1: PropertyListingSyncService.ts

```typescript
// ✅ 正しい実装
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
  row['atbb_status'] ||          // ← フォールバック（実際には存在しない）
  row['ATBB_status'] ||          // ← フォールバック（実際には存在しない）
  row['ステータス'] ||            // ← フォールバック（実際には存在しない）
  ''
);

console.log(`📝 Processing ${propertyNumber} (atbb_status: ${atbbStatus})...`);
```

### 例2: 診断スクリプト

```typescript
// ✅ 正しい実装
async function checkAtbbStatus(propertyNumber: string) {
  const rows = await sheetsClient.readAll();
  
  for (const row of rows) {
    if (row['物件番号'] === propertyNumber) {
      const atbbStatus = row['atbb成約済み/非公開'];  // ← 正しいカラム名
      console.log(`atbb_status: ${atbbStatus}`);
      return atbbStatus;
    }
  }
}
```

---

## 📚 関連ドキュメント

- `.kiro/steering/public-property-definition.md` - 公開中の物件の定義
- `.kiro/steering/property-listing-sync-rules.md` - 同期ルール
- `backend/check-property-list-headers.ts` - ヘッダー確認スクリプト

---

## まとめ

**正しいカラム名**: **`atbb成約済み/非公開`** ← これが唯一の正しいカラム名

**間違ったカラム名**: `atbb_status`、`ATBB_status`、`ステータス` ← これらは存在しない

**必ず確認してから使用する**: 推測しない、確認する

**このルールを絶対に守ってください。**

---

**最終更新日**: 2026年1月29日  
**作成理由**: `atbb_status`のカラム名を毎回間違えるため、正しいカラム名を明確化
