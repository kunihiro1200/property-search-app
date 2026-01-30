---
inclusion: manual
---

# 物件コメントデータ自動同期ルール（絶対に間違えないルール）

## ⚠️ 重要：コメントデータは自動同期される

公開物件サイトのコメントデータは、**自動同期サービスによって5分ごとに同期されます**。

**手動同期は不要です。**

---

## 🚨 最重要：データ取得元の定義

### 「こちらの物件について」（property_about）

**取得元**: **物件リストスプレッドシートのBQ列（●内覧前伝達事項）**

| フィールド | データベースカラム | 取得元 | 列位置 | ヘッダー名 |
|-----------|------------------|--------|--------|-----------|
| **こちらの物件について** | `property_about` | **物件リストスプレッドシート** | **BQ列** | **●内覧前伝達事項** |

**⚠️ 絶対に間違えないこと**:
- ❌ 個別物件スプレッドシートのathomeシートから取得 ← **間違い**
- ✅ 物件リストスプレッドシートのBQ列（●内覧前伝達事項）から取得 ← **正しい**

### その他のコメントデータ

| フィールド | データベースカラム | 取得元 | セル位置（物件種別ごと） |
|-----------|------------------|--------|------------------------|
| お気に入り文言 | `favorite_comment` | 個別物件スプレッドシートの`athome`シート | 土地: B53, 戸建て: B142, マンション: B150 |
| アピールポイント | `recommended_comments` | 個別物件スプレッドシートの`athome`シート | 土地: B63:L79, 戸建て: B152:L166, マンション: B149:L163 |
| パノラマURL | `athome_data` | 個別物件スプレッドシートの`athome`シート | 全種別共通: N1 |

---

## 🔄 自動同期の仕組み

### Phase 4.5/4.6: property_listings同期

**同期内容**:
- 物件基本情報（物件番号、住所、価格など）
- **注意**: `property_about`はPhase 4.5/4.6では同期されない（Phase 4.7で同期）

### Phase 4.7: property_details同期

**実行タイミング**: 5分ごと（自動同期サービスの一部として）

**同期対象**:
1. `property_listings`に存在するが`property_details`に**存在しない**物件
2. `property_details`に存在するが`recommended_comments`が**空**の物件

**同期内容**:
- `favorite_comment` - お気に入り文言（個別物件スプレッドシートのathomeシートから）
- `recommended_comments` - アピールポイント（配列）（個別物件スプレッドシートのathomeシートから）
- `athome_data` - パノラマURL（配列）（個別物件スプレッドシートのathomeシートから）
- **`property_about` - こちらの物件について（物件リストスプレッドシートのBQ列から）** ← **2026年1月30日追加**

**🚨 重要**: `property_about`は`AthomeSheetSyncService`ではなく、`PropertyService.getPropertyAbout()`を使用して物件リストスプレッドシートのBQ列から取得します。

---

## 🚨 過去の問題と解決策

### 問題: AA13407のコメントデータが同期されなかった

**症状**: お気に入り文言は表示されるが、アピールポイントが表示されない

**根本原因**:
1. `property_details`レコードが`property_listings`より先に作成された
2. 旧Phase 4.7は「存在しない」レコードのみを同期していた
3. AA13407は`property_details`に既に存在していたため、同期対象外になった
4. しかし、`recommended_comments`は空のままだった

**解決策**（2026年1月30日実装）:
- Phase 4.7を改善して、**コメントデータが空のレコードも更新対象にする**
- `recommended_comments`が空の物件も自動的に同期される

### 修正されたコード

**ファイル**: `backend/src/services/EnhancedAutoSyncService.ts`

**修正内容**:
```typescript
// 修正前: 存在しないレコードのみを同期
const missingPropertyNumbers: string[] = [];
for (const propertyNumber of propertyListingsNumbers) {
  if (!propertyDetailsNumbers.has(propertyNumber)) {
    missingPropertyNumbers.push(propertyNumber);
  }
}

// 修正後: 存在しないレコード + コメントが空のレコードを同期
const missingPropertyNumbers: string[] = [];
for (const propertyNumber of propertyListingsNumbers) {
  // property_detailsに存在しない、またはコメントデータが空の場合は同期対象
  if (!propertyDetailsNumbers.has(propertyNumber) || emptyCommentsPropertyNumbers.has(propertyNumber)) {
    missingPropertyNumbers.push(propertyNumber);
  }
}

// 🚨 重要: property_aboutは物件リストスプレッドシートのBQ列から取得
// AthomeSheetSyncServiceではなく、PropertyService.getPropertyAbout()を使用
const { PropertyService } = await import('./PropertyService');
const propertyService = new PropertyService();
const propertyAbout = await propertyService.getPropertyAbout(propertyNumber);

if (propertyAbout) {
  await this.supabase
    .from('property_details')
    .update({ property_about: propertyAbout })
    .eq('property_number', propertyNumber);
  console.log(`✅ ${propertyNumber}: Synced property_about from BQ column`);
}
```

---

## ✅ 自動同期が正常に動作しているか確認する方法

### 方法1: ログを確認

```bash
# Vercel Dashboardでログを確認
# または
npx ts-node backend/check-auto-sync-logs.ts
```

**正常なログ例**:
```
📝 Phase 4.7: Property Details Sync
📊 Total properties in property_listings: 150
📊 Total properties in property_details: 148
📊 Properties with empty comments: 2
🆕 Properties to sync (missing or empty comments): 4
✅ AA13407: Synced comments from spreadsheet
✅ AA13407: Synced property_about from BQ column
✅ AA13408: Synced comments from spreadsheet
✅ AA13408: Synced property_about from BQ column
✅ Property details sync completed: 4 synced, 0 failed
```

### 方法2: データベースを確認

```bash
# 特定の物件のコメントデータを確認
npx ts-node backend/check-<property-number>-comments.ts
```

---

## 🚫 絶対にやってはいけないこと

### ❌ 間違い1: 手動同期を忘れる

**旧ルール（廃止）**:
```
新規物件追加時は、必ずAthomeSheetSyncServiceでコメントデータを手動同期する
```

**新ルール（現在）**:
```
自動同期サービスが5分ごとにコメントデータを同期するため、手動同期は不要
```

### ❌ 間違い2: Phase 4.7を無効化する

Phase 4.7を無効化すると、コメントデータが同期されなくなります。

### ❌ 間違い3: コメントデータが空のレコードを無視する

修正前のPhase 4.7は、コメントデータが空のレコードを無視していました。
修正後は、コメントデータが空のレコードも同期対象になります。

---

## 📋 チェックリスト

### 新規物件追加時

- [ ] `property_listings`に物件が追加されているか確認
- [ ] 5分後に`property_details`にコメントデータが同期されているか確認
- [ ] 同期されていない場合、ログを確認してエラーがないか確認

### コメントデータが表示されない場合

1. [ ] `property_details`テーブルにレコードが存在するか確認
2. [ ] `recommended_comments`が空でないか確認
3. [ ] 空の場合、次回の自動同期（5分後）で同期されるか確認
4. [ ] 同期されない場合、ログを確認してエラーがないか確認

---

## 🔧 トラブルシューティング

### 問題1: コメントデータが5分経っても同期されない

**確認事項**:
1. 自動同期サービスが正常に動作しているか？
2. 個別物件スプレッドシートに`athome`シートが存在するか？
3. `athome`シートの正しいセル位置にデータが入力されているか？
4. 業務依頼シートに個別物件スプレッドシートのURLが登録されているか？

**解決策**:
```bash
# 手動で同期を実行（緊急時のみ）
npx ts-node backend/sync-<property-number>-comments.ts
```

### 問題2: パノラマURLが同期されない

**原因**: 個別物件スプレッドシートの`athome`シートの`N1`セルにURLが入力されていない

**解決策**: スプレッドシートの`N1`セルにパノラマURLを入力する

### 問題3: 「こちらの物件について」（property_about）が同期されない

**原因**: 物件リストスプレッドシートのBQ列（●内覧前伝達事項）にデータが入力されていない

**⚠️ 注意**: 
- ❌ athomeシートを確認しても意味がない（取得元が違う）
- ✅ 物件リストスプレッドシートのBQ列を確認する

**解決策**: 
1. 物件リストスプレッドシートのBQ列（●内覧前伝達事項）にデータを入力
2. 5分後に自動同期される
3. 緊急時は手動同期スクリプトを実行:
   ```bash
   npx ts-node backend/sync-<property-number>-property-about.ts
   ```

---

## 📊 自動同期のタイミング

| フェーズ | 内容 | タイミング |
|---------|------|-----------|
| Phase 1 | 売主追加同期 | 5分ごと |
| Phase 2 | 売主更新同期 | 5分ごと |
| Phase 3 | 売主削除同期 | 5分ごと |
| Phase 4.5 | 物件リスト更新同期 | 5分ごと |
| Phase 4.6 | 新規物件追加同期 | 5分ごと |
| **Phase 4.7** | **property_details同期（コメントデータ）** | **5分ごと** |

---

## まとめ

**コメントデータの自動同期**:

1. ✅ **自動同期サービスが5分ごとにコメントデータを同期する**
2. ✅ **`property_details`に存在しない物件を同期する**
3. ✅ **`recommended_comments`が空の物件も同期する**（2026年1月30日改善）
4. ✅ **`property_about`も自動同期する**（2026年1月30日追加）
5. ✅ **手動同期は不要**

**🚨 最重要：取得元の違い**:

| フィールド | 取得元 | 取得方法 |
|-----------|--------|---------|
| お気に入り文言 | 個別物件スプレッドシートのathomeシート | `AthomeSheetSyncService` |
| アピールポイント | 個別物件スプレッドシートのathomeシート | `AthomeSheetSyncService` |
| パノラマURL | 個別物件スプレッドシートのathomeシート | `AthomeSheetSyncService` |
| **こちらの物件について** | **物件リストスプレッドシートのBQ列** | **`PropertyService.getPropertyAbout()`** |

**このルールを徹底することで、コメントデータの同期漏れを完全に防止できます。**

---

**最終更新日**: 2026年1月30日  
**作成理由**: AA13407のコメントデータ同期問題を防ぐため  
**更新履歴**: 
- 2026年1月30日: Phase 4.7を改善して、コメントデータが空のレコードも同期対象にする
- 2026年1月30日: Phase 4.7に`property_about`の自動同期を追加（物件リストスプレッドシートのBQ列から取得）
- 2026年1月30日: 取得元の違いを明確化（athomeシート vs 物件リストスプレッドシートBQ列）
