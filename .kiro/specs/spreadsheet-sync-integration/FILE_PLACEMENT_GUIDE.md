# ファイル配置ガイド

## 📁 プロジェクト構造

このガイドでは、`google-service-account.json` ファイルをどこに配置すればよいかを視覚的に説明します。

## 🎯 正しい配置場所

```
プロジェクトルート/
│
├── .gitignore                          ← google-service-account.json が除外されていることを確認
├── README.md
├── start-dev.bat
│
├── backend/                            ← このフォルダ内に配置
│   ├── google-service-account.json    ← ★ ここに配置 ★
│   ├── .env                            ← 環境変数の設定ファイル
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── index.ts
│   │   ├── services/
│   │   │   ├── GoogleSheetsClient.ts
│   │   │   └── SpreadsheetSyncService.ts
│   │   └── ...
│   │
│   ├── migrations/
│   │   └── 026_add_sync_logs.sql      ← マイグレーションSQL
│   │
│   └── test-spreadsheet-sync-verification.ts  ← 動作確認スクリプト
│
└── frontend/
    └── ...
```

## ✅ 配置手順

### ステップ1: ファイルをダウンロード

Google Cloud Consoleから `your-project-xxxxx.json` という名前でダウンロードされます。

### ステップ2: ファイル名を変更

```
元の名前: your-project-xxxxx.json
新しい名前: google-service-account.json
```

### ステップ3: ファイルを移動

ダウンロードフォルダから `backend/` フォルダに移動します。

**Windowsの場合**:
```
ダウンロード/google-service-account.json
↓ 移動
プロジェクトルート/backend/google-service-account.json
```

**macOS/Linuxの場合**:
```bash
mv ~/Downloads/google-service-account.json /path/to/project/backend/
```

### ステップ4: 配置を確認

コマンドプロンプトまたはターミナルで確認:

```bash
# Windowsの場合
dir backend\google-service-account.json

# macOS/Linuxの場合
ls backend/google-service-account.json
```

**期待される結果**:
```
ファイルが存在する場合: ファイル情報が表示される
ファイルが存在しない場合: エラーメッセージが表示される
```

## 🔍 環境変数の設定

`backend/.env` ファイルに以下の設定があることを確認:

```bash
# Google Sheets設定
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

**重要**: `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` は `./google-service-account.json` と設定します。
- `./` は「現在のディレクトリ（backend/）」を意味します
- 絶対パスではなく、相対パスを使用します

## ❌ よくある間違い

### 間違い1: プロジェクトルートに配置

```
❌ 間違い:
プロジェクトルート/
├── google-service-account.json  ← ここではない
└── backend/
    └── ...

✅ 正しい:
プロジェクトルート/
└── backend/
    ├── google-service-account.json  ← ここ
    └── ...
```

### 間違い2: src/ フォルダ内に配置

```
❌ 間違い:
backend/
└── src/
    ├── google-service-account.json  ← ここではない
    └── ...

✅ 正しい:
backend/
├── google-service-account.json  ← ここ
└── src/
    └── ...
```

### 間違い3: ファイル名が違う

```
❌ 間違い:
- your-project-xxxxx.json
- service-account.json
- google-account.json

✅ 正しい:
- google-service-account.json
```

## 🔒 セキュリティ確認

### .gitignore の確認

プロジェクトルートの `.gitignore` ファイルに以下が含まれていることを確認:

```gitignore
# Google Service Account
google-service-account.json
**/google-service-account.json
```

### 確認方法

```bash
# .gitignore の内容を確認
cat .gitignore | grep google-service-account

# または
type .gitignore | findstr google-service-account  # Windows
```

**期待される結果**:
```
google-service-account.json
```

### Gitステータスの確認

```bash
git status
```

**期待される結果**:
- `google-service-account.json` が表示されない（無視されている）

**もし表示される場合**:
```bash
# ファイルをGit管理から除外
git rm --cached backend/google-service-account.json
git commit -m "Remove service account file from git"
```

## ✅ 動作確認

ファイルが正しく配置されたら、以下のコマンドで確認:

```bash
cd backend
npx ts-node test-spreadsheet-sync-verification.ts
```

**期待される結果**:
```
✓ Test 1: 環境変数の確認 - 成功
✓ Test 2: Google Sheets API接続 - 成功
```

**エラーが出る場合**:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照

## 📚 関連ドキュメント

- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - クイックスタートガイド
- [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md) - サービスアカウント設定の詳細
- [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) - 現在のステータス

## 🆘 困ったときは

### Q: ファイルが見つからないエラーが出る

**A**: 以下を確認してください:
1. ファイルが `backend/google-service-account.json` に存在するか
2. ファイル名が正確に一致しているか（大文字小文字も含む）
3. `.env` の `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` が `./google-service-account.json` になっているか

### Q: 権限エラーが出る

**A**: スプレッドシートに権限を付与してください:
1. JSONファイルから `client_email` をコピー
2. スプレッドシートの「共有」から、そのメールアドレスに「編集者」権限を付与

### Q: JSONファイルをGitにコミットしてしまった

**A**: 以下のコマンドで削除してください:
```bash
git rm --cached backend/google-service-account.json
git commit -m "Remove service account file from git"
git push
```

その後、Google Cloud Consoleで古いキーを削除し、新しいキーを作成してください。
