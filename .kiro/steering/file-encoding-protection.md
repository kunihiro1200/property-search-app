---
tags: [general, git, encoding, file-management, troubleshooting, critical]
priority: high
context: all
inclusion: always
last-verified: 2026-01-25
---

# ファイルエンコーディング保護ルール

## ⚠️ 絶対に守るべきルール

このプロジェクトの全てのファイルは**UTF-8エンコーディング**で管理されています。
**Shift-JISへの変換は絶対に禁止**です。

---

## 🚫 禁止事項

### 1. `git show`コマンドでのファイル復元を禁止

**❌ 絶対に使用しないコマンド**:
```bash
git show <commit>:<file> > <file>
```

**理由**: Windows環境では`git show`の出力がShift-JISに変換される可能性があります。

### 2. リダイレクト（`>`）を使用したファイル作成を禁止

**❌ 禁止**:
```bash
git show <commit>:<file> > <file>
git log > log.txt
```

**理由**: PowerShellのデフォルトエンコーディングがShift-JISの場合、リダイレクトで作成されるファイルもShift-JISになります。

---

## ✅ 正しいファイル復元方法

### 方法1: `git checkout`を使用（推奨）

```bash
# 特定のコミットからファイルを復元
git checkout <commit> -- <file>

# 例
git checkout f623fde -- backend/api/index.ts
```

**利点**:
- エンコーディングが保持される
- Gitが自動的に正しい文字コードで復元する
- 安全で確実

### 方法2: `git restore`を使用

```bash
# 特定のコミットからファイルを復元
git restore --source=<commit> <file>

# 例
git restore --source=f623fde backend/api/index.ts
```

### 方法3: ファイル内容を直接読み取る（Kiroツール使用）

```typescript
// readFileツールを使用して内容を取得
// その後、fsWriteツールで書き込む
```

---

## 📋 ファイル復元時のチェックリスト

ファイルを復元する前に、以下を確認してください：

- [ ] `git checkout <commit> -- <file>`を使用しているか？
- [ ] `git show`コマンドを使用していないか？
- [ ] リダイレクト（`>`）を使用していないか？
- [ ] 復元後、ファイルの先頭を確認して文字化けがないか？

---

## 🔍 文字化けの検出方法

### 1. ファイルの先頭を確認

```bash
# ファイルの先頭10行を表示
Get-Content <file> -Head 10
```

**文字化けの例**:
```
// 蜈ｬ髢狗黄莉ｶ繧ｵ繧､繝亥ｰら畑縺ｮ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・```

**正常な例**:
```
// 公開物件サイト専用のエントリーポイント
```

### 2. Gitの差分を確認

```bash
# 文字化けしている場合、Gitは「Binary files differ」と表示する
git diff <file>
```

**文字化けの例**:
```
Binary files a/backend/api/index.ts and b/backend/api/index.ts differ
```

---

## 🛠️ 文字化けが発生した場合の対処法

### ステップ1: 文字化けを検出

```bash
# ファイルの先頭を確認
Get-Content backend/api/index.ts -Head 10
```

### ステップ2: 正しいコミットから復元

```bash
# 直前の動作していたコミットから復元
git checkout <working-commit> -- <file>

# 例
git checkout bd8eac5 -- backend/api/index.ts
```

### ステップ3: 確認

```bash
# ファイルの先頭を再確認
Get-Content backend/api/index.ts -Head 10
```

### ステップ4: コミット

```bash
git add <file>
git commit -m "Fix: Restore correct encoding for <file> (UTF-8)"
git push
```

---

## 📝 PowerShellのエンコーディング設定

### 現在のエンコーディングを確認

```powershell
[Console]::OutputEncoding
$OutputEncoding
```

### UTF-8に設定（推奨）

```powershell
# 現在のセッションのみ
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# PowerShellプロファイルに追加（永続化）
notepad $PROFILE
```

**プロファイルに追加する内容**:
```powershell
# UTF-8エンコーディングを設定
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 🎯 Kiroエージェント向けの指示

### ファイル復元時の必須手順

1. **`git checkout`を使用する**
   ```bash
   git checkout <commit> -- <file>
   ```

2. **`git show`は絶対に使用しない**

3. **復元後、必ずファイルの先頭を確認する**
   ```bash
   Get-Content <file> -Head 10
   ```

4. **文字化けが検出された場合、即座に修正する**

### コード例

**❌ 間違った方法**:
```bash
git show f623fde:backend/api/index.ts > backend/api/index.ts
```

**✅ 正しい方法**:
```bash
git checkout f623fde -- backend/api/index.ts
```

---

## 📚 関連ドキュメント

- [Git公式ドキュメント - git checkout](https://git-scm.com/docs/git-checkout)
- [Git公式ドキュメント - git restore](https://git-scm.com/docs/git-restore)
- [PowerShell エンコーディング設定](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding)

---

## まとめ

- **`git checkout <commit> -- <file>`を使用する**
- **`git show`とリダイレクト（`>`）は使用しない**
- **復元後、必ずファイルの先頭を確認する**
- **文字化けが検出された場合、即座に修正する**

**このルールを徹底することで、文字コード問題を完全に防止できます。**
