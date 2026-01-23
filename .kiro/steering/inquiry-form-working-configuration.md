# 問合せフォーム 動作確認済み設定（2026年1月23日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**動作確認日時**: 2026年1月23日
**最新コミット**: `f623fde` - "Fix: Expand Google Sheets range from ZZ to ZZZ to support 買主リスト (100+ columns)"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties
---

## 📋 動作確認済みの機能

✅ **問合せフォーム送信** → 成功
✅ **買主番号の採番** → スプレッドシートの最後の行+1（6829 → 6830 → 6831...）
✅ **スプレッドシートへの同期** → 自動的に追加（同期的に実行）
✅ **JST時刻** → 日本時間で記録（UTC + 9時間）
✅ **データベース保存** → `sheet_sync_status='synced'`

---

## 🔧 重要な修正内容（コミット f623fde）

### 問題
- Google Sheetsの読み取り範囲が`A2:ZZ`（702列）に制限されていた
- 買主リストは100列以上あるため、データを読み取れなかった
- `getLastRow()`が`null`を返し、買主番号が常に1になっていた

### 解決策
- 範囲を`A2:ZZZ`（18,278列）に拡大
- `backend/src/services/GoogleSheetsClient.ts`の`readAll()`と`getLastRow()`を修正

---

## 🔄 復元手順（問題が発生した場合）

```bash
# 動作確認済みコミットに戻す
git checkout f623fde -- backend/src/services/GoogleSheetsClient.ts
git add backend/src/services/GoogleSheetsClient.ts
git commit -m "Restore working inquiry form code (commit f623fde)"
git push
```

---

## 📊 環境変数（Vercel Dashboard）

| 環境変数 | 値 | 必須 |
|---------|---|------|
| `SUPABASE_URL` | SupabaseプロジェクトのURL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabaseサービスキー | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheets認証用JSON（**`\\n`エスケープシーケンス形式**） | ✅ |
| `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` | `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY` | ✅ |
| `GOOGLE_SHEETS_BUYER_SHEET_NAME` | `買主リスト` | ✅ |

### ⚠️ GOOGLE_SERVICE_ACCOUNT_JSON の正しい形式

**重要**: `private_key`フィールドに**`\\n`エスケープシーケンス**が含まれている必要があります。

**正しい形式**: `backend/google-service-account-for-vercel.txt`の内容を使用
**間違った形式**: 実際の改行が入っている（JSONパーサーがエラーになる）

---

## 📝 トラブルシューティング

### 問題1: 買主番号が1になる

**原因**: `getLastRow()`が`null`を返している（Google Sheetsの範囲が狭い）

**解決策**:
```bash
git checkout f623fde -- backend/src/services/GoogleSheetsClient.ts
git add backend/src/services/GoogleSheetsClient.ts
git commit -m "Fix: Restore working GoogleSheetsClient (range A2:ZZZ)"
git push
```

### 問題2: Google Sheets認証エラー

**原因**: `GOOGLE_SERVICE_ACCOUNT_JSON`の形式が間違っている

**解決策**:
1. `backend/google-service-account-for-vercel.txt`の内容をコピー
2. Vercel Dashboardで`GOOGLE_SERVICE_ACCOUNT_JSON`を削除
3. 新しく`GOOGLE_SERVICE_ACCOUNT_JSON`を追加（コピーした内容を貼り付け）
4. 再デプロイ

---

## 🎯 絶対に変更してはいけないこと

- ❌ Google Sheetsの範囲を`A2:ZZ`に戻さない
- ❌ `GOOGLE_SERVICE_ACCOUNT_JSON`に実際の改行を入れない
- ❌ 買主番号の採番ロジックを変更しない

---

**問題が発生したら、このファイルを確認してください！**
