# atbb_status 分類定義

## 概要

このドキュメントは、`atbb_status`（アットホームBB物件ステータス）の分類定義を記録します。

---

## 公開物件の定義

### `showPublicOnly=true`の場合に表示される物件

以下の`atbb_status`を持つ物件が「公開物件」として扱われます：

1. **専任・公開中**
2. **一般・公開中**
3. **専任・公開前** ← **NEW**
4. **一般・公開前** ← **NEW**
5. **非公開（配信メールのみ）**

### `showPublicOnly=false`の場合（デフォルト）

**全ての物件**が表示されます（公開中・公開前・成約済み・非公開すべて）。

---

## atbb_statusの全リスト

以下は、データベースに存在する可能性のある`atbb_status`の値です：

### 公開物件（`showPublicOnly=true`で表示）

- `専任・公開中`
- `一般・公開中`
- `専任・公開前` ← **NEW**
- `一般・公開前` ← **NEW**
- `非公開（配信メールのみ）`

### 非公開物件（`showPublicOnly=false`のみ表示）

- `成約済み`
- `専任・非公開`
- `一般・非公開`
- その他の非公開ステータス

---

## 実装箇所

### 1. PropertyListingService.ts

**ファイル**: `backend/src/services/PropertyListingService.ts`

**メソッド**: `getPublicProperties()`

**実装**:
```typescript
// 公開中のみ表示フィルター（ホワイトリスト方式）
if (showPublicOnly) {
  console.log('[PropertyListingService] Applying showPublicOnly filter (whitelist)');
  // 公開物件のみを表示（ホワイトリスト）
  query = query.in('atbb_status', [
    '専任・公開中',
    '一般・公開中',
    '専任・公開前',  // NEW
    '一般・公開前',  // NEW
    '非公開（配信メールのみ）'
  ]);
}
```

---

## 変更履歴

### 2026年1月25日

- **追加**: `専任・公開前`と`一般・公開前`を公開物件に含める
- **理由**: ユーザーからの要望「公開前も公開中に含まれる」

---

## 注意事項

### 「公開前」の扱い

- **「公開前」は「公開中」に含まれる**
- これは、公開サイトで「公開中のみ表示」フィルターをONにした場合、公開前の物件も表示されることを意味します
- 理由: 公開前の物件も、お客様に見せたい物件として扱われるため

### フィルターの意図

- **`showPublicOnly=false`（デフォルト）**: 全物件を表示（管理者向け）
- **`showPublicOnly=true`**: 公開物件のみ表示（一般ユーザー向け）

---

## 関連ドキュメント

- [公開物件サイト「公開中のみ表示」フィルター](.kiro/steering/show-public-only-default-fix.md)
- [地図表示最適化](.kiro/steering/archive/session-2026-01-25-map-view-optimization-deployment.md)

---

**最終更新日**: 2026年1月25日  
**ステータス**: ✅ 定義完了
