---
inclusion: auto
---

# プロジェクト・リポジトリ・Vercelマッピング（完全版）

## ⚠️ 最重要：全てのプロジェクト構成を記録

このドキュメントは、全てのプロジェクト、リポジトリ、Vercelプロジェクトのマッピングを記録します。
**新しいプロジェクトを作成したら、必ずこのドキュメントを更新してコミットしてください。**

---

## 📋 プロジェクト一覧

### 1. 物件公開サイト（本番稼働中）

**用途**: 一般公開用の物件検索サイト

**GitHubリポジトリ**:
- URL: `https://github.com/kunihiro1200/property-search-app`
- ブランチ: `main`
- ローカルパス: `C:\Users\kunih\sateituikyaku`

**ディレクトリ構成**:
```
property-search-app/
├── frontend/              # 物件公開サイト（フロントエンド）
├── backend/
│   ├── api/              # 物件公開サイト専用API（Vercelにデプロイ）
│   ├── src/              # 共通バックエンド（ローカル環境専用）
│   └── vercel.json       # 物件公開サイトのVercel設定
├── .kiro/
└── README.md
```

**Vercelプロジェクト**:
1. **フロントエンド**:
   - プロジェクト名: `property-site-frontend-kappa`
   - URL: `https://property-site-frontend-kappa.vercel.app`
   - デプロイ元: `frontend/`ディレクトリ

2. **バックエンド**:
   - プロジェクト名: `baikyaku-property-site3`
   - URL: `https://baikyaku-property-site3.vercel.app`
   - デプロイ元: `backend/api/`ディレクトリ
   - Vercel設定: `backend/vercel.json`

**重要な注意事項**:
- ✅ このリポジトリには物件公開サイトのコードのみをプッシュ
- ❌ 業務管理システムのコードは絶対にプッシュしない
- ❌ `admin-management-backend/`ディレクトリを作成しない

---

### 2. 業務管理システム（バックエンド）

**用途**: 売主・買主・物件・業務リストの管理システム（バックエンド）

**GitHubリポジトリ**:
- URL: `https://github.com/kunihiro1200/admin-management-backend`
- ブランチ: `main`
- ローカルパス: `C:\Users\kunih\sateituikyaku\admin-management-backend`

**ディレクトリ構成**:
```
admin-management-backend/
├── src/                  # 業務管理システムのバックエンド
│   ├── routes/          # APIルート
│   ├── services/        # ビジネスロジック
│   ├── types/           # 型定義
│   └── index.ts         # メインエントリーポイント
├── api/
│   └── index.ts         # Vercelエントリーポイント
├── vercel.json          # 業務管理システムのVercel設定
├── package.json
├── tsconfig.json
└── .gitignore
```

**Vercelプロジェクト**:
- プロジェクト名: `admin-management-backend`
- URL: `https://admin-management-backend.vercel.app`
- デプロイ元: `api/index.ts`
- Vercel設定: `vercel.json`

**重要な注意事項**:
- ✅ このリポジトリは`property-search-app`とは完全に独立
- ✅ `backend/src/`からコードをコピーして使用
- ❌ `property-search-app`リポジトリにプッシュしない

---

### 3. 業務管理システム（フロントエンド）

**用途**: 売主・買主・物件・業務リストの管理システム（フロントエンド）

**GitHubリポジトリ**:
- URL: `https://github.com/kunihiro1200/new-admin-management-system`
- ブランチ: `main`
- ローカルパス: （確認が必要）

**Vercelプロジェクト**:
- プロジェクト名: `new-admin-management-system`
- URL: `https://new-admin-management-system.vercel.app`

**重要な注意事項**:
- ✅ このリポジトリは業務管理システムのフロントエンド専用
- ✅ バックエンドAPIは`https://admin-management-backend.vercel.app`を使用

---

## 🚨 コミット前の必須チェックリスト

### 物件公開サイト（property-search-app）で作業する場合

1. **現在のディレクトリを確認**:
   ```bash
   pwd
   # 出力: C:\Users\kunih\sateituikyaku
   ```

2. **リポジトリを確認**:
   ```bash
   git remote -v
   # 出力: origin  https://github.com/kunihiro1200/property-search-app.git
   ```

3. **変更内容を確認**:
   ```bash
   git status
   # 確認: admin-management-backend/ が含まれていないか？
   ```

4. **変更内容が正しいか確認**:
   - [ ] `frontend/`または`backend/api/`のファイルのみを変更しているか？
   - [ ] `admin-management-backend/`ディレクトリが含まれていないか？
   - [ ] `backend/vercel.json`を変更していないか？

### 業務管理システム（admin-management-backend）で作業する場合

1. **現在のディレクトリを確認**:
   ```bash
   pwd
   # 出力: C:\Users\kunih\sateituikyaku\admin-management-backend
   ```

2. **リポジトリを確認**:
   ```bash
   git remote -v
   # 出力: origin  https://github.com/kunihiro1200/admin-management-backend.git
   ```

3. **変更内容を確認**:
   ```bash
   git status
   # 確認: src/, api/, vercel.json, package.json などが含まれているか？
   ```

4. **変更内容が正しいか確認**:
   - [ ] `src/`、`api/`、`vercel.json`、`package.json`のファイルのみを変更しているか？
   - [ ] 物件公開サイトのファイルが含まれていないか？

---

## 📝 新しいプロジェクトを作成する場合の手順

### ステップ1: GitHubリポジトリを作成
1. https://github.com/new にアクセス
2. Repository nameを入力
3. 「Create repository」をクリック

### ステップ2: ローカルディレクトリを作成
```bash
# property-search-appの外に出る（必要な場合）
cd C:\Users\kunih\sateituikyaku

# 新しいディレクトリを作成
mkdir new-project-name
cd new-project-name

# 新しいリポジトリを初期化
git init
git remote add origin https://github.com/kunihiro1200/new-project-name.git
```

### ステップ3: コードを作成
```bash
# 必要なファイルを作成
# - package.json
# - tsconfig.json
# - src/
# - api/
# - vercel.json
```

### ステップ4: コミット＆プッシュ
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### ステップ5: Vercelにデプロイ
1. Vercelダッシュボードで「New Project」をクリック
2. 新しいリポジトリをインポート
3. 環境変数を設定
4. デプロイ

### ステップ6: このドキュメントを更新
1. `.kiro/steering/project-repository-mapping.md`を開く
2. 新しいプロジェクトの情報を追加
3. コミット＆プッシュ

---

## 🔍 トラブルシューティング

### 問題: 間違ったリポジトリにプッシュしてしまった

**症状**:
- 物件公開サイトが404エラーになる
- Vercelのデプロイログに予期しないファイルが表示される

**解決方法**:
1. **すぐに元に戻す**:
   ```bash
   git log --oneline -5  # 正常なコミットIDを確認
   git reset --hard <正常なコミットID>
   git push origin main --force
   ```

2. **Vercelで再デプロイを確認**:
   - Vercelダッシュボードで最新のデプロイを確認
   - 物件公開サイトが正常に動作するか確認

3. **間違ったディレクトリを削除**:
   ```bash
   rm -rf admin-management-backend
   git add .
   git commit -m "Remove admin-management-backend directory"
   git push origin main
   ```

---

## 📊 環境変数の管理

### 物件公開サイト（baikyaku-property-site3）
- Vercelダッシュボードで設定
- 環境変数の数: 約20個
- 主要な環境変数:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - など

### 業務管理システム（admin-management-backend）
- Vercelダッシュボードで設定
- 環境変数の数: 16個
- 主要な環境変数:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`
  - など

---

## まとめ

**絶対に守るべきルール**:

1. **新しいプロジェクトを作成したら、必ずこのドキュメントを更新する**
2. **コミット前に必ず`git remote -v`でリポジトリを確認する**
3. **物件公開サイトのリポジトリには業務管理システムのコードをプッシュしない**
4. **業務管理システムのリポジトリには物件公開サイトのコードをプッシュしない**
5. **間違ったリポジトリにプッシュした場合は、すぐに`git reset --hard`と`git push --force`で元に戻す**

**このルールを徹底することで、プロジェクト間の混乱を防ぎ、安全にデプロイできます。**

---

**最終更新日**: 2026年2月17日  
**作成理由**: プロジェクト構成を完全に記録し、二度と間違ったリポジトリにプッシュしないようにするため  
**更新履歴**:
- 2026年2月17日: 初版作成 - 全てのプロジェクト、リポジトリ、Vercelプロジェクトのマッピングを記録
