---
inclusion: always
---

# 問合せフォーム復元チェックリスト

## ⚠️ 問合せフォームを復元する際の必須ファイル

問合せフォームが動作するためには、以下の**2つのファイル**を必ず復元してください。

---

## � 最優先：環境変数が`undefined`の場合の対処法

**症状**: `[Inquiry API] Spreadsheet sync error: Error: Missing required parameters: spreadsheetId`

**原因**: 環境変数`GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`が`undefined`

**解決方法**: フォールバック処理を追加

```typescript
// backend/api/index.ts の2箇所を修正

// 1. 買主番号採番部分（行627付近）
const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID || '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';

// 2. スプレッドシート同期部分（行698付近）
const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID || '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
```

**Kiroへの呼びかけ**:
```
問合せフォームが動作しない。環境変数undefinedエラーの対処法を実行して。
```

**動作確認済みコミット**: `a9306ba` - "Fix: Hardcode spreadsheetId as fallback if env var is undefined"

---

## 📋 復元必須ファイル

### 1. backend/api/index.ts
- **役割**: 問合せ送信APIエンドポイント
- **重要な機能**:
  - 買主番号の採番
  - スプレッドシートへの同期
  - データベースへの保存
  - **環境変数のフォールバック処理**（最重要）

### 2. backend/src/services/GoogleSheetsClient.ts
- **役割**: Google Sheets API クライアント
- **重要な機能**:
  - `A2:ZZZ`範囲指定（18,278列対応）
  - `readAll()`メソッド
  - `getLastRow()`メソッド（買主番号採番に必須）

---

## ✅ 正しい復元手順

### ステップ1: 動作確認済みコミットを確認

```bash
# 問合せフォームが動作していたコミット
git log --oneline --all -50 | grep -i "inquiry\|問合せ"
```

**動作確認済みコミット**: `f623fde`

### ステップ2: 両方のファイルを復元

```bash
# 1. backend/api/index.ts を復元
git checkout f623fde -- backend/api/index.ts

# 2. backend/src/services/GoogleSheetsClient.ts を復元
git checkout f623fde -- backend/src/services/GoogleSheetsClient.ts
```

### ステップ3: 復元内容を確認

```bash
# GoogleSheetsClient.ts に A2:ZZZ が含まれているか確認
grep -n "A2:ZZZ" backend/src/services/GoogleSheetsClient.ts

# backend/api/index.ts の文字化けを確認
Get-Content backend/api/index.ts -Head 10
```

**期待される出力**:
```
// 公開物件サイト専用のエントリーポイント
```

### ステップ4: コミットしてプッシュ

```bash
# 両方のファイルをステージング
git add backend/api/index.ts backend/src/services/GoogleSheetsClient.ts

# コミット
git commit -m "Restore working inquiry form code (backend/api/index.ts + GoogleSheetsClient.ts with A2:ZZZ)"

# プッシュ
git push
```

---

## 🚨 よくある間違い

### ❌ 間違い1: backend/api/index.ts だけを復元

```bash
# ❌ これだけでは不十分
git checkout f623fde -- backend/api/index.ts
```

**問題**: `GoogleSheetsClient.ts`が古いバージョンのままだと、`A2:ZZ`（702列）の範囲しか読み取れず、買主番号が正しく採番されません。

### ❌ 間違い2: git show を使用

```bash
# ❌ 絶対に使用しない
git show f623fde:backend/api/index.ts > backend/api/index.ts
```

**問題**: Shift-JISに変換されて文字化けします。

---

## 🔍 復元後の確認項目

### 1. GoogleSheetsClient.ts の確認

```bash
# A2:ZZZ が含まれているか確認
grep -n "A2:ZZZ" backend/src/services/GoogleSheetsClient.ts
```

**期待される出力**:
```
223:      const range = `${this.config.sheetName}!A2:ZZZ`;
249:      const range = `${this.config.sheetName}!A2:ZZZ`;
```

### 2. backend/api/index.ts の文字化け確認

```bash
# ファイルの先頭を確認
Get-Content backend/api/index.ts -Head 10
```

**正常な例**:
```typescript
// 公開物件サイト専用のエントリーポイント
// Last updated: 2026-01-24 - Force rebuild to clear @vercel/node cache
import type { VercelRequest, VercelResponse } from '@vercel/node';
```

**文字化けの例**:
```
// 蜈ｬ髢狗黄莉ｶ繧ｵ繧､繝亥ｰら畑縺ｮ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・```

### 3. Vercel デプロイの確認

```bash
# デプロイが完了するまで待つ（2-3分）
# https://vercel.com/kunihiro1200s-projects/property-site-frontend/deployments
```

---

## 📝 Kiroエージェント向けの指示

### 問合せフォームを復元する際の必須手順

1. **両方のファイルを復元する**
   ```bash
   git checkout f623fde -- backend/api/index.ts
   git checkout f623fde -- backend/src/services/GoogleSheetsClient.ts
   ```

2. **復元内容を確認する**
   ```bash
   grep -n "A2:ZZZ" backend/src/services/GoogleSheetsClient.ts
   Get-Content backend/api/index.ts -Head 10
   ```

3. **両方のファイルをコミットする**
   ```bash
   git add backend/api/index.ts backend/src/services/GoogleSheetsClient.ts
   git commit -m "Restore working inquiry form code (both files)"
   git push
   ```

4. **Vercelのデプロイを待つ**

---

## 🎯 まとめ

- **backend/api/index.ts だけでは不十分**
- **backend/src/services/GoogleSheetsClient.ts も必ず復元する**
- **A2:ZZZ 範囲指定が必須**（買主リストは100列以上）
- **git checkout を使用する**（git show は禁止）
- **両方のファイルを同時にコミットする**

**このチェックリストに従うことで、問合せフォームの復元ミスを防止できます。**
