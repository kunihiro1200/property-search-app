---
tags: [general, security, project-management, critical]
priority: critical
context: all
inclusion: always
last-verified: 2026-01-25
---

# プロジェクト隔離ルール（重要）

## ⚠️ 絶対に守るべきルール

### 作業対象Vercelプロジェクト

以下のVercelプロジェクトのみを扱います：

1. **`backend`** - Vercelプロジェクト
2. **`baikyaku-property-site3`** - Vercelプロジェクト
3. **`frontend`** - Vercelプロジェクト
4. **`property-site-frontend`** - Vercelプロジェクト（現在の主要作業対象）

これらのプロジェクトに関連するファイルのみを編集・修正してください。

---

## 🚫 絶対に触ってはいけないプロジェクト

以下のプロジェクトは**本番環境で稼働中**です。
**絶対に編集・修正してはいけません**。

### 禁止プロジェクト一覧

1. **`C:\Users\kunih\chuukaigyosha`** ❌
   - 本番環境で稼働中
   - 絶対に触らない

2. **`C:\Users\kunih\sateituikyaku`** ❌
   - 本番環境で稼働中
   - 絶対に触らない

3. **その他のローカルプロジェクト** ❌
   - 上記4つのVercelプロジェクト以外のローカルプロジェクトは全て触らない

---

## ✅ ファイル編集前の確認事項

ファイルを編集する前に、**必ず以下を確認**してください：

### 確認1: Vercelプロジェクトに関連しているか確認

編集するファイルが以下のVercelプロジェクトに関連しているか確認：

- `backend`
- `baikyaku-property-site3`
- `frontend`
- `property-site-frontend`

### 確認2: 禁止プロジェクトのパスが含まれていないか確認

以下のパスが含まれている場合は、**絶対に編集しない**：

- `chuukaigyosha`
- `sateituikyaku`

### 確認3: ユーザーに確認

もし、編集するファイルがどのプロジェクトに属するか不明確な場合は、**必ずユーザーに確認**してください。

---

## 🔍 ファイル編集時のチェックリスト

ファイルを編集する前に、以下をチェックしてください：

- [ ] ファイルが以下のVercelプロジェクトに関連しているか？
  - `backend`
  - `baikyaku-property-site3`
  - `frontend`
  - `property-site-frontend`
- [ ] ファイルパスに`chuukaigyosha`が含まれていないか？
- [ ] ファイルパスに`sateituikyaku`が含まれていないか？

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

ファイルパスが`property-search-app`に含まれていることを確認。

### ステップ2: 編集

パスが正しい場合のみ、ファイルを編集。

### ステップ3: 不明な場合はユーザーに確認

ファイルパスが不明確な場合は、**必ずユーザーに確認**してください。

---

## まとめ

- **作業対象**: 以下のVercelプロジェクトのみ
  - `backend`
  - `baikyaku-property-site3`
  - `frontend`
  - `property-site-frontend`
- **禁止**: `chuukaigyosha`、`sateituikyaku`、その他全てのローカルプロジェクト
- **確認**: ファイル編集前に必ずプロジェクトを確認
- **不明な場合**: ユーザーに確認

**このルールを絶対に守ってください。**
