---
tags: [general, security, project-management, critical]
priority: critical
context: all
inclusion: always
last-verified: 2026-01-25
---

# プロジェクト隔離ルール（重要）

## ⚠️ 絶対に守るべきルール

### 🚨 最重要：正しいプロジェクトパス

**唯一の正しい作業対象プロジェクト**:
- ✅ **`c:\Users\kunih\sateituikyaku`** ← **これが唯一の正しいプロジェクト**

**絶対に触ってはいけないプロジェクト**:
- ❌ **`c:\Users\kunih\property-search-app`** ← **間違ったプロジェクト**
- ❌ **`c:\Users\kunih\chuukaigyosha`** ← **本番稼働中のプロジェクト**

### 作業対象Vercelプロジェクト

以下のVercelプロジェクトのみを扱います：

1. **`backend`** - Vercelプロジェクト（`c:\Users\kunih\sateituikyaku\backend`）
2. **`baikyaku-property-site3`** - Vercelプロジェクト
3. **`frontend`** - Vercelプロジェクト（`c:\Users\kunih\sateituikyaku\frontend`）
4. **`property-site-frontend`** - Vercelプロジェクト（現在の主要作業対象）

これらのプロジェクトに関連するファイルのみを編集・修正してください。

---

## 🚫 絶対に触ってはいけないプロジェクト

以下のプロジェクトは**間違ったプロジェクト**または**本番環境で稼働中**です。
**絶対に編集・修正してはいけません**。

### 禁止プロジェクト一覧

1. **`c:\Users\kunih\property-search-app`** ❌
   - 間違ったプロジェクト
   - 絶対に触らない

2. **`c:\Users\kunih\chuukaigyosha`** ❌
   - 本番環境で稼働中
   - 絶対に触らない

3. **その他のローカルプロジェクト** ❌
   - `c:\Users\kunih\sateituikyaku`以外のローカルプロジェクトは全て触らない

---

## 🚨🚨🚨 最重要：公開物件サイトに関わるファイルは絶対に触ってはいけない 🚨🚨🚨

### 公開物件サイト関連の禁止ファイル・ディレクトリ

**社内管理システム（`baikyaku-property-site3`バックエンド）の作業中は、以下のファイル・ディレクトリを絶対に触ってはいけません**：

#### 絶対に触ってはいけないファイル

1. **`vercel.json`**（ルートディレクトリ） ❌
   - 公開物件サイト（`property-site-frontend`）の設定ファイル
   - このファイルを変更すると、公開物件サイトが壊れる
   - **絶対に編集・削除してはいけない**

2. **`backend/api/index.ts`** ❌
   - 公開物件サイトのバックエンドエントリーポイント
   - このファイルを削除すると、公開物件サイトが壊れる
   - **絶対に編集・削除してはいけない**

3. **`backend/api/src/**`** ❌
   - 公開物件サイトのバックエンドサービス
   - **絶対に編集・削除してはいけない**

4. **`frontend/`ディレクトリ全体** ❌
   - 公開物件サイトのフロントエンド
   - **絶対に編集・削除してはいけない**

#### 社内管理システムバックエンドで編集可能なファイル

**社内管理システム（`baikyaku-property-site3`）の作業では、以下のファイルのみ編集可能**：

- ✅ `backend/src/**`（`backend/api/`以外）
- ✅ `backend/package.json`（依存関係の追加のみ）
- ✅ `backend/tsconfig.json`
- ✅ `backend/.env`（環境変数）

#### 絶対に作成・編集してはいけないファイル

- ❌ `backend/vercel.json` ← **公開物件サイトの設定と競合する**
- ❌ `vercel.json`（ルート） ← **公開物件サイトの設定ファイル**

### なぜ触ってはいけないのか

**理由**:
1. 公開物件サイト（`property-site-frontend`）と社内管理システムバックエンド（`baikyaku-property-site3`）は、同じ`backend/`ディレクトリを共有している
2. `vercel.json`（ルート）は公開物件サイト専用の設定ファイル
3. `backend/api/index.ts`は公開物件サイトのバックエンドエントリーポイント
4. これらを変更すると、公開物件サイトが壊れる

### 過去の失敗例

**失敗1**: `backend/api/index.ts`を削除してしまった
- **結果**: 公開物件サイトが404エラーになった
- **原因**: 社内管理システムバックエンドの作業中に、`backend/api/index.ts`が不要だと判断して削除した
- **教訓**: ファイルを削除する前に、必ず`grepSearch`で使用箇所を確認する

**失敗2**: `backend/vercel.json`を作成してしまった
- **結果**: 公開物件サイトのビルドが失敗した
- **原因**: 社内管理システムバックエンドの設定を追加しようとして、`backend/vercel.json`を作成した
- **教訓**: `backend/vercel.json`は作成してはいけない（ルートの`vercel.json`と競合する）

### チェックリスト

ファイルを編集・削除する前に、以下を確認：

- [ ] ファイルパスに`backend/api/`が含まれていないか？
- [ ] ファイル名が`vercel.json`ではないか？
- [ ] ファイルパスに`frontend/`が含まれていないか？
- [ ] `grepSearch`で使用箇所を確認したか？
- [ ] ステアリングドキュメント（`public-property-site-architecture.md`）を確認したか？

**全てのチェックがOKの場合のみ、ファイルを編集・削除してください。**

---

## ✅ ファイル編集前の確認事項

ファイルを編集する前に、**必ず以下を確認**してください：

### 確認1: Vercelプロジェクトに関連しているか確認

編集するファイルが以下のVercelプロジェクトに関連しているか確認：

- `backend`（`c:\Users\kunih\sateituikyaku\backend`）
- `baikyaku-property-site3`
- `frontend`（`c:\Users\kunih\sateituikyaku\frontend`）
- `property-site-frontend`

### 確認2: 禁止プロジェクトのパスが含まれていないか確認

以下のパスが含まれている場合は、**絶対に編集しない**：

- `property-search-app` ← **間違ったプロジェクト**
- `chuukaigyosha` ← **本番稼働中**

### 確認3: 正しいプロジェクトパスか確認

ファイルパスが以下で始まっているか確認：

- ✅ `c:\Users\kunih\sateituikyaku\` ← **正しい**
- ❌ `c:\Users\kunih\property-search-app\` ← **間違い**
- ❌ `c:\Users\kunih\chuukaigyosha\` ← **間違い**

### 確認3: ユーザーに確認

もし、編集するファイルがどのプロジェクトに属するか不明確な場合は、**必ずユーザーに確認**してください。

---

## 🔍 ファイル編集時のチェックリスト

ファイルを編集する前に、以下をチェックしてください：

- [ ] ファイルが以下のVercelプロジェクトに関連しているか？
  - `backend`（`c:\Users\kunih\sateituikyaku\backend`）
  - `baikyaku-property-site3`
  - `frontend`（`c:\Users\kunih\sateituikyaku\frontend`）
  - `property-site-frontend`
- [ ] ファイルパスが`c:\Users\kunih\sateituikyaku\`で始まっているか？
- [ ] ファイルパスに`property-search-app`が含まれていないか？
- [ ] ファイルパスに`chuukaigyosha`が含まれていないか？

**全てのチェックがOKの場合のみ、ファイルを編集してください。**

---

## 🚨 違反した場合の影響

禁止プロジェクトを編集した場合：

- **本番環境に影響が出る**
- **ユーザーのビジネスに大きな損害を与える**
- **大問題になる**

**絶対に違反しないでください。**

---

## 📝 正しい作業フロー

### ステップ1: ファイルパスを確認

```bash
# ファイルを編集する前に、必ずパスを確認
readFile("path/to/file")
```

ファイルパスが`c:\Users\kunih\sateituikyaku\`で始まっていることを確認。

### ステップ2: 編集

パスが正しい場合のみ、ファイルを編集。

### ステップ3: 不明な場合はユーザーに確認

ファイルパスが不明確な場合は、**必ずユーザーに確認**してください。

---

## まとめ

- **作業対象**: 以下のVercelプロジェクトのみ
  - `backend`（`c:\Users\kunih\sateituikyaku\backend`）
  - `baikyaku-property-site3`
  - `frontend`（`c:\Users\kunih\sateituikyaku\frontend`）
  - `property-site-frontend`
- **正しいプロジェクトパス**: `c:\Users\kunih\sateituikyaku\`
- **禁止**: `property-search-app`、`chuukaigyosha`、その他全てのローカルプロジェクト
- **確認**: ファイル編集前に必ずプロジェクトパスを確認
- **不明な場合**: ユーザーに確認

**このルールを絶対に守ってください。**
