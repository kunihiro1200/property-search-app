# Vercelデプロイ時のプロンプトガイド

## 質問と回答

### 1. Set up and deploy "~\sateituikyaku\frontend"? (Y/n)
**回答**: `Y` を入力してEnter

**説明**: このディレクトリをVercelにデプロイするかの確認

---

### 2. Which scope do you want to deploy to?
**回答**: チーム名またはアカウント名を選択（矢印キーで選択してEnter）

**説明**: どのVercelアカウント/チームにデプロイするか

---

### 3. Link to existing project? (y/N)
**回答**: `Y` を入力してEnter

**説明**: 既存のプロジェクト（baikyaku-property-site3）にリンクするか

---

### 4. What's the name of your existing project?
**回答**: `baikyaku-property-site3` を入力してEnter

**説明**: 既存のプロジェクト名を入力

---

### 5. In which directory is your code located?
**回答**: `./` を入力してEnter（デフォルトのまま）

**説明**: コードの場所（frontendディレクトリ内なのでそのまま）

---

## 📝 注意事項

- すでに`.vercel/project.json`が存在するので、ほとんどの質問はスキップされる可能性があります
- `--prod`フラグを使用しているので、本番環境に直接デプロイされます
- デプロイには通常1-3分かかります

## ✅ デプロイ完了後

デプロイが完了すると、以下のようなメッセージが表示されます：

```
✅ Production: https://baikyaku-property-site3.vercel.app [1m 23s]
```

このURLにアクセスして、AA9743が表示されることを確認してください。
