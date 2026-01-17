# 物件リスト更新同期診断 - クイックスタートガイド

## 🎯 このガイドの目的

既存物件データの更新がスプレッドシートからデータベースに同期されない問題を診断し、解決するための手順を提供します。

## ⚡ クイック診断（5分）

### Step 1: 全体診断を実行

```bash
npx ts-node backend/diagnose-property-listing-update-sync.ts
```

この診断で以下を確認できます:
- ✅ 自動同期が動作しているか
- ✅ 同期ログが記録されているか
- ✅ スプレッドシートとデータベースの差分

### Step 2: 診断結果を確認

診断結果は以下のいずれかになります:

#### ケース A: 自動同期が実行されていない

```
❌ 自動同期が実行されていません

推奨される対応:
1. バックエンドサーバーを再起動してください
   cd backend && npm run dev

2. 起動ログで以下を確認してください:
   ✅ EnhancedAutoSyncService initialized
   📊 Enhanced periodic auto-sync enabled
```

**解決方法**: バックエンドサーバーを再起動

```bash
cd backend
npm run dev
```

起動後、5秒で初回同期が実行され、その後5分ごとに自動同期されます。

---

#### ケース B: 自動同期は動作しているが、データに差分がある

```
✅ 自動同期は正常に動作しています
⚠️  3件のデータ不一致があります
   次回の自動同期で更新される予定です
```

**解決方法**: 次回の自動同期を待つ（5分以内）

または、手動で即座に同期:

```bash
npx ts-node backend/sync-property-listings-updates.ts
```

---

#### ケース C: すべて正常

```
✅ 自動同期は正常に動作しています
✅ 最新10件は全て一致しています
```

**結果**: 問題ありません。システムは正常に動作しています。

---

## 🔍 特定物件の詳細診断

特定の物件について詳しく調べたい場合:

```bash
npx ts-node backend/diagnose-specific-property-sync.ts <物件番号>
```

**例**:

```bash
# AA4885の詳細診断
npx ts-node backend/diagnose-specific-property-sync.ts AA4885

# AA13129の詳細診断
npx ts-node backend/diagnose-specific-property-sync.ts AA13129
```

### 診断結果の見方

#### 差分がない場合

```
✅ 差分なし - データは完全に一致しています

💡 この物件のデータは正常に同期されています。
```

→ この物件は問題ありません。

---

#### 差分がある場合

```
❌ 3件の差分が見つかりました:

   1. ATBB状況:
      スプレッドシート: "公開中"
      データベース: "成約済み"

   2. 売買価格:
      スプレッドシート: "3500"
      データベース: "3000"

   3. 状況:
      スプレッドシート: "専任媒介"
      データベース: "一般媒介"
```

→ この物件は同期が必要です。

**推奨される対応**:
1. 自動同期を待つ（5分以内）
2. または手動で即座に同期する

---

## 🛠️ よくある問題と解決策

### 問題1: 「sync_logsテーブルにアクセスできません」

**原因**: Migration 039が実行されていない

**解決方法**:

```bash
npx ts-node backend/migrations/run-039-migration.ts
```

その後、バックエンドサーバーを再起動:

```bash
cd backend
npm run dev
```

---

### 問題2: 「スプレッドシートに接続できません」

**原因**: Google認証情報が正しくない

**解決方法**:

1. `google-service-account.json` が存在するか確認
2. 環境変数を確認:

```bash
# .env ファイルを確認
cat backend/.env | grep GOOGLE_SHEETS
```

必要な環境変数:
- `GOOGLE_SHEETS_PROPERTY_LISTING_SPREADSHEET_ID`
- `GOOGLE_SHEETS_PROPERTY_LISTING_SHEET_NAME`

---

### 問題3: 「データベースに接続できません」

**原因**: Supabase接続情報が正しくない

**解決方法**:

環境変数を確認:

```bash
# .env ファイルを確認
cat backend/.env | grep SUPABASE
```

必要な環境変数:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 問題4: 自動同期が5分ごとに実行されない

**原因**: AUTO_SYNC_ENABLEDがfalseになっている

**解決方法**:

1. 環境変数を確認:

```bash
cat backend/.env | grep AUTO_SYNC_ENABLED
```

2. `AUTO_SYNC_ENABLED=true` に設定

3. バックエンドサーバーを再起動:

```bash
cd backend
npm run dev
```

---

## 📊 診断結果の解釈

### 同期ログの状態

| 状態 | 意味 | 対応 |
|------|------|------|
| ログなし | 自動同期が一度も実行されていない | サーバー再起動 |
| 最終実行が10分以上前 | 自動同期が停止している | サーバー再起動 |
| 最終実行が5分以内 | 正常に動作中 | 問題なし |
| エラーログあり | 同期中にエラー発生 | エラー内容を確認 |

### データ差分の状態

| 差分件数 | 意味 | 対応 |
|---------|------|------|
| 0件 | 完全に同期されている | 問題なし |
| 1-5件 | 最近更新された可能性 | 次回同期を待つ |
| 6件以上 | 同期が長期間停止 | 手動同期を実行 |

---

## 🚀 手動同期の実行

自動同期を待たずに、今すぐ同期したい場合:

```bash
npx ts-node backend/sync-property-listings-updates.ts
```

このスクリプトは:
- スプレッドシートから最新データを取得
- データベースと比較
- 差分がある物件のみ更新
- 更新結果をsync_logsに記録

**実行時間**: 約30秒〜1分（物件数による）

---

## 📝 診断後のチェックリスト

診断を実行したら、以下を確認してください:

- [ ] 全体診断を実行した
- [ ] 診断結果を確認した
- [ ] 問題がある場合、解決策を実行した
- [ ] 解決後、再度診断を実行して確認した
- [ ] 自動同期が正常に動作していることを確認した

---

## 🔄 定期的な確認

システムが正常に動作していることを確認するため、定期的に診断を実行することをお勧めします:

**推奨頻度**: 週1回

```bash
# 毎週月曜日の朝に実行
npx ts-node backend/diagnose-property-listing-update-sync.ts
```

---

## 📞 サポート

問題が解決しない場合は、以下の情報を含めて報告してください:

1. 診断結果の全文
2. バックエンドサーバーの起動ログ
3. 環境変数の設定（機密情報は除く）
4. 問題が発生している物件番号

---

## 🔗 関連ドキュメント

- [Requirements](.kiro/specs/property-listing-update-sync-diagnosis/requirements.md) - 詳細な要件定義
- [Tasks](.kiro/specs/property-listing-update-sync-diagnosis/tasks.md) - タスク一覧
- [自動同期の実装](.kiro/specs/property-listing-auto-sync/) - 自動同期の仕様

---

**最終更新**: 2026-01-10  
**バージョン**: 1.0
