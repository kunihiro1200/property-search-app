# 物件コメントデータ自動同期ルール（絶対に守るべきルール）

## ⚠️ 最重要：業務リストのspreadsheet_urlが必須

物件のコメントデータ（お気に入り文言、オススメコメント、内覧前コメント）を同期する際は、**必ず業務リスト（work_tasks）にspreadsheet_urlが入っている物件のみを対象にする**。

---

## 📋 ルールの定義

### 同期対象の条件

**必須条件**:
- `work_tasks`テーブルに`spreadsheet_url`が入っている物件のみ

**理由**:
- `spreadsheet_url`がない物件は、個別物件スプレッドシートが存在しない
- 個別物件スプレッドシートがない場合、Athomeシートも存在しない
- Athomeシートがない場合、コメントデータを取得できない

### 同期対象外の物件

以下の物件は同期対象外：
- `work_tasks`テーブルに存在しない物件
- `work_tasks`テーブルに存在するが、`spreadsheet_url`がNULLの物件

---

## 🔍 実装方法

### 正しい実装

```typescript
// 1. work_tasksからspreadsheet_urlが入っている物件を取得
const { data: workTasks } = await supabase
  .from('work_tasks')
  .select('property_number, spreadsheet_url')
  .not('spreadsheet_url', 'is', null);

// 2. これらの物件のproperty_detailsを取得
const propertyNumbers = workTasks.map(wt => wt.property_number);
const { data: properties } = await supabase
  .from('property_details')
  .select('*')
  .in('property_number', propertyNumbers);

// 3. コメントデータが空の物件をフィルタリング
const emptyCommentProperties = properties.filter(p => 
  !p.favorite_comment && 
  (!p.recommended_comments || p.recommended_comments.length === 0)
);

// 4. これらの物件のみを同期
for (const property of emptyCommentProperties) {
  await syncPropertyComments(property.property_number);
}
```

### 間違った実装

```typescript
// ❌ 間違い：全物件を対象にしている
const { data: properties } = await supabase
  .from('property_details')
  .select('*');

// ❌ 間違い：work_tasksのspreadsheet_urlをチェックしていない
for (const property of properties) {
  await syncPropertyComments(property.property_number);
}
```

---

## 📊 対象物件数の目安

**全物件数**: 約1,000件

**work_tasksにspreadsheet_urlがある物件**: 約150-200件（推定）

**同期対象（コメントデータが空）**: 約50-100件（推定）

**推定時間**: 約3-7分（1物件あたり2秒 × 50-100件）

---

## 🚨 過去の問題

### 問題：全物件を同期しようとした（2026年2月2日）

**症状**:
- 852件の物件を同期しようとした
- 推定時間が28分と長すぎた

**根本原因**:
- `work_tasks`の`spreadsheet_url`をチェックしていなかった
- 全物件を対象にしていた

**修正内容**:
- `work_tasks`から`spreadsheet_url`が入っている物件のみを取得
- これらの物件のみを同期対象にする

---

## 📝 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/sync-all-property-comments.ts` | 全物件コメント同期スクリプト |
| `backend/src/services/AthomeSheetSyncService.ts` | Athomeシート同期サービス |
| `backend/src/services/PropertyDetailsService.ts` | 物件詳細サービス |

---

## ✅ チェックリスト

物件コメントデータを同期する前に、以下を確認：

- [ ] `work_tasks`テーブルから`spreadsheet_url`が入っている物件を取得しているか？
- [ ] 全物件を対象にしていないか？
- [ ] 同期対象物件数が妥当か？（150-200件以下）
- [ ] 推定時間が妥当か？（10分以内）

---

## まとめ

**絶対に守るべきルール**:

1. **物件コメントデータの同期は、`work_tasks`に`spreadsheet_url`が入っている物件のみを対象にする**
2. **全物件を対象にしない**
3. **同期前に対象物件数を確認する**

**このルールを徹底することで、無駄な同期処理を防ぎ、効率的にコメントデータを同期できます。**

---

**最終更新日**: 2026年2月2日  
**作成理由**: 全物件を同期しようとして時間がかかりすぎた問題を防ぐため
