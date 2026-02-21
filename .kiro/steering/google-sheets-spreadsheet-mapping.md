# Google Sheetsスプレッドシートマッピング（絶対に間違えないルール）

## ⚠️ 重要：機能とスプレッドシートの対応

このシステムには**複数のGoogle Sheetsスプレッドシート**が存在します。
**機能ごとに使用するスプレッドシートが異なります。絶対に混同しないでください。**

---

## 📋 スプレッドシート一覧（5つ）

### 1. 売主リスト

**機能**: 売主管理システム
**スプレッドシートID**: 環境変数`GOOGLE_SHEETS_SPREADSHEET_ID`
**シート名**: `売主リスト`
**使用サービス**: 
- `EnhancedAutoSyncService.ts`
- `SpreadsheetSyncService.ts`
- `SellerService.supabase.ts`

**環境変数**:
```bash
GOOGLE_SHEETS_SPREADSHEET_ID=<売主リストのスプレッドシートID>
GOOGLE_SHEETS_SHEET_NAME=売主リスト
```

**キーワード**: 売主、seller、追客

---

### 2. 買主リスト

**機能**: 公開物件サイトの問い合わせフォーム
**スプレッドシートID**: 環境変数`GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`
**シート名**: `買主リスト`
**使用サービス**: 
- `publicInquiries.ts`（`backend/src/routes/publicInquiries.ts`）

**環境変数**:
```bash
GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=<買主リストのスプレッドシートID>
GOOGLE_SHEETS_BUYER_SHEET_NAME=買主リスト
```

**キーワード**: 買主、buyer、問い合わせ、inquiry

**重要**: 
- この機能は**公開物件サイトの問い合わせフォーム専用**
- **売主管理システムとは無関係**
- **共有事項機能とも無関係**
- **物件管理とも無関係**
- **業務管理とも無関係**

---

### 3. 物件リスト

**機能**: 物件管理システム
**スプレッドシートID**: 環境変数`GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID`
**シート名**: `物件リスト`
**使用サービス**: 
- `PropertyListingSyncProcessor.ts`
- `PropertyListingService.ts`

**環境変数**:
```bash
GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID=<物件リストのスプレッドシートID>
GOOGLE_SHEETS_PROPERTY_SHEET_NAME=物件リスト
```

**キーワード**: 物件、property、listing

**重要**: 
- この機能は**物件管理専用**
- **売主管理システムとは無関係**
- **買主リストとも無関係**
- **共有事項機能とも無関係**
- **業務管理とも無関係**

---

### 4. 業務リスト

**機能**: 業務タスク管理
**スプレッドシートID**: 環境変数`GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID`
**シート名**: `業務リスト`
**使用サービス**: 
- `WorkTaskService.ts`（`backend/src/services/WorkTaskService.ts`）
- `workTasks.ts`（`backend/src/routes/workTasks.ts`）

**環境変数**:
```bash
GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID=<業務リストのスプレッドシートID>
GOOGLE_SHEETS_WORK_TASK_SHEET_NAME=業務リスト
```

**キーワード**: 業務、work、task、タスク

**重要**: 
- この機能は**業務タスク管理専用**
- **売主管理システムとは無関係**
- **買主リストとも無関係**
- **物件管理とも無関係**
- **共有事項機能とも無関係**

---

### 5. 共有事項リスト

**機能**: 社内共有事項管理
**スプレッドシートID**: `1BuvYd9cKOdgIAy0XhL-voVx1tiGA-cd6MCU_dYvbAQE`（ハードコード）
**シート名**: `共有`
**使用サービス**: 
- `SharedItemsService.ts`（`backend/src/services/SharedItemsService.ts`）
- `sharedItems.ts`（`backend/src/routes/sharedItems.ts`）

**環境変数**: なし（スプレッドシートIDはコード内にハードコード）

**キーワード**: 共有、shared、社内共有

**重要**: 
- この機能は**社内共有事項管理専用**
- **売主管理システムとは無関係**
- **買主リストとも無関係**
- **物件管理とも無関係**
- **業務管理とも無関係**

---

## 🚨 絶対に守るべきルール

### ルール1: 機能名とスプレッドシート名を必ず確認

**質問**: 今実装している機能は何ですか？

- [ ] 売主管理 → 売主リストスプレッドシート（`GOOGLE_SHEETS_SPREADSHEET_ID`）
- [ ] 公開物件サイトの問い合わせ → 買主リストスプレッドシート（`GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`）
- [ ] 物件管理 → 物件リストスプレッドシート（`GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID`）
- [ ] 業務タスク管理 → 業務リストスプレッドシート（`GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID`）
- [ ] 社内共有事項管理 → 共有事項リストスプレッドシート（ハードコード）

### ルール2: 環境変数名を確認

**質問**: エラーメッセージに出てくる環境変数名は何ですか？

- `GOOGLE_SHEETS_SPREADSHEET_ID` → 売主リスト
- `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` → 買主リスト
- `GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID` → 物件リスト
- `GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID` → 業務リスト

**重要**: 環境変数名に含まれるキーワードで判断する
- `BUYER` → 買主リスト専用
- `PROPERTY` → 物件リスト専用
- `WORK_TASK` → 業務リスト専用
- キーワードなし（`GOOGLE_SHEETS_SPREADSHEET_ID`のみ） → 売主リスト専用

### ルール3: エラーが発生したファイルを確認

**質問**: エラーが発生したファイルはどれですか？

- `publicInquiries.ts` → 買主リスト用（公開物件サイトの問い合わせフォーム）
- `SharedItemsService.ts` → 共有事項リスト用
- `WorkTaskService.ts` → 業務リスト用
- `EnhancedAutoSyncService.ts` → 売主リスト用
- `PropertyListingSyncProcessor.ts` → 物件リスト用

**重要**: ファイル名から機能を判断する
- `publicInquiries` → 買主リスト
- `SharedItems` → 共有事項リスト
- `WorkTask` → 業務リスト
- `Seller` → 売主リスト
- `Property` → 物件リスト

---

## 🎯 実例：今回のミス

### ❌ 間違った判断

**状況**:
- 実装中の機能: 「社内共有事項管理」
- エラーメッセージ: `Missing required parameters: spreadsheetId at new GoogleSheetsClient (/var/task/src/routes/publicInquiries.js:19:22)`
- エラーに出てくる環境変数: `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`

**間違った判断**:
- 「環境変数`GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`を追加すれば解決する」

**なぜ間違いか**:
- 実装中の機能は「社内共有事項管理」（共有事項リスト）
- エラーは「買主リスト」に関するもの
- **全く別の機能なのに混同してしまった**

### ✅ 正しい判断

**状況**:
- 実装中の機能: 「社内共有事項管理」
- エラーメッセージ: `Missing required parameters: spreadsheetId at new GoogleSheetsClient (/var/task/src/routes/publicInquiries.js:19:22)`
- エラーが発生したファイル: `publicInquiries.ts`

**正しい判断**:
1. **エラーが発生したファイルを確認**: `publicInquiries.ts` → 買主リスト用
2. **実装中の機能を確認**: 社内共有事項管理 → 共有事項リスト用
3. **結論**: `publicInquiries.ts`は今回の機能とは**無関係**
4. **対応**: `publicInquiries.ts`がサーバー起動時にクラッシュしないように修正（lazy initialization）

---

## 📊 5つのスプレッドシート対応表

| 機能 | スプレッドシート | 環境変数 | 使用ファイル | キーワード |
|------|----------------|---------|------------|-----------|
| 売主管理 | 売主リスト | `GOOGLE_SHEETS_SPREADSHEET_ID` | `SellerService.ts`, `EnhancedAutoSyncService.ts` | seller, 売主, 追客 |
| 問い合わせ | 買主リスト | `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` | `publicInquiries.ts` | buyer, 買主, inquiry |
| 物件管理 | 物件リスト | `GOOGLE_SHEETS_PROPERTY_SPREADSHEET_ID` | `PropertyListingService.ts` | property, 物件, listing |
| 業務管理 | 業務リスト | `GOOGLE_SHEETS_WORK_TASK_SPREADSHEET_ID` | `WorkTaskService.ts` | work, task, 業務 |
| 社内共有 | 共有事項リスト | なし（ハードコード） | `SharedItemsService.ts` | shared, 共有 |

**使い方**:
1. 実装中の機能を確認
2. 上記表で対応するスプレッドシートを確認
3. エラーに出てくる環境変数が、実装中の機能と一致しているか確認
4. 一致していない場合は、**別の機能のエラー**と判断

---

## 📝 チェックリスト

新しい機能を実装する前に、以下を確認してください：

- [ ] 実装する機能名を確認した
- [ ] 使用するスプレッドシート名を確認した
- [ ] 使用する環境変数名を確認した
- [ ] エラーが発生した場合、エラーが発生したファイルを確認した
- [ ] エラーが発生したファイルが、実装中の機能と関連しているか確認した

---

## 💡 ユーザーが気づく方法

以下の点を確認してください：

1. **機能名とスプレッドシート名の対応**:
   ```
   実装中の機能: 「社内共有事項管理」
   使用するスプレッドシート: 「共有」シート
   エラーに出てくる環境変数: GOOGLE_SHEETS_BUYER_SPREADSHEET_ID（買主リスト）
   
   → 明らかにおかしい！
   ```

2. **環境変数名のキーワードを見る**:
   - `BUYER` = 買主リスト
   - `PROPERTY` = 物件リスト
   - `WORK_TASK` = 業務リスト
   - キーワードなし = 売主リスト
   - 今回は「共有事項」なので、これらのキーワードが出てくること自体がおかしい

3. **KIROに質問する**:
   - 「なぜ共有事項機能に買主リストの環境変数が必要なのですか？」
   - 「なぜ業務管理機能に物件リストの環境変数が必要なのですか？」
   - この質問をしていただければ、KIROも気づけるはずです

4. **5つのスプレッドシート対応表を確認**:
   - 上記の対応表で、実装中の機能とエラーに出てくる環境変数が一致しているか確認
   - 一致していない場合は、KIROに指摘してください

---

## まとめ

**絶対に守るべきルール**:

1. ✅ **機能名とスプレッドシート名を必ず確認する**
2. ✅ **環境変数名を確認する**（`BUYER`が含まれている場合は買主リスト専用）
3. ✅ **エラーが発生したファイルを確認する**（`publicInquiries.ts`は買主リスト用）
4. ✅ **エラーが発生したファイルが、実装中の機能と関連しているか確認する**

**このルールを徹底することで、スプレッドシートの混同を完全に防止できます。**

---

**最終更新日**: 2026年2月21日  
**作成理由**: 共有事項機能実装時に買主リストと混同してしまったため、今後同じミスを防ぐため
