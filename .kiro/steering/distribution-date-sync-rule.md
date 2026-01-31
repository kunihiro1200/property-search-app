# 配信日（distribution_date）同期ルール（絶対に守るべきルール）

## ⚠️ 最重要：配信日は公開物件サイトのソート順を決定する

配信日（`distribution_date`）は公開物件サイトの表示順序を決定する**最重要フィールド**です。
**このフィールドが正しく同期されないと、表示順序がおかしくなります。**

---

## 📋 配信日の定義

### スプレッドシート
- **カラム名**: `配信日【公開）`
- **形式**: 日付（YYYY/MM/DD または Excelシリアル値）

### データベース
- **カラム名**: `distribution_date`
- **形式**: DATE（YYYY-MM-DD）

### マッピング
- **ファイル**: `backend/src/config/property-listing-column-mapping.json`
- **マッピング**: `"配信日【公開）": "distribution_date"`
- **型変換**: `"distribution_date": "date"`

---

## 🚨 過去の問題

### 問題1: 配信日が同期されていなかった（2026年1月31日）

**症状**: 
- AA18（配信日: 2025-02-12）が公開物件サイトの上位に表示された
- 2026年の配信日を持つ物件が多数あるはずなのに、5番以内に入っていた

**根本原因**:
1. `sync-property-listings-via-rest.ts`の更新フィールドに`distribution_date`が含まれていなかった
2. `PropertyListingColumnMapper.ts`の`parseDate`メソッドがExcelシリアル値を処理していなかった

**修正内容**:
1. `sync-property-listings-via-rest.ts`に`distribution_date`を追加
2. `PropertyListingColumnMapper.ts`にExcelシリアル値の変換処理を追加
3. 606件の配信日データを一括同期

---

## ✅ 正しい同期処理

### 1. PropertyListingColumnMapper.ts

**Excelシリアル値の変換が必須**:

```typescript
private parseDate(value: any): string | null {
  if (!value) return null;
  
  // Excelシリアル値（数値）の場合
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const str = String(value).trim();
  if (!str) return null;

  // YYYY/MM/DD or YYYY-MM-DD
  const match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}
```

### 2. sync-property-listings-via-rest.ts

**更新フィールドに`distribution_date`を必ず含める**:

```typescript
const { error } = await supabase
  .from('property_listings')
  .update({
    atbb_status: property.atbb_status,
    storage_location: property.storage_location,
    // ... 他のフィールド
    distribution_date: property.distribution_date, // ← 必須！
    updated_at: new Date().toISOString()
  })
  .eq('property_number', property.property_number);
```

### 3. property-listing-column-mapping.json

**マッピングと型変換が正しく定義されていることを確認**:

```json
{
  "spreadsheetToDatabase": {
    "配信日【公開）": "distribution_date"
  },
  "typeConversions": {
    "distribution_date": "date"
  }
}
```

---

## 📊 公開物件サイトのソートロジック

### ソート順序

1. **配信日（降順）**: 最新の配信日が上位
2. **作成日（降順）**: 配信日が同じ場合は作成日で並べ替え
3. **NULLは最後**: 配信日がNULLの物件は最後に表示

### 実装

```typescript
query = query
  .order('distribution_date', { ascending: false, nullsFirst: false })
  .order('created_at', { ascending: false })
```

---

## 🛡️ 今後の予防策

### チェックリスト

物件リスト同期に関する変更を行う前に、以下を確認：

- [ ] `distribution_date`が更新フィールドに含まれているか？
- [ ] `PropertyListingColumnMapper.ts`の`parseDate`がExcelシリアル値を処理しているか？
- [ ] `property-listing-column-mapping.json`にマッピングが定義されているか？
- [ ] 同期後、配信日が正しくデータベースに保存されているか確認したか？

### 確認スクリプト

配信日の状況を確認するスクリプト:

```bash
npx ts-node backend/check-distribution-date-status.ts
```

**期待される結果**:
- 配信日がある物件: 600件以上
- 2026年の配信日: 20件以上
- 配信日がNULL: 900件以下

---

## 📝 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/config/property-listing-column-mapping.json` | カラムマッピング定義 |
| `backend/src/services/PropertyListingColumnMapper.ts` | マッピング処理（日付変換含む） |
| `backend/sync-property-listings-via-rest.ts` | REST API同期スクリプト |
| `backend/src/services/PropertyListingSyncService.ts` | 同期サービス |
| `backend/api/src/services/PropertyListingService.ts` | 公開物件サイトAPI |
| `frontend/src/backend/services/PropertyListingService.ts` | フロントエンドサービス |

---

## まとめ

**絶対に守るべきルール**:

1. **`distribution_date`は公開物件サイトのソート順を決定する最重要フィールド**
2. **同期処理では必ず`distribution_date`を更新フィールドに含める**
3. **Excelシリアル値の変換処理を忘れない**
4. **同期後は必ず配信日の状況を確認する**

**このルールを徹底することで、配信日の同期問題を完全に防止できます。**

---

**最終更新日**: 2026年1月31日  
**作成理由**: 配信日が同期されず、公開物件サイトの表示順序がおかしくなった問題を防ぐため
