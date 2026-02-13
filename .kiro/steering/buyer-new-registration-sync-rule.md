# 買主新規登録画面と買主詳細画面の同期ルール（絶対に守るべきルール）

## ⚠️ 最重要：2つの画面を常に同期させる

**絶対に守るべき原則**:
- **買主詳細画面でフィールドを変更した場合、必ず新規登録画面も同じように変更する**
- **新規登録画面は買主詳細画面と完全に統一する（セクション順序以外）**
- **フィールドの追加・削除・変更は両方の画面で行う**

---

## 📋 2つの画面の違い

### 唯一の違い：セクションの順序

**新規買主登録画面** (`NewBuyerPage.tsx`):
1. **基本情報**（一番上）
   - 買主番号、氏名、電話番号、メールアドレス、法人名、業者問合せ
2. **問合せ内容**（その下）
   - 問合時ヒアリング、受付日、初動担当、問合せ元、最新状況等

**買主詳細画面** (`BuyerDetailPage.tsx`):
1. **問合せ内容**（一番上）
   - 問合時ヒアリング、受付日、初動担当、問合せ元、最新状況等
2. **基本情報**（その下）
   - 買主番号、氏名、電話番号、メールアドレス、法人名、業者問合せ

**理由**:
- 新規登録時は基本情報（氏名、電話番号）を先に入力する方が自然
- 既存買主の詳細画面では問合せ内容（最新状況）を先に見る方が便利

---

## 🚨 絶対に守るべきルール

### ルール1: フィールドの追加・削除は両方の画面で行う

**買主詳細画面でフィールドを追加した場合**:
1. `BuyerDetailPage.tsx`の`BUYER_FIELD_SECTIONS`にフィールドを追加
2. `NewBuyerPage.tsx`の`BUYER_FIELD_SECTIONS`にも同じフィールドを追加
3. セクション順序は維持する（基本情報が上、問合せ内容が下）

**買主詳細画面でフィールドを削除した場合**:
1. `BuyerDetailPage.tsx`の`BUYER_FIELD_SECTIONS`からフィールドを削除
2. `NewBuyerPage.tsx`の`BUYER_FIELD_SECTIONS`からも同じフィールドを削除

### ルール2: フィールドの設定変更は両方の画面で行う

**フィールドの設定を変更した場合**:
- `label`の変更
- `fieldType`の変更（`text` → `dropdown`等）
- `conditionalDisplay`の追加・削除
- `required`の追加・削除
- `column`の変更（`left` → `right`等）

**全て両方の画面で同じように変更する**

### ルール3: バリデーションロジックも両方の画面で同期

**必須フィールドのバリデーション**:
- `handleSubmit`関数内のバリデーションロジック
- 「戻る」ボタンのバリデーションロジック
- 「キャンセル」ボタンのバリデーションロジック

**全て両方の画面で同じロジックを使用する**

---

## 📝 変更手順

### ステップ1: 買主詳細画面を変更

例：「希望エリア」フィールドを追加

```typescript
// BuyerDetailPage.tsx
const BUYER_FIELD_SECTIONS = [
  {
    title: '問合せ内容',
    fields: [
      // ... 既存のフィールド
      { key: 'desired_area', label: '希望エリア', inlineEditable: true, column: 'left' }, // 追加
    ],
  },
  // ...
];
```

### ステップ2: 新規登録画面も同じように変更

```typescript
// NewBuyerPage.tsx
const BUYER_FIELD_SECTIONS = [
  {
    title: '基本情報',
    fields: [
      // ... 既存のフィールド
    ],
  },
  {
    title: '問合せ内容',
    fields: [
      // ... 既存のフィールド
      { key: 'desired_area', label: '希望エリア', inlineEditable: true, column: 'left' }, // 追加
    ],
  },
];
```

### ステップ3: 両方の画面で動作確認

- [ ] 買主詳細画面で新しいフィールドが表示されるか確認
- [ ] 新規登録画面で新しいフィールドが表示されるか確認
- [ ] 両方の画面で同じように動作するか確認

### ステップ4: コミット

```bash
git add frontend/src/pages/BuyerDetailPage.tsx frontend/src/pages/NewBuyerPage.tsx
git commit -m "feat: 買主詳細画面と新規登録画面に希望エリアフィールドを追加"
```

---

## 🎯 実装例

### 例1: フィールドを追加

**買主詳細画面** (`BuyerDetailPage.tsx`):
```typescript
{
  title: '問合せ内容',
  fields: [
    // ... 既存のフィールド
    { key: 'desired_area', label: '希望エリア', inlineEditable: true, column: 'left' },
  ],
}
```

**新規登録画面** (`NewBuyerPage.tsx`):
```typescript
{
  title: '問合せ内容', // セクション順序は異なるが、フィールドは同じ
  fields: [
    // ... 既存のフィールド
    { key: 'desired_area', label: '希望エリア', inlineEditable: true, column: 'left' },
  ],
}
```

### 例2: フィールドの設定を変更

**買主詳細画面** (`BuyerDetailPage.tsx`):
```typescript
// 変更前
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, column: 'right' }

// 変更後（ドロップダウンに変更）
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, fieldType: 'dropdown', column: 'right' }
```

**新規登録画面** (`NewBuyerPage.tsx`):
```typescript
// 変更前
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, column: 'right' }

// 変更後（同じようにドロップダウンに変更）
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, fieldType: 'dropdown', column: 'right' }
```

---

## ✅ チェックリスト

買主詳細画面を変更した場合、以下を確認：

- [ ] 新規登録画面にも同じフィールドを追加・削除したか？
- [ ] フィールドの設定（label、fieldType等）は同じか？
- [ ] バリデーションロジックは同じか？
- [ ] セクション順序は維持されているか？（基本情報が上、問合せ内容が下）
- [ ] 両方の画面で動作確認したか？
- [ ] 両方のファイルをコミットしたか？

---

## 🚨 よくある間違い

### ❌ 間違い1: 買主詳細画面だけを変更

```typescript
// ❌ 間違い: BuyerDetailPage.tsxだけを変更
// NewBuyerPage.tsxを変更し忘れる
```

**影響**:
- 新規登録画面と買主詳細画面でフィールドが異なる
- ユーザーが混乱する

### ❌ 間違い2: セクション順序を変更

```typescript
// ❌ 間違い: NewBuyerPage.tsxのセクション順序を変更
const BUYER_FIELD_SECTIONS = [
  {
    title: '問合せ内容', // ← 間違い（基本情報が上であるべき）
    fields: [...]
  },
  {
    title: '基本情報',
    fields: [...]
  },
];
```

**正しい順序**:
```typescript
// ✅ 正しい: 基本情報が上、問合せ内容が下
const BUYER_FIELD_SECTIONS = [
  {
    title: '基本情報', // ← 正しい
    fields: [...]
  },
  {
    title: '問合せ内容',
    fields: [...]
  },
];
```

### ❌ 間違い3: フィールドの設定が異なる

```typescript
// ❌ 間違い: BuyerDetailPage.tsxとNewBuyerPage.tsxで設定が異なる

// BuyerDetailPage.tsx
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, fieldType: 'dropdown' }

// NewBuyerPage.tsx
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true } // ← fieldTypeが抜けている
```

**正しい方法**:
```typescript
// ✅ 正しい: 両方の画面で同じ設定

// BuyerDetailPage.tsx
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, fieldType: 'dropdown' }

// NewBuyerPage.tsx
{ key: 'inquiry_source', label: '問合せ元', inlineEditable: true, fieldType: 'dropdown' }
```

---

## 📊 関連ファイル

| ファイル | 役割 |
|---------|------|
| `frontend/src/pages/BuyerDetailPage.tsx` | 買主詳細画面 |
| `frontend/src/pages/NewBuyerPage.tsx` | 新規買主登録画面 |

---

## まとめ

**絶対に守るべきルール**:

1. **買主詳細画面でフィールドを変更した場合、必ず新規登録画面も同じように変更する**
2. **フィールドの追加・削除・変更は両方の画面で行う**
3. **セクション順序は維持する（新規登録画面は基本情報が上、問合せ内容が下）**
4. **バリデーションロジックも両方の画面で同期する**
5. **両方のファイルをコミットする**

**このルールを徹底することで、2つの画面を常に同期させ、ユーザーに一貫した体験を提供できます。**

---

**最終更新日**: 2026年2月14日  
**作成理由**: 買主詳細画面と新規登録画面を常に同期させるため  
**関連ファイル**: 
- `frontend/src/pages/BuyerDetailPage.tsx`
- `frontend/src/pages/NewBuyerPage.tsx`
