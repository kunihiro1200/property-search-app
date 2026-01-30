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
