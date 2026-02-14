# スプレッドシートヘッダー保護ルール（絶対に守るべきルール）

## ⚠️ 最重要：スプレッドシートの1行目は絶対に触らない

**絶対に守るべき原則**:
- **全てのスプレッドシートの1行目（ヘッダー行）は絶対に触ってはいけない**
- **1行目の読み取り、更新、削除、挿入は全て禁止**
- **AppSheetと連携しているため、1行目を変更するとシステム全体が壊れる**

---

## 🚨 対象スプレッドシート

以下のスプレッドシートの1行目は**絶対に触ってはいけません**：

1. **買主リスト**
   - スプレッドシートID: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
   - シート名: `買主リスト`

2. **売主リスト**
   - スプレッドシートID: 環境変数 `GOOGLE_SHEETS_SPREADSHEET_ID`
   - シート名: `売主リスト`

3. **物件リスト**
   - スプレッドシートID: 環境変数 `GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID`
   - シート名: `物件`

4. **業務リスト**
   - スプレッドシートID: 環境変数 `GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID`
   - シート名: `業務リスト`

5. **その他全てのスプレッドシート**
   - 全てのスプレッドシートの1行目はヘッダー行です
   - 絶対に触ってはいけません

---

## 🚨 絶対にやってはいけないこと

### ❌ 禁止事項1: 1行目の読み取り（ヘッダー取得以外）

```typescript
// ❌ 間違い: 1行目を読み取って処理する
const row1 = await sheetsClient.readRange('1:1');
// 1行目のデータを使って何かする
```

**例外**: `getHeaders()`メソッドでヘッダー名を取得するのは許可されます。

```typescript
// ✅ 正しい: ヘッダー名の取得のみ許可
const headers = await sheetsClient.getHeaders();
```

### ❌ 禁止事項2: 1行目の更新

```typescript
// ❌ 間違い: 1行目を更新
await sheetsClient.updateRow(1, rowData);
```

**影響**:
- ヘッダー行が上書きされる
- AppSheetとの連携が壊れる
- システム全体が動作しなくなる

### ❌ 禁止事項3: 1行目の削除

```typescript
// ❌ 間違い: 1行目を削除
await sheetsClient.deleteRow(1);
```

**影響**:
- ヘッダー行が消える
- 2行目が1行目に繰り上がる
- AppSheetとの連携が壊れる
- システム全体が動作しなくなる

### ❌ 禁止事項4: 1行目への挿入

```typescript
// ❌ 間違い: 1行目に行を挿入
await sheets.spreadsheets.batchUpdate({
  requests: [{
    insertDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: 0,  // 0 = 1行目
        endIndex: 1,
      },
    },
  }],
});
```

**影響**:
- ヘッダー行が2行目に移動する
- AppSheetとの連携が壊れる
- システム全体が動作しなくなる

---

## ✅ 許可される操作

### 1. ヘッダー名の取得（読み取り専用）

```typescript
// ✅ 正しい: ヘッダー名を取得
const headers = await sheetsClient.getHeaders();
console.log('Headers:', headers);
```

### 2. 2行目以降のデータ操作

```typescript
// ✅ 正しい: 2行目以降のデータを読み取り
const data = await sheetsClient.readAll(); // A2:ZZZ

// ✅ 正しい: 2行目以降のデータを更新
await sheetsClient.updateRow(2, rowData); // 2行目を更新

// ✅ 正しい: 2行目以降のデータを削除
await sheetsClient.deleteRow(2); // 2行目を削除

// ✅ 正しい: 最終行の次に追加
await sheetsClient.appendRow(rowData); // 最終行の次に追加
```

---

## 📝 実装ルール

### ルール1: readAll()は必ずA2:ZZZから開始

```typescript
// ✅ 正しい: 2行目から読み取り
async readAll(): Promise<SheetRow[]> {
  const range = `'${this.config.sheetName}'!A2:ZZZ`; // A2から開始
  const response = await this.sheets!.spreadsheets.values.get({
    spreadsheetId: this.config.spreadsheetId,
    range,
  });
  // ...
}
```

### ルール2: updateRow()は2以上の行番号のみ許可

```typescript
// ✅ 正しい: 行番号のバリデーション
async updateRow(rowIndex: number, row: SheetRow): Promise<void> {
  if (rowIndex < 2) {
    throw new Error('Cannot update row 1 (header row). Row index must be 2 or greater.');
  }
  // ...
}
```

### ルール3: deleteRow()は2以上の行番号のみ許可

```typescript
// ✅ 正しい: 行番号のバリデーション
async deleteRow(rowIndex: number): Promise<void> {
  if (rowIndex < 2) {
    throw new Error('Cannot delete row 1 (header row). Row index must be 2 or greater.');
  }
  // ...
}
```

### ルール4: appendRow()は最終行の次に追加

```typescript
// ✅ 正しい: 最終行の次に追加
async appendRow(row: SheetRow): Promise<void> {
  const range = `'${this.config.sheetName}'!A:A`;
  await this.sheets!.spreadsheets.values.append({
    spreadsheetId: this.config.spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values],
    },
  });
}
```

---

## 🔍 トラブルシューティング

### 問題: 1行目を誤って削除してしまった

**症状**:
- ヘッダー行が消えた
- 2行目が1行目に繰り上がった
- AppSheetが動作しなくなった

**解決方法**:
1. **すぐにユーザーに報告する**
2. **ユーザーがスプレッドシートの履歴から復元する**
3. **絶対に自動で復元しようとしない**（さらに悪化する可能性がある）

### 問題: 1行目を誤って更新してしまった

**症状**:
- ヘッダー行が上書きされた
- AppSheetが動作しなくなった

**解決方法**:
1. **すぐにユーザーに報告する**
2. **ユーザーがスプレッドシートの履歴から復元する**
3. **絶対に自動で復元しようとしない**（さらに悪化する可能性がある）

---

## 📊 過去の問題例

### 2026年2月14日: 買主リストの1行目を削除してしまった

**原因**:
- `fix-buyer-spreadsheet-header.ts`スクリプトで1行目を削除
- 2行目が1行目に繰り上がった

**影響**:
- ヘッダー行が消えた
- AppSheetとの連携が壊れた
- ユーザーが手動で復元する必要があった

**教訓**:
- **1行目は絶対に触ってはいけない**
- **削除、更新、挿入は全て禁止**
- **問題が発生したら、すぐにユーザーに報告する**

---

## ✅ チェックリスト

スプレッドシート操作を実装する前に、以下を確認：

- [ ] 1行目（ヘッダー行）を読み取っていないか？（getHeaders()以外）
- [ ] 1行目を更新していないか？
- [ ] 1行目を削除していないか？
- [ ] 1行目に行を挿入していないか？
- [ ] readAll()はA2:ZZZから開始しているか？
- [ ] updateRow()は2以上の行番号のみ許可しているか？
- [ ] deleteRow()は2以上の行番号のみ許可しているか？
- [ ] appendRow()は最終行の次に追加しているか？

---

## まとめ

**絶対に守るべきルール**:

1. **全てのスプレッドシートの1行目（ヘッダー行）は絶対に触ってはいけない**
2. **1行目の読み取り、更新、削除、挿入は全て禁止**
3. **AppSheetと連携しているため、1行目を変更するとシステム全体が壊れる**
4. **問題が発生したら、すぐにユーザーに報告する**
5. **絶対に自動で復元しようとしない**

**このルールを徹底することで、スプレッドシートとAppSheetの連携を保護できます。**

---

**最終更新日**: 2026年2月14日  
**作成理由**: 買主リストの1行目を削除してしまった問題を防ぐため  
**関連ファイル**: 
- `backend/src/services/GoogleSheetsClient.ts`
- `backend/fix-buyer-spreadsheet-header.ts`（削除推奨）
- `backend/restore-buyer-spreadsheet.ts`（削除推奨）
- `backend/restore-header-row.ts`（削除推奨）
